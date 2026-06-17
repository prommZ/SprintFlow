const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Habit = require('../models/Habit');
const FocusSession = require('../models/FocusSession');
const Review = require('../models/Review');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get aggregated dashboard metrics
 */
const getDashboardMetrics = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Data healing: set completedAt to updatedAt for tasks that are done but have completedAt as null
  await Task.updateMany(
    { user: userId, status: 'done', completedAt: null },
    [
      { $set: { completedAt: "$updatedAt" } }
    ]
  );

  // Audit debug logs
  const totalDoneStatus = await Task.countDocuments({ user: userId, status: 'done', isArchived: false });
  const totalCompletedAt = await Task.countDocuments({ user: userId, completedAt: { $ne: null } });
  console.log(`[Analytics Audit] User: ${userId} - Tasks with status 'done': ${totalDoneStatus}, Tasks with completedAt timestamp: ${totalCompletedAt}`);

  const clientToday = req.query.today || new Date().toLocaleDateString('en-CA');
  console.log(`[getDashboardMetrics] Request received. User: ${userId}, Today: ${clientToday}`);

  const [yr, mn, dy] = clientToday.split('-').map(Number);
  const todayStart = new Date(yr, mn - 1, dy, 0, 0, 0, 0);
  const todayEnd = new Date(yr, mn - 1, dy, 23, 59, 59, 999);

  // Task metrics
  const [totalTasks, completedTasks, pendingTasks, inProgressTasks, todayTasks] = await Promise.all([
    Task.countDocuments({ user: userId, isArchived: false }),
    Task.countDocuments({ user: userId, status: 'done', isArchived: false }),
    Task.countDocuments({ user: userId, status: { $in: ['todo', 'backlog'] }, isArchived: false }),
    Task.countDocuments({ user: userId, status: 'inprogress', isArchived: false }),
    Task.countDocuments({
      user: userId,
      dueDate: { $gte: todayStart, $lte: todayEnd },
      isArchived: false
    })
  ]);
  console.log(`[getDashboardMetrics] MongoDB query results: total=${totalTasks}, completed=${completedTasks}, pending=${pendingTasks}, inProgress=${inProgressTasks}, todayTasks=${todayTasks}`);

  // Active sprint
  const activeSprint = await Sprint.findOne({ user: userId, status: 'Active' });

  // Today's focus
  const todayFocus = await FocusSession.find({
    userId: userId,
    startTime: { $gte: todayStart },
    endTime: { $ne: null }
  });
  const focusHoursToday = Math.round(
    todayFocus.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60 * 10
  ) / 10;

  // Completed today
  const completedToday = await Task.countDocuments({
    user: userId,
    completedAt: { $gte: todayStart, $lte: todayEnd }
  });

  // Productivity percentage
  const productivityPercent = todayTasks > 0
    ? Math.round((completedToday / todayTasks) * 100)
    : 0;

  // Carried forward tasks
  const carriedForward = await Task.countDocuments({
    user: userId,
    carriedForward: true,
    status: { $ne: 'done' },
    isArchived: false
  });
  console.log(`[getDashboardMetrics] Metrics calculated: focusHoursToday=${focusHoursToday}, completedToday=${completedToday}, productivityPercent=${productivityPercent}, carriedForward=${carriedForward}`);

  const responseData = {
    tasks: { total: totalTasks, completed: completedTasks, pending: pendingTasks, inProgress: inProgressTasks },
    today: { tasks: todayTasks, completed: completedToday, productivity: productivityPercent },
    focusHoursToday,
    activeSprint: activeSprint ? {
      _id: activeSprint._id,
      name: activeSprint.name,
      goal: activeSprint.goal,
      startDate: activeSprint.startDate,
      endDate: activeSprint.endDate
    } : null,
    carriedForward
  };
  console.log(`[getDashboardMetrics] Final response payload keys:`, Object.keys(responseData));
  res.json({
    success: true,
    data: responseData
  });
});

/**
 * @route   GET /api/analytics/productivity
 * @desc    Get productivity trends (last 30 days)
 */
