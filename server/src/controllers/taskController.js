const Task = require('../models/Task');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with filtering, sorting, and search
 */
const getTasks = asyncHandler(async (req, res) => {
  const {
    status, priority, sprint, search, sort, isArchived,
    dueDate, dueBefore, dueAfter, eisenhower, tags, page = 1, limit = 50
  } = req.query;

  const query = { user: req.user._id };

  // Filters
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (sprint) query.sprint = sprint;
  if (isArchived !== undefined) query.isArchived = isArchived === 'true';
  else query.isArchived = false; // Default: don't show archived
  if (eisenhower) query.eisenhowerCategory = eisenhower;
  if (tags) query.tags = { $in: tags.split(',') };

  // Date filters
  if (dueDate) {
    const start = new Date(dueDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dueDate);
    end.setHours(23, 59, 59, 999);
    query.dueDate = { $gte: start, $lte: end };
  }
  if (dueBefore) query.dueDate = { ...query.dueDate, $lte: new Date(dueBefore) };
  if (dueAfter) query.dueDate = { ...query.dueDate, $gte: new Date(dueAfter) };

  // Search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  // Sort
  let sortObj = { order: 1, createdAt: -1 };
  if (sort === 'priority') sortObj = { priority: 1, createdAt: -1 };
  if (sort === 'dueDate') sortObj = { dueDate: 1, createdAt: -1 };
  if (sort === 'title') sortObj = { title: 1 };
  if (sort === 'newest') sortObj = { createdAt: -1 };
  if (sort === 'oldest') sortObj = { createdAt: 1 };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [tasks, total] = await Promise.all([
    Task.find(query).sort(sortObj).skip(skip).limit(parseInt(limit)).populate('sprint', 'name'),
    Task.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 */
const createTask = asyncHandler(async (req, res) => {
  req.body.user = req.user._id;

  // Set board order to be at the end
  const lastTask = await Task.findOne({
    user: req.user._id,
    status: req.body.status || 'todo'
  }).sort({ order: -1 });

  req.body.order = lastTask ? lastTask.order + 1 : 0;

  const task = await Task.create(req.body);
  res.status(201).json({ success: true, data: task });
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task
 */
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id })
    .populate('sprint', 'name status');

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  res.json({ success: true, data: task });
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 */
const updateTask = asyncHandler(async (req, res) => {
  let task = await Task.findOne({ _id: req.params.id, user: req.user._id });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  // Update completedAt manually if status changes
  if (req.body.status !== undefined && req.body.status !== task.status) {
    if (req.body.status === 'done') {
      req.body.completedAt = new Date();
      console.log(`[updateTask] Manually setting completedAt for task: ${task._id}`);
    } else {
      req.body.completedAt = null;
      console.log(`[updateTask] Manually clearing completedAt for task: ${task._id}`);
    }
  }

  task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({ success: true, data: task });
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  await Task.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Task deleted' });
});

/**
 * @route   POST /api/tasks/:id/archive
 * @desc    Archive a task
 */
const archiveTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  task.archived = true;
  task.isArchived = true;
  task.archivedAt = new Date();
  task.previousStatus = task.status;
  await task.save();

  res.json({ success: true, data: task });
});

/**
 * @route   POST /api/tasks/:id/restore
 * @desc    Restore an archived task
 */
const restoreTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  task.archived = false;
  task.isArchived = false;
  if (task.previousStatus) {
    task.status = task.previousStatus;
  }
  task.archivedAt = null;
  await task.save();

  res.json({ success: true, data: task });
});

/**
 * @route   GET /api/tasks/archived
 * @desc    Get all archived tasks
 */
const getArchivedTasks = asyncHandler(async (req, res) => {
  console.time('[getArchivedTasks] total');
  const { search, priority, status, sort } = req.query;
  const query = { user: req.user._id, archived: true };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  if (priority) {
    query.priority = priority;
  }
  if (status) {
    query.$or = [
      { status: status },
      { previousStatus: status }
    ];
  }

  let sortObj = { archivedAt: -1 };
  if (sort === 'title') sortObj = { title: 1 };
  if (sort === 'oldest') sortObj = { archivedAt: 1 };

  const tasks = await Task.find(query).sort(sortObj).lean();
  console.timeEnd('[getArchivedTasks] total');
  res.json({ success: true, data: tasks });
});

/**
 * @route   PATCH /api/tasks/reorder
 * @desc    Reorder tasks on the board (drag and drop)
 */
const reorderTasks = asyncHandler(async (req, res) => {
  const { tasks } = req.body; // Array of { _id, status, order }

  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of tasks to reorder'
    });
  }

  // Fetch existing tasks to check for status transitions
  const taskIds = tasks.map(t => t._id);
  const existingTasks = await Task.find({ _id: { $in: taskIds }, user: req.user._id });
  const existingMap = new Map(existingTasks.map(t => [t._id.toString(), t]));

  const bulkOps = tasks.map(t => {
    const existing = existingMap.get(t._id.toString());
    const updateFields = { status: t.status, order: t.order };

    if (existing) {
      if (t.status === 'done' && existing.status !== 'done') {
        updateFields.completedAt = new Date();
        console.log(`[reorderTasks] Manually setting completedAt for task: ${t._id}`);
      } else if (t.status !== 'done' && existing.status === 'done') {
        updateFields.completedAt = null;
        console.log(`[reorderTasks] Manually clearing completedAt for task: ${t._id}`);
      }
    } else {
      if (t.status === 'done') {
        updateFields.completedAt = new Date();
      }
    }

    return {
      updateOne: {
        filter: { _id: t._id, user: req.user._id },
        update: { $set: updateFields }
      }
    };
  });

  await Task.bulkWrite(bulkOps);

  res.json({ success: true, message: 'Tasks reordered' });
});

/**
 * @route   POST /api/tasks/carry-forward
 * @desc    Auto carry forward incomplete tasks to today
 */
const carryForward = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const incompleteTasks = await Task.find({
    user: req.user._id,
    status: { $in: ['todo', 'inprogress'] },
    dueDate: { $lt: today },
    isArchived: false
  });

  const updates = incompleteTasks.map(task => {
    if (!task.originalDueDate) {
      task.originalDueDate = task.dueDate;
    }
    task.dueDate = today;
    task.carriedForward = true;
    return task.save();
  });

  await Promise.all(updates);

  res.json({
    success: true,
    message: `${incompleteTasks.length} tasks carried forward`,
    data: { count: incompleteTasks.length }
  });
});

/**
 * @route   GET /api/tasks/today
 * @desc    Get today's tasks
 */
const getTodayTasks = asyncHandler(async (req, res) => {
  const clientToday = req.query.today || new Date().toLocaleDateString('en-CA');
  const [yr, mn, dy] = clientToday.split('-').map(Number);
  
  const today = new Date(yr, mn - 1, dy, 0, 0, 0, 0);
  const tomorrow = new Date(yr, mn - 1, dy + 1, 0, 0, 0, 0);

  const tasks = await Task.find({
    user: req.user._id,
    isArchived: false,
    $or: [
      { dueDate: { $gte: today, $lt: tomorrow } },
      { status: 'inprogress' }
    ]
  }).sort({ order: 1 });

  res.json({ success: true, data: tasks });
});

module.exports = {
  getTasks, createTask, getTask, updateTask, deleteTask,
  archiveTask, restoreTask, getArchivedTasks, reorderTasks, carryForward, getTodayTasks
};
