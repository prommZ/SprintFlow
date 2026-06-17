const Goal = require('../models/Goal');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/goals
 * @desc    Get all goals
 */
const getGoals = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const goals = await Goal.find(query)
    .populate('linkedTasks', 'title status priority')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: goals });
});

/**
 * @route   POST /api/goals
 * @desc    Create a new goal
 */
const createGoal = asyncHandler(async (req, res) => {
  req.body.user = req.user._id;
  const goal = await Goal.create(req.body);
  res.status(201).json({ success: true, data: goal });
});

/**
 * @route   GET /api/goals/:id
 * @desc    Get single goal
 */
const getGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id })
    .populate('linkedTasks', 'title status priority dueDate');

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  res.json({ success: true, data: goal });
});

/**
 * @route   PUT /api/goals/:id
 * @desc    Update goal
 */
const updateGoal = asyncHandler(async (req, res) => {
  let goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({ success: true, data: goal });
});

/**
 * @route   DELETE /api/goals/:id
 * @desc    Delete goal
 */
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  await Goal.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Goal deleted' });
});

/**
 * @route   PATCH /api/goals/:id/milestones
 * @desc    Update milestone progress
 */
const updateMilestones = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  const { milestones } = req.body;
  if (milestones) {
    goal.milestones = milestones;
    goal.calculateProgress();
    await goal.save();
  }

  res.json({ success: true, data: goal });
});

/**
 * @route   POST /api/goals/:id/link-task
 * @desc    Link a task to a goal
 */
const linkTask = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Task ID is required' });
  }

  if (!goal.linkedTasks.includes(taskId)) {
    goal.linkedTasks.push(taskId);
    await goal.save();
  }

  res.json({ success: true, data: goal });
});

/**
 * @route   DELETE /api/goals/:id/link-task/:taskId
 * @desc    Unlink a task from a goal
 */
const unlinkTask = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  goal.linkedTasks = goal.linkedTasks.filter(
    t => t.toString() !== req.params.taskId
  );
  await goal.save();

  res.json({ success: true, data: goal });
});

module.exports = {
  getGoals, createGoal, getGoal, updateGoal, deleteGoal,
  updateMilestones, linkTask, unlinkTask
};