const getProductivityTrends = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Data healing: set completedAt to updatedAt for tasks that are done but have completedAt as null
  await Task.updateMany(
    { user: userId, status: 'done', completedAt: null },
    [
      { $set: { completedAt: "$updatedAt" } }
    ]
  );

  // Audit debug logs
  const totalDoneStatus = await Task.countDocuments({ user: userId, status: 'done', isArchived: false });
  const totalCompletedAt = await Task.countDocuments({ user: userId, completedAt: { $ne: null } });
  console.log(`[Analytics Audit] User: ${userId} - Tasks with status 'done': ${totalDoneStatus}, Tasks with completedAt timestamp: ${totalCompletedAt}`);

  const { days = 30 } = req.query;
  const clientToday = req.query.today || new Date().toLocaleDateString('en-CA');
  console.log(`[getProductivityTrends] Request received. User: ${userId}, Days: ${days}, Today: ${clientToday}`);
  const [yr, mn, dy] = clientToday.split('-').map(Number);

  const trends = [];

  for (let i = parseInt(days) - 1; i >= 0; i--) {
    const dayStart = new Date(yr, mn - 1, dy - i, 0, 0, 0, 0);
    const dayEnd = new Date(yr, mn - 1, dy - i, 23, 59, 59, 999);

    const [created, completed, focusSessions] = await Promise.all([
      Task.countDocuments({ user: userId, createdAt: { $gte: dayStart, $lte: dayEnd } }),
      Task.countDocuments({ user: userId, completedAt: { $gte: dayStart, $lte: dayEnd } }),
      FocusSession.find({
        userId: userId,
        startTime: { $gte: dayStart, $lte: dayEnd },
        endTime: { $ne: null }
      })
    ]);

    const focusHours = Math.round(
      focusSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60 * 10
    ) / 10;

    const year = dayStart.getFullYear();
    const month = String(dayStart.getMonth() + 1).padStart(2, '0');
    const day = String(dayStart.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    trends.push({
      date: dateStr,
      created,
      completed,
      focusHours
    });
  }
  console.log(`[getProductivityTrends] Completed trend aggregation: ${trends.length} entries.`);
  res.json({ success: true, data: trends });
});

/**
 * @route   GET /api/analytics/workload
 * @desc    Smart workload analysis
 */
const getWorkloadAnalysis = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const clientToday = req.query.today || new Date().toLocaleDateString('en-CA');
  const [yr, mn, dy] = clientToday.split('-').map(Number);
  const now = new Date();
  const warnings = [];
  console.log(`[getWorkloadAnalysis] Request received. User: ${userId}, Today: ${clientToday}`);

  // Next 7 days workload
  const dailyWorkload = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(yr, mn - 1, dy + i, 0, 0, 0, 0);
    const dayEnd = new Date(yr, mn - 1, dy + i, 23, 59, 59, 999);

    const tasks = await Task.find({
      user: userId,
      dueDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'done' },
      isArchived: false
    });

    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
    const dayName = dayStart.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });

    const year = dayStart.getFullYear();
    const month = String(dayStart.getMonth() + 1).padStart(2, '0');
    const day = String(dayStart.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    dailyWorkload.push({
      date: dateStr,
      dayName,
      taskCount: tasks.length,
      estimatedHours: totalHours,
      isOverloaded: totalHours > (req.user.preferences?.dailyGoalHours || 8)
    });

    if (totalHours > (req.user.preferences?.dailyGoalHours || 8)) {
      warnings.push({
        type: 'overloaded',
        message: `${dayName} has ${totalHours}h of work scheduled (limit: ${req.user.preferences?.dailyGoalHours || 8}h)`,
        date: dateStr
      });
    }
  }

  // Overdue tasks
  const overdueTasks = await Task.countDocuments({
    user: userId,
    dueDate: { $lt: now },
    status: { $ne: 'done' },
    isArchived: false
  });

  if (overdueTasks > 0) {
    warnings.push({
      type: 'overdue',
      message: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`
    });
  }

  // Tasks without estimates
  const noEstimate = await Task.countDocuments({
    user: userId,
    estimatedHours: 0,
    status: { $ne: 'done' },
    isArchived: false
  });

  if (noEstimate > 5) {
    warnings.push({
      type: 'no-estimate',
      message: `${noEstimate} tasks have no time estimate — workload analysis may be inaccurate`
    });
  }
  console.log(`[getWorkloadAnalysis] Workload calculated. Warnings count: ${warnings.length}, Overdue count: ${overdueTasks}`);

  res.json({
    success: true,
    data: {
      dailyWorkload,
      warnings,
      overdueTasks,
      freeDays: dailyWorkload.filter(d => d.taskCount === 0).length
    }
  });
});

/**
 * @route   GET /api/analytics/sprint-performance
 * @desc    Get sprint velocity history
 */
const getSprintPerformance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log(`[getSprintPerformance] Request received. User: ${userId}`);
  const sprints = await Sprint.find({
    user: userId,
    status: 'Completed'
  }).sort({ endDate: -1 }).limit(10);

  const performance = sprints.reverse().map(sprint => ({
    name: sprint.name,
    velocity: sprint.velocity,
    totalPoints: sprint.totalPoints,
    completedPoints: sprint.completedPoints,
    completionRate: sprint.totalPoints > 0
      ? Math.round((sprint.completedPoints / sprint.totalPoints) * 100)
      : 0,
    startDate: sprint.startDate,
    endDate: sprint.endDate
  }));

  const avgVelocity = performance.length > 0
    ? Math.round(performance.reduce((sum, p) => sum + p.velocity, 0) / performance.length)
    : 0;
  console.log(`[getSprintPerformance] Performance calculated. Found ${performance.length} sprints. Avg Velocity: ${avgVelocity}`);

  res.json({
    success: true,
    data: {
      sprints: performance,
      avgVelocity
    }
  });
});

module.exports = { getDashboardMetrics, getProductivityTrends, getWorkloadAnalysis, getSprintPerformance };
