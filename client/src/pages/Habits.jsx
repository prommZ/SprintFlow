import React, { useState, useEffect } from 'react';
import { habitsAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { cn } from '@/lib/utils';
import { Plus, Repeat, Loader2, Flame, CheckCircle, Trash2, Edit3, Zap } from 'lucide-react';
import {
  calculateCurrentStreak,
  calculateBestStreak,
  calculateCompletionRate,
  calculateOverallCompletion
} from '@/lib/habitUtils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Habits ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-card border border-border rounded-2xl max-w-md mx-auto my-12 shadow-xl">
          <div className="w-16 h-16 bg-danger-muted text-danger rounded-full flex items-center justify-center mb-4 text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We encountered an error rendering the Habits tracker.
          </p>
          <pre className="text-left text-xs bg-surface-1 border border-border p-3.5 rounded-xl max-w-full overflow-x-auto text-danger mb-6 font-mono">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full py-2.5 font-semibold"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Habits() {
  console.log("[Habits] Mounting ErrorBoundary and HabitsContent wrapper");
  return (
    <ErrorBoundary>
      <HabitsContent />
    </ErrorBoundary>
  );
}

function HabitsContent() {
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [form, setForm] = useState({ name: '', frequency: 'Daily', category: '', icon: '📌', color: '#6366F1' });

  useEffect(() => {
    console.log("[HabitsContent] Mounted. Triggering loadData()");
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      console.log("[HabitsContent] Fetching habits and stats for date:", todayStr);
      const [habitsRes, statsRes] = await Promise.all([
        habitsAPI.getAll({ today: todayStr }),
        habitsAPI.getStats({ today: todayStr })
      ]);
      console.log("[HabitsContent] API responses received.", {
        habitsCount: habitsRes?.data?.length,
        stats: statsRes?.data
      });
      setHabits(habitsRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error("[HabitsContent] Error in loadData:", err);
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    console.log("[HabitsContent] Form submitted. Saving habit...", { editMode: !!editHabit, form });
    try {
      if (editHabit) {
        await habitsAPI.update(editHabit._id, form);
        toast.success('Habit updated');
      } else {
        await habitsAPI.create(form);
        toast.success('Habit created!');
      }
      setShowModal(false);
      setEditHabit(null);
      setForm({ name: '', frequency: 'Daily', category: '', icon: '📌', color: '#6366F1' });
      loadData();
    } catch (err) {
      console.error("[HabitsContent] Error saving habit:", err);
      toast.error('Failed to save habit');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompletion = async (id) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    console.log("[HabitsContent] Toggling completion for habit ID:", id, "today:", todayStr);
    
    // Optimistic UI update for immediate response!
    setHabits(prevHabits => prevHabits.map(h => {
      if (h._id === id) {
        const updatedCompletions = [...(h.completions || [])];
        const exists = updatedCompletions.some(c => c.date && new Date(c.date).toISOString().split('T')[0] === todayStr);
        if (!exists) {
          updatedCompletions.push({ date: new Date(`${todayStr}T00:00:00.000Z`), completed: true });
        }
        
        const tempHabit = { ...h, completions: updatedCompletions };
        const currentStreak = calculateCurrentStreak(tempHabit, todayStr);
        const longestStreak = calculateBestStreak(tempHabit, todayStr);
        const completionPercentage = calculateCompletionRate(tempHabit, todayStr);

        return {
          ...h,
          completions: updatedCompletions,
          currentStreak,
          longestStreak,
          completionPercentage
        };
      }
      return h;
    }));

    try {
      const res = await habitsAPI.complete(id, { date: todayStr, today: todayStr });
      if (res.success) {
        console.log("[HabitsContent] Complete API success:", res.data);
        toast.success('Habit completed! Keep it up!');
        
        // Update stats in background
        const statsRes = await habitsAPI.getStats({ today: todayStr });
        setStats(statsRes.data);
        
        // Update with precise data from server
        setHabits(prevHabits => prevHabits.map(h => {
          if (h._id === id) {
            const returnedHabit = res.data;
            const completionPercentage = calculateCompletionRate(returnedHabit, todayStr);
            return { ...h, ...returnedHabit, completionPercentage };
          }
          return h;
        }));
      }
    } catch (err) {
      console.error("[HabitsContent] Complete API error:", err);
      toast.error('Failed to complete habit');
      loadData(); // Revert back to original state if failed
    }
  };

  const deleteHabit = async (id) => {
    if (!confirm('Delete this habit?')) return;
    console.log("[HabitsContent] Deleting habit:", id);
    try {
      await habitsAPI.delete(id);
      toast.success('Habit deleted');
      loadData();
    } catch (err) {
      console.error("[HabitsContent] Delete error:", err);
      toast.error('Failed to delete');
    }
  };

  const isTodayCompleted = (habit) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return habit.completions?.some(c => c.date && new Date(c.date).toISOString().split('T')[0] === todayStr && c.completed);
  };

  // Generate last 7 days for heatmap
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const icons = ['📌', '📚', '💪', '🧘', '💻', '✍️', '🎯', '🏃', '🎸', '🧠', '💤', '🥗'];

  if (loading) return <div className="page-container"><LoadingSkeleton type="card" count={4} /></div>;

  // Dynamic UI calculation of summary cards to ensure perfect real-time synchronization
  const todayStr = new Date().toLocaleDateString('en-CA');
  const activeHabitsCount = habits.filter(h => h.isActive).length;
  const totalStreaksCount = habits.reduce((sum, h) => sum + (h.currentStreak || 0), 0);
  const overallCompletionPercentage = calculateOverallCompletion(habits, todayStr);
  const bestStreakCount = habits.length > 0 ? Math.max(...habits.map(h => h.longestStreak || 0), 0) : 0;

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Habits</h1>
          <p className="page-subtitle">Build consistency, one day at a time</p>
        </div>
        <button onClick={() => { setEditHabit(null); setForm({ name: '', frequency: 'Daily', category: '', icon: '📌', color: '#6366F1' }); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Habit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="text-sm text-muted-foreground">Active Habits</span>
          <p className="text-3xl font-bold text-foreground mt-1">{activeHabitsCount}</p>
        </div>
        <div className="stat-card">
          <span className="text-sm text-muted-foreground">Total Streaks</span>
          <p className="text-3xl font-bold text-foreground mt-1 flex items-center gap-1">
            {totalStreaksCount} <Flame className="w-5 h-5 text-warning" />
          </p>
        </div>
        <div className="stat-card">
          <span className="text-sm text-muted-foreground">Overall Completion</span>
          <p className="text-3xl font-bold text-foreground mt-1">{overallCompletionPercentage}%</p>
        </div>
        <div className="stat-card">
          <span className="text-sm text-muted-foreground">Best Streak</span>
          <p className="text-3xl font-bold text-foreground mt-1">
            {bestStreakCount}
          </p>
        </div>
      </div>

      {/* Habit Grid */}
      {habits.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No habits yet"
          description="Start building habits to track your consistency"
          action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4 inline mr-1" /> Create Habit</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map(habit => {
            const completed = isTodayCompleted(habit);
            return (
              <div
                key={habit._id}
                className="bg-card border border-border rounded-2xl p-6 hover:border-border-hover hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Accent indicator at the top */}
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: habit.color || '#6366F1' }} />
                
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2.5 bg-surface-3 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {habit.icon}
                      </span>
                      <div>
                        <h3 className={cn("text-lg font-semibold tracking-tight transition-colors", completed ? "text-success" : "text-foreground")}>
                          {habit.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge bg-surface-3 text-muted-foreground text-[10px] font-semibold">{habit.frequency}</span>
                          {habit.category && (
                            <span className="badge bg-surface-3 text-muted-foreground text-[10px] font-semibold">{habit.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => {
                          setEditHabit(habit);
                          setForm({ name: habit.name, frequency: habit.frequency, category: habit.category || '', icon: habit.icon, color: habit.color });
                          setShowModal(true);
                        }}
                        className="p-2 hover:bg-surface-3 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteHabit(habit._id)}
                        className="p-2 hover:bg-danger-muted rounded-xl transition-colors text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Today's Status Badge */}
                  <div className="mb-4">
                    <span className={cn(
                      "badge text-xs font-semibold py-1 px-2.5 rounded-full inline-flex items-center gap-1.5",
                      completed ? "bg-success-muted text-success" : "bg-surface-3 text-muted-foreground"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", completed ? "bg-success" : "bg-muted-foreground")} />
                      {completed ? "Completed Today" : "Not Completed Today"}
                    </span>
                  </div>

                  {/* Streaks & Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6 bg-surface-1/50 p-3.5 rounded-xl border border-border/50">
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Current Streak</p>
                      <p className="text-lg font-bold text-foreground mt-1 flex items-center justify-center gap-1">
                        <Flame className={cn("w-4.5 h-4.5", habit.currentStreak > 0 ? "text-warning animate-pulse" : "text-muted-foreground/30")} />
                        <span className={habit.currentStreak > 0 ? "text-warning" : "text-muted-foreground/50"}>{habit.currentStreak}</span>
                      </p>
                    </div>
                    <div className="text-center border-x border-border/50">
                      <p className="text-[11px] text-muted-foreground font-medium">Best Streak</p>
                      <p className="text-lg font-bold text-foreground mt-1 flex items-center justify-center gap-1">
                        <Zap className="w-4.5 h-4.5 text-accent" />
                        <span>{habit.longestStreak || 0}</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Completion</p>
                      <p className="text-lg font-bold text-foreground mt-1">
                        {habit.completionPercentage || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Completion Rate</span>
                      <span>{calculateCompletionRate(habit, todayStr)}%</span>
                    </div>
                    <div className="w-full bg-surface-3 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success transition-all duration-500 ease-out"
                        style={{ width: `${calculateCompletionRate(habit, todayStr)}%` }}
                      />
                    </div>
                  </div>

                  {/* Weekly Progress boxes */}
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground font-medium mb-2.5">Weekly Progress (Last 7 Days)</p>
                    <div className="flex justify-between items-center gap-1.5 bg-surface-2/30 p-2 rounded-xl border border-border/40">
                      {last7Days.map((day, i) => {
                        const dayStr = day.toISOString().split('T')[0];
                        const isDone = habit.completions?.some(c =>
                          new Date(c.date).toISOString().split('T')[0] === dayStr && c.completed
                        );
                        const weekdayLabel = day.toLocaleDateString('en', { weekday: 'narrow' });
                        const fullDateStr = day.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1">
                            <div
                              className={cn(
                                "w-full aspect-square max-w-[28px] rounded-lg transition-all duration-300 flex items-center justify-center text-[10px] font-bold shadow-sm",
                                isDone 
                                  ? "bg-success text-white ring-2 ring-success/20" 
                                  : "bg-surface-3 border border-border text-muted-foreground"
                              )}
                              title={`${fullDateStr}: ${isDone ? 'Completed' : 'Not Completed'}`}
                            >
                              {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                            </div>
                            <span className="text-[10px] text-muted-foreground/75 font-semibold mt-0.5">{weekdayLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Complete button */}
                <div className="mt-auto">
                  {completed ? (
                    <div className="w-full bg-success-muted text-success border border-success/30 rounded-xl py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-md shadow-success/5 animate-scale-in">
                      <CheckCircle className="w-4 h-4 animate-bounce" />
                      Completed Today
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleCompletion(habit._id)}
                      className="w-full btn-primary bg-accent hover:bg-accent-hover active:scale-95 text-white rounded-xl py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-accent/20"
                    >
                      Complete Today
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditHabit(null); }} title={editHabit ? 'Edit Habit' : 'New Habit'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(icon => (
                <button key={icon} type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-lg border transition-all',
                    form.icon === icon ? 'border-accent bg-accent-muted' : 'border-border hover:border-border-hover'
                  )}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="e.g., Morning Workout" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Frequency</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="input-field">
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
              <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="input-field" placeholder="e.g., Health" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditHabit(null); }} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editHabit ? 'Update' : 'Create Habit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
