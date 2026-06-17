export const formatDateStr = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const getSundayDate = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 is Sunday
  const diff = d.getUTCDate() - day;
  const sun = new Date(d);
  sun.setUTCDate(diff);
  return sun;
};

export const formatMonthStr = (date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export function getExpectedPeriods(createdAt, todayStr, frequency) {
  const start = new Date(createdAt);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(`${todayStr}T00:00:00.000Z`);
  end.setUTCHours(0, 0, 0, 0);
  
  const periods = [];
  
  if (frequency === 'Daily') {
    const curr = new Date(start);
    while (curr <= end) {
      periods.push(formatDateStr(curr));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  } else if (frequency === 'Weekly') {
    const curr = getSundayDate(start);
    const endWeek = getSundayDate(end);
    while (curr <= endWeek) {
      periods.push(formatDateStr(curr));
      curr.setUTCDate(curr.getUTCDate() + 7);
    }
  } else if (frequency === 'Monthly') {
    const curr = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (curr <= endMonth) {
      periods.push(formatMonthStr(curr));
      curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
  }
  
  return periods;
}

export function getCompletedPeriodsSet(habit, frequency) {
  const completions = habit.completions || [];
  const completed = completions.filter(c => c.completed);
  const set = new Set();
  
  for (const c of completed) {
    if (frequency === 'Daily') {
      set.add(formatDateStr(c.date));
    } else if (frequency === 'Weekly') {
      set.add(formatDateStr(getSundayDate(c.date)));
    } else if (frequency === 'Monthly') {
      set.add(formatMonthStr(c.date));
    }
  }
  
  return set;
}

export function calculateCurrentStreak(habit, todayStr) {
  const createdAt = habit.createdAt || new Date();
  const periods = getExpectedPeriods(createdAt, todayStr, habit.frequency);
  const completedSet = getCompletedPeriodsSet(habit, habit.frequency);
  
  if (periods.length === 0) return 0;
  
  let streak = 0;
  let idx = periods.length - 1;
  
  if (completedSet.has(periods[idx])) {
    while (idx >= 0 && completedSet.has(periods[idx])) {
      streak++;
      idx--;
    }
  } else {
    idx--;
    if (idx >= 0 && completedSet.has(periods[idx])) {
      while (idx >= 0 && completedSet.has(periods[idx])) {
        streak++;
        idx--;
      }
    }
  }
  
  return streak;
}

export function calculateBestStreak(habit, todayStr) {
  const createdAt = habit.createdAt || new Date();
  const periods = getExpectedPeriods(createdAt, todayStr, habit.frequency);
  const completedSet = getCompletedPeriodsSet(habit, habit.frequency);
  
  let maxStreak = 0;
  let tempStreak = 0;
  
  for (const p of periods) {
    if (completedSet.has(p)) {
      tempStreak++;
    } else {
      maxStreak = Math.max(maxStreak, tempStreak);
      tempStreak = 0;
    }
  }
  
  return Math.max(maxStreak, tempStreak);
}

export function calculateCompletionRate(habit, todayStr) {
  const createdAt = habit.createdAt || new Date();
  const periods = getExpectedPeriods(createdAt, todayStr, habit.frequency);
  const completedSet = getCompletedPeriodsSet(habit, habit.frequency);
  
  const total = periods.length;
  if (total === 0) return 0;
  
  let completed = 0;
  for (const p of periods) {
    if (completedSet.has(p)) {
      completed++;
    }
  }
  
  return Math.min(100, Math.round((completed / total) * 100));
}

export function calculateOverallCompletion(habits, todayStr) {
  if (!habits || habits.length === 0) return 0;
  
  let totalCompleted = 0;
  let totalTracked = 0;
  
  for (const habit of habits) {
    const createdAt = habit.createdAt || new Date();
    const periods = getExpectedPeriods(createdAt, todayStr, habit.frequency);
    const completedSet = getCompletedPeriodsSet(habit, habit.frequency);
    
    totalTracked += periods.length;
    for (const p of periods) {
      if (completedSet.has(p)) {
        totalCompleted++;
      }
    }
  }
  
  if (totalTracked === 0) return 0;
  return Math.min(100, Math.round((totalCompleted / totalTracked) * 100));
}
