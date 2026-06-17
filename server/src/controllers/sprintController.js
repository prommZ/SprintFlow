const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/sprints
 * @desc    Get all sprints
 */
const getSprints = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const sprints = await Sprint.find(query).sort({ createdAt: -1 });

  // Attach task counts to each sprint
  const sprintsWithCounts = await Promise.all(sprints.map(async (sprint) => {
    const taskCounts = await Task.aggregate([
      { $match: { sprint: sprint._id, user: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = { total: 0, done: 0, inProgress: 0, todo: 0, backlog: 0, review: 0 };
    taskCounts.forEach(tc => {
      counts.total += tc.count;
      if (tc._id === 'done') counts.done = tc.count;
      else if (tc._id === 'inprogress') counts.inProgress = tc.count;
      else if (tc._id === 'todo') counts.todo = tc.count;
      else if (tc._id === 'backlog') counts.backlog = tc.count;
      else if (tc._id === 'review') counts.review = tc.count;
    });

    return { ...sprint.toObject(), taskCounts: counts };
  }));

  res.json({ success: true, data: sprintsWithCounts });
});

/**
 * @route   POST /api/sprints
 * @desc    Create a new sprint
 */
const createSprint = asyncHandler(async (req, res) => {
  req.body.user = req.user._id;

  // Check for existing active sprint
  if (req.body.status === 'Active') {
    const activeSprint = await Sprint.findOne({ user: req.user._id, status: 'Active' });
    if (activeSprint) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active sprint. Complete it before starting a new one.'
      });
    }
  }

  const sprint = await Sprint.create(req.body);
  res.status(201).json({ success: true, data: sprint });
});

/**
 * @route   GET /api/sprints/active
 * @desc    Get the currently active sprint
 */
const getActiveSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findOne({ user: req.user._id, status: 'Active' });

  if (!sprint) {
    return res.json({ success: true, data: null });
  }

  const tasks = await Task.find({ sprint: sprint._id, user: req.user._id })
    .sort({ order: 1 });

  const taskCounts = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'inprogress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    backlog: tasks.filter(t => t.status === 'backlog').length,
    review: tasks.filter(t => t.status === 'review').length
  };

  res.json({
    success: true,
    data: { ...sprint.toObject(), tasks, taskCounts }
  });
});

/**
 * @route   GET /api/sprints/:id
 * @desc    Get single sprint with tasks
 */
const getSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findOne({ _id: req.params.id, user: req.user._id });

  if (!sprint) {
    return res.status(404).json({ success: false, message: 'Sprint not found' });
  }

  const tasks = await Task.find({ sprint: sprint._id, user: req.user._id })
    .sort({ order: 1 });

  res.json({ success: true, data: { ...sprint.toObject(), tasks } });
});

/**
 * @route   PUT /api/sprints/:id
 * @desc    Update sprint
 */
const updateSprint = asyncHandler(async (req, res) => {
  let sprint = await Sprint.findOne({ _id: req.params.id, user: req.user._id });

  if (!sprint) {
    return res.status(404).json({ success: false, message: 'Sprint not found' });
  }

  // If activating, check for existing active sprint
  if (req.body.status === 'Active' && sprint.status !== 'Active') {
    const activeSprint = await Sprint.findOne({
      user: req.user._id,
      status: 'Active',
      _id: { $ne: sprint._id }
    });
    if (activeSprint) {
      return res.status(400).json({
        success: false,
        message: 'Complete your active sprint before starting another.'
      });
    }
  }

  sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({ success: true, data: sprint });
});

/**
 * @route   DELETE /api/sprints/:id
 * @desc    Delete sprint
 */
const deleteSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findOne({ _id: req.params.id, user: req.user._id });

  if (!sprint) {
    return res.status(404).json({ success: false, message: 'Sprint not found' });
  }

  // Unlink tasks from this sprint
  await Task.updateMany(
    { sprint: sprint._id, user: req.user._id },
    { $set: { sprint: null } }
  );

  await Sprint.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Sprint deleted' });
});

/**
 * @route   POST /api/sprints/:id/complete
 * @desc    Complete a sprint and calculate velocity
 */
const completeSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findOne({ _id: req.params.id, user: req.user._id });

  if (!sprint) {
    return res.status(404).json({ success: false, message: 'Sprint not found' });
  }

  const tasks = await Task.find({ sprint: sprint._id, user: req.user._id });
  const completedTasks = tasks.filter(t => t.status === 'done');
  const velocity = completedTasks.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);

  sprint.status = 'Completed';
  sprint.velocity = velocity;
  sprint.totalPoints = tasks.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
  sprint.completedPoints = velocity;
  await sprint.save();

  // Optionally carry forward incomplete tasks
  if (req.body.carryForward) {
    const incompleteTasks = tasks.filter(t => t.status !== 'done');
    await Task.updateMany(
      { _id: { $in: incompleteTasks.map(t => t._id) } },
      { $set: { sprint: null, carriedForward: true } }
    );
  }

  res.json({ success: true, data: sprint });
});

/**
 * @route   GET /api/sprints/:id/metrics
 * @desc    Get sprint burndown/burnup metrics
 */
const getSprintMetrics = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findOne({ _id: req.params.id, user: req.user._id });

  if (!sprint) {
    return res.status(404).json({ success: false, message: 'Sprint not found' });
  }

  const tasks = await Task.find({ sprint: sprint._id, user: req.user._id });
  const totalTasks = tasks.length;
  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);

  // Generate daily burndown data
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const burndown = [];
  const burnup = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const completedByDay = tasks.filter(
      t => t.completedAt && new Date(t.completedAt) <= dayEnd
    );

    const completedHours = completedByDay.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
    const remainingHours = totalHours - completedHours;

    burndown.push({
      date: new Date(d).toISOString().split('T')[0],
      remaining: remainingHours,
      ideal: totalHours - (totalHours / ((endDate - startDate) / 86400000 + 1)) *
        ((new Date(d) - startDate) / 86400000 + 1)
    });

    burnup.push({
      date: new Date(d).toISOString().split('T')[0],
      completed: completedHours,
      total: totalHours
    });
  }

  const completionRate = totalTasks > 0
    ? Math.round((tasks.filter(t => t.status === 'done').length / totalTasks) * 100)
    : 0;

  res.json({
    success: true,
    data: {
      totalTasks,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      totalHours,
      completionRate,
      burndown,
      burnup,
      velocity: sprint.velocity
    }
  });
});

module.exports = {
  getSprints, createSprint, getActiveSprint, getSprint,
  updateSprint, deleteSprint, completeSprint, getSprintMetrics
};
