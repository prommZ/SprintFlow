import { useState, useEffect } from 'react';
import { goalsAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { formatDate, cn } from '@/lib/utils';
import { Plus, Target, Loader2, Trash2, CheckCircle, Circle, Calendar } from 'lucide-react';

export default function Goals() {
  const toast = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', category: '', milestones: '' });

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    try {
      const res = await goalsAPI.getAll();
      setGoals(res.data);
    } catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const milestones = form.milestones
        ? form.milestones.split('\n').filter(Boolean).map(m => ({ title: m.trim(), completed: false }))
        : [];
      await goalsAPI.create({ ...form, milestones, deadline: form.deadline || null });
      toast.success('Goal created!');
      setShowModal(false);
      setForm({ title: '', description: '', deadline: '', category: '', milestones: '' });
      loadGoals();
    } catch { toast.error('Failed to create goal'); }
    finally { setSaving(false); }
  };

  const toggleMilestone = async (goalId, milestones, idx) => {
    const updated = milestones.map((m, i) => i === idx ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date() : null } : m);
    try {
      await goalsAPI.updateMilestones(goalId, updated);
      loadGoals();
    } catch { toast.error('Failed to update'); }
  };

  const deleteGoal = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await goalsAPI.delete(id);
      toast.success('Goal deleted');
      loadGoals();
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="card" count={3} /></div>;

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">Track your long-term objectives</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set your first long-term goal with milestones"
          action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4 inline mr-1" /> Create Goal</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => (
            <div key={goal._id} className="bg-card border border-border rounded-xl p-5 hover:border-border-hover transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{goal.title}</h3>
                  {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
                </div>
                <button onClick={() => deleteGoal(goal._id)} className="p-1.5 hover:bg-danger-muted rounded-lg text-muted-foreground hover:text-danger transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {goal.deadline && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <Calendar className="w-3 h-3" /> Deadline: {formatDate(goal.deadline)}
                </div>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">{goal.progress}%</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${goal.progress}%`, backgroundColor: goal.color || '#6366F1' }}
                  />
                </div>
              </div>

              {/* Milestones */}
              {goal.milestones?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Milestones</p>
                  {goal.milestones.map((m, i) => (
                    <button
                      key={m._id || i}
                      onClick={() => toggleMilestone(goal._id, goal.milestones, i)}
                      className="flex items-center gap-2 w-full text-left hover:bg-surface-3 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      {m.completed ? (
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={cn('text-sm', m.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                        {m.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {goal.category && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <span className="text-xs px-2 py-0.5 bg-surface-3 rounded text-muted-foreground">{goal.category}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Goal">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-field" placeholder="e.g., Become VLSI Engineer" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none" rows={2} placeholder="Why is this goal important?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
              <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="input-field" placeholder="e.g., Career" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Milestones (one per line)</label>
            <textarea value={form.milestones} onChange={e => setForm({ ...form, milestones: e.target.value })}
              className="input-field resize-none font-mono text-sm" rows={4} placeholder={"Learn Verilog\nComplete PCB Design\nCrack GATE exam"} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
