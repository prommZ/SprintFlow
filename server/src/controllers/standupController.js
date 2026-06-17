const Standup = require('../models/Standup');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/standups
 * @desc    Create or update today's standup
 */
const createStandup = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { completedYesterday, planToday, blockers } = req.body;

  let standup = await Standup.findOne({ user: req.user._id, date: today });

  if (standup) {
    // Update existing
    standup.completedYesterday = completedYesterday || standup.completedYesterday;
    standup.planToday = planToday || standup.planToday;
    standup.blockers = blockers || standup.blockers;
    await standup.save();
  } else {
    standup = await Standup.create({
      user: req.user._id,
      date: today,
      completedYesterday,
      planToday,
      blockers
    });
  }

  res.status(201).json({ success: true, data: standup });
});

/**
 * @route   GET /api/standups
 * @desc    Get standup history (paginated)
 */
const getStandups = asyncHandler(async (req, res) => {
  const { page = 1, limit = 14 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [standups, total] = await Promise.all([
    Standup.find({ user: req.user._id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Standup.countDocuments({ user: req.user._id })
  ]);

  res.json({
    success: true,
    data: standups,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * @route   GET /api/standups/today
 * @desc    Get today's standup
 */
const getTodayStandup = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const standup = await Standup.findOne({ user: req.user._id, date: today });
  res.json({ success: true, data: standup });
});

/**
 * @route   DELETE /api/standups/:id
 * @desc    Delete a standup entry
 */
const deleteStandup = asyncHandler(async (req, res) => {
  const standup = await Standup.findOne({ _id: req.params.id, user: req.user._id });

  if (!standup) {
    return res.status(404).json({ success: false, message: 'Standup not found' });
  }

  await Standup.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Standup deleted' });
});

module.exports = { createStandup, getStandups, getTodayStandup, deleteStandup };
