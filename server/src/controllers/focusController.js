const FocusSession = require('../models/FocusSession');
const Task = require('../models/Task');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/focus/start
 * @desc    Start a new focus session
 */
const startSession = asyncHandler(async (req, res) => {
  const { taskId } = req.body;

  // Debug log: Focus session started
  console.log(`[Focus Timer] Focus session started. Task ID: ${taskId || 'none'}, User: ${req.user._id}`);

  // Check for active session
  const activeSession = await FocusSession.findOne({
    userId: req.user._id,
    endTime: null
  });

  if (activeSession) {
    return res.status(400).json({
      success: false,
      message: 'You already have an active focus session',
      data: activeSession
    });
  }

  const session = await FocusSession.create({
    userId: req.user._id,
    taskId: taskId || null,
    startTime: new Date(),
    date: new Date()
  });

  // Debug log: Database save result
  console.log(`[Focus Timer] Database save result (start): ${JSON.stringify(session)}`);

  res.status(201).json({ success: true, data: session });
});

/**
 * @route   POST /api/focus/end
 * @desc    End the current focus session
 */
const endSession = asyncHandler(async (req, res) => {
  // Debug log: Focus session stopped
  console.log(`[Focus Timer] Focus session stopped. User: ${req.user._id}`);

  const session = await FocusSession.findOne({
    userId: req.user._id,
    endTime: null
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'No active focus session found'
    });
  }

  session.endTime = new Date();
  
  // Calculate durationMinutes
  const durationMinutes = Math.round((session.endTime - session.startTime) / 60000); // minutes
  session.durationMinutes = durationMinutes > 0 ? durationMinutes : 1; // Fallback to 1 minute minimum if stopped immediately

  // Debug log: Duration calculated
  console.log(`[Focus Timer] Duration calculated: ${session.durationMinutes} minutes`);

  // Update task actual hours if linked
  if (session.taskId) {
    const task = await Task.findById(session.taskId);
    if (task) {
      task.actualHours = (task.actualHours || 0) + (session.durationMinutes / 60);
      await task.save();
      console.log(`[Focus Timer] Updated task actual hours: ${task.title} is now ${task.actualHours}h`);
    }
  }

  await session.save();

  // Debug log: Database save result
  console.log(`[Focus Timer] Database save result (end): ${JSON.stringify(session)}`);

  res.json({ success: true, data: session });
});

/**
 * @route   GET /api/focus/active
 * @desc    Get current active session
 */
const getActiveSession = asyncHandler(async (req, res) => {
  const session = await FocusSession.findOne({
    userId: req.user._id,
    endTime: null
  }).populate('taskId', 'title');

  res.json({ success: true, data: session });
});

/**
 * @route   GET /api/focus/sessions
 * @desc    Get focus session history
 */
const getSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, days = 30 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const [sessions, total] = await Promise.all([
    FocusSession.find({
      userId: req.user._id,
      startTime: { $gte: startDate }
    })
      .populate('taskId', 'title')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    FocusSession.countDocuments({
      userId: req.user._id,
      startTime: { $gte: startDate }
    })
  ]);

  res.json({
    success: true,
    data: sessions,
    pagination: { page: parseInt(page), limit: parseInt(limit), total }
  });
});

/**
 * @route   GET /api/focus/stats
 * @desc    Get focus session statistics
 */
const getStats = asyncHandler(async (req, res) => {
  console.time('[getStats] total');
  const userId = req.user._id;
  const clientToday = req.query.today || new Date().toLocaleDateString('en-CA');
  
  const [yr, mn, dy] = clientToday.split('-').map(Number);
  const todayStart = new Date(yr, mn - 1, dy, 0, 0, 0, 0);
  const todayEnd   = new Date(yr, mn - 1, dy, 23, 59, 59, 999);

  // This week (Sunday start)
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // This month
  const monthStart = new Date(yr, mn - 1, 1, 0, 0, 0, 0);

  // 7 days breakdown start
  const breakdownStart = new Date(todayStart);
  breakdownStart.setDate(breakdownStart.getDate() - 6);

  // Use the earliest date (monthStart) to fetch everything in a single aggregation
  const earliestDate = monthStart < breakdownStart ? monthStart : breakdownStart;

  // Per Task Focus Hours aggregation — run in parallel with daily aggregation
  const matchUser = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId.toString())
    : userId;

  const [dailyAgg, perTaskFocus] = await Promise.all([
    // Single aggregation: group all sessions from the earliest range by day
    FocusSession.aggregate([
      {
        $match: {
          userId: matchUser,
          startTime: { $gte: earliestDate },
          endTime: { $ne: null }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime', timezone: 'UTC' }
          },
          totalMinutes: { $sum: '$durationMinutes' },
          sessionCount: { $sum: 1 }
        }
      }
    ]),
    // Per-task focus aggregation
    FocusSession.aggregate([
      {
        $match: {
          userId: matchUser,
          taskId: { $ne: null },
          endTime: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$taskId',
          totalDuration: { $sum: '$durationMinutes' }
        }
      },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      {
        $project: {
          _id: 1,
          taskTitle: '$taskInfo.title',
          hours: { $round: [ { $divide: ['$totalDuration', 60] }, 1 ] }
        }
      }
    ])
  ]);

  // Build a lookup map from the daily aggregation
  const dailyMap = Object.fromEntries(dailyAgg.map(r => [r._id, r]));

  // Helper to sum minutes from a date range using the lookup map
  const sumRange = (start, end) => {
    let totalMinutes = 0;
    let totalSessions = 0;
    const d = new Date(start);
    while (d <= end) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = dailyMap[key];
      if (entry) {
        totalMinutes += entry.totalMinutes;
        totalSessions += entry.sessionCount;
      }
      d.setDate(d.getDate() + 1);
    }
    return { totalMinutes, totalSessions };
  };

  const todayData = sumRange(todayStart, todayEnd);
  const weekData  = sumRange(weekStart, todayEnd);
  const monthData = sumRange(monthStart, todayEnd);

  const calcHours = (minutes) => Math.round((minutes / 60) * 10) / 10;

  // Daily breakdown for the last 7 days
  const dailyBreakdown = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(yr, mn - 1, dy - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const entry = dailyMap[dateStr];
    dailyBreakdown.push({
      date: dateStr,
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      hours: calcHours(entry?.totalMinutes || 0),
      sessions: entry?.sessionCount || 0
    });
  }

  console.log(`[Focus Timer] Stats aggregation: today=${calcHours(todayData.totalMinutes)}h, week=${calcHours(weekData.totalMinutes)}h, month=${calcHours(monthData.totalMinutes)}h, perTask=${perTaskFocus.length}`);
  console.timeEnd('[getStats] total');

  res.json({
    success: true,
    data: {
      today: {
        hours: calcHours(todayData.totalMinutes),
        sessions: todayData.totalSessions,
        pomodoros: 0 // pomodoro field is deprecated
      },
      week: {
        hours: calcHours(weekData.totalMinutes),
        sessions: weekData.totalSessions
      },
      month: {
        hours: calcHours(monthData.totalMinutes),
        sessions: monthData.totalSessions
      },
      dailyBreakdown,
      perTaskFocus
    }
  });
});

module.exports = { startSession, endSession, getActiveSession, getSessions, getStats };
