const Review = require('../models/Review');
const Task = require('../models/Task');
const FocusSession = require('../models/FocusSession');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/reviews
 * @desc    Create end-of-day review (auto-calculates metrics)
 */
const createReview = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Auto-calculate metrics
  const [completedTasks, allTodayTasks, focusSessions] = await Promise.all([
    Task.countDocuments({
      user: req.user._id,
      completedAt: { $gte: today, $lt: tomorrow }
    }),
    Task.countDocuments({
      user: req.user._id,
      dueDate: { $gte: today, $lt: tomorrow },
      isArchived: false
    }),
    FocusSession.find({
      userId: req.user._id,
      startTime: { $gte: today, $lt: tomorrow },
      endTime: { $ne: null }
    })
  ]);

  const focusHours = focusSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;
  const pendingCount = allTodayTasks - completedTasks;
  const productivityScore = allTodayTasks > 0
    ? Math.round((completedTasks / allTodayTasks) * 100)
    : 0;

  const { wentWell, distractions, improvements, mood } = req.body;

  let review = await Review.findOne({ user: req.user._id, date: today });

  if (review) {
    review.wentWell = wentWell || review.wentWell;
    review.distractions = distractions || review.distractions;
    review.improvements = improvements || review.improvements;
    review.mood = mood || review.mood;
    review.completedCount = completedTasks;
    review.pendingCount = pendingCount;
    review.productivityScore = productivityScore;
    review.focusHours = Math.round(focusHours * 10) / 10;
    await review.save();
  } else {
    review = await Review.create({
      user: req.user._id,
      date: today,
      wentWell,
      distractions,
      improvements,
      mood,
      completedCount: completedTasks,
      pendingCount,
      productivityScore,
      focusHours: Math.round(focusHours * 10) / 10
    });
  }

  res.status(201).json({ success: true, data: review });
});

/**
 * @route   GET /api/reviews
 * @desc    Get review history
 */
const getReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 14 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ user: req.user._id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Review.countDocuments({ user: req.user._id })
  ]);

  res.json({
    success: true,
    data: reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * @route   GET /api/reviews/today
 * @desc    Get today's review
 */
const getTodayReview = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const review = await Review.findOne({ user: req.user._id, date: today });
  res.json({ success: true, data: review });
});

module.exports = { createReview, getReviews, getTodayReview };
