const Habit = require('../models/Habit');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/habits
 * @desc    Get all habits
 */
const getHabits = asyncHandler(async (req, res) => {
  const { isActive, today } = req.query;
  const query = { user: req.user._id };
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const habits = await Habit.find(query).sort({ createdAt: -1 });

  const clientToday = today || new Date().toISOString().split('T')[0];
  const updatedHabits = [];

  const {
    calculateCurrentStreak,
    calculateBestStreak,
    calculateCompletionRate
  } = require('../utils/habitUtils');

  for (let habit of habits) {
    const currentStreak = calculateCurrentStreak(habit, clientToday);
    const longestStreak = calculateBestStreak(habit, clientToday);
    const completionPercentage = calculateCompletionRate(habit, clientToday);

    let needsSave = false;
    if (habit.currentStreak !== currentStreak) {
      habit.currentStreak = currentStreak;
      needsSave = true;
    }
    if (habit.longestStreak !== longestStreak) {
      habit.longestStreak = longestStreak;
      needsSave = true;
    }
    if (needsSave) {
      await habit.save();
    }

    const habitObj = habit.toObject();
    habitObj.completionPercentage = completionPercentage;

    console.log(`[Habits Debug] Habit ID: ${habit._id} | Frequency: ${habit.frequency} | Completed Dates: [${habit.completions.filter(c => c.completed).map(c => c.date.toISOString().split('T')[0]).join(', ')}] | Current Streak: ${currentStreak} | Best Streak: ${longestStreak} | Completion Rate: ${completionPercentage}% | Overall Completion: N/A`);

    updatedHabits.push(habitObj);
  }

  res.json({ success: true, data: updatedHabits });
});

/**
 * @route   POST /api/habits
 * @desc    Create a new habit
 */
const createHabit = asyncHandler(async (req, res) => {
  req.body.user = req.user._id;
  const habit = await Habit.create(req.body);
  res.status(201).json({ success: true, data: habit });
});

/**
 * @route   PUT /api/habits/:id
 * @desc    Update habit
 */
const updateHabit = asyncHandler(async (req, res) => {
  let habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    return res.status(404).json({ success: false, message: 'Habit not found' });
  }

  habit = await Habit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({ success: true, data: habit });
});

/**
 * @route   DELETE /api/habits/:id
 * @desc    Delete habit
 */
const deleteHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    return res.status(404).json({ success: false, message: 'Habit not found' });
  }

  await Habit.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Habit deleted' });
});

/**
 * @route   POST /api/habits/:id/complete
 * @desc    Toggle habit completion for today (or specific date)
 */
const completeHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    return res.status(404).json({ success: false, message: 'Habit not found' });
  }

  const clientToday = req.body.today || new Date().toISOString().split('T')[0];
  const dateStr = req.body.date || clientToday;
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  // Check if already completed for this date
  const existingIdx = habit.completions.findIndex(c => {
    const cDate = new Date(c.date);
    return cDate.toISOString().split('T')[0] === dateStr;
  });

  const {
    calculateCurrentStreak,
    calculateBestStreak,
    calculateCompletionRate
  } = require('../utils/habitUtils');

  if (existingIdx !== -1) {
    // Already completed. Prevent multiple completions on the same day by returning the habit as is.
    const habitObj = habit.toObject();
    habitObj.completionPercentage = calculateCompletionRate(habit, clientToday);
    return res.json({ success: true, data: habitObj });
  }

  // Add completion
  habit.completions.push({ date: targetDate, completed: true });

  // Recalculate streaks
  const currentStreak = calculateCurrentStreak(habit, clientToday);
  const longestStreak = calculateBestStreak(habit, clientToday);
  
  habit.currentStreak = currentStreak;
  habit.longestStreak = longestStreak;
  await habit.save();

  const habitObj = habit.toObject();
  habitObj.completionPercentage = calculateCompletionRate(habit, clientToday);

  console.log(`[Habits Debug] Complete Habit - Habit ID: ${habit._id} | Frequency: ${habit.frequency} | Completed Dates: [${habit.completions.filter(c => c.completed).map(c => c.date.toISOString().split('T')[0]).join(', ')}] | Current Streak: ${currentStreak} | Best Streak: ${longestStreak} | Completion Rate: ${habitObj.completionPercentage}%`);

  res.json({ success: true, data: habitObj });
});

/**
 * @route   GET /api/habits/stats
 * @desc    Get habit statistics
 */
const getHabitStats = asyncHandler(async (req, res) => {
  const habits = await Habit.find({ user: req.user._id, isActive: true });
  const clientToday = req.query.today || new Date().toISOString().split('T')[0];

  const {
    calculateCurrentStreak,
    calculateBestStreak,
    calculateCompletionRate,
    calculateOverallCompletion
  } = require('../utils/habitUtils');

  const overallCompletion = calculateOverallCompletion(habits, clientToday);

  const stats = [];
  for (let habit of habits) {
    const currentStreak = calculateCurrentStreak(habit, clientToday);
    const longestStreak = calculateBestStreak(habit, clientToday);
    const completionRate = calculateCompletionRate(habit, clientToday);

    let needsSave = false;
    if (habit.currentStreak !== currentStreak) {
      habit.currentStreak = currentStreak;
      needsSave = true;
    }
    if (habit.longestStreak !== longestStreak) {
      habit.longestStreak = longestStreak;
      needsSave = true;
    }
    if (needsSave) {
      await habit.save();
    }

    stats.push({
      _id: habit._id,
      name: habit.name,
      currentStreak: currentStreak,
      longestStreak: longestStreak,
      completionRate: completionRate
    });

    console.log(`[Habits Debug] Stats - Habit ID: ${habit._id} | Frequency: ${habit.frequency} | Completed Dates: [${habit.completions.filter(c => c.completed).map(c => c.date.toISOString().split('T')[0]).join(', ')}] | Current Streak: ${currentStreak} | Best Streak: ${longestStreak} | Completion Rate: ${completionRate}% | Overall Completion: ${overallCompletion}%`);
  }

  res.json({
    success: true,
    data: {
      habits: stats,
      overallCompletion,
      totalActive: habits.length,
      totalStreaks: habits.reduce((sum, h) => sum + h.currentStreak, 0)
    }
  });
});

module.exports = { getHabits, createHabit, updateHabit, deleteHabit, completeHabit, getHabitStats };
