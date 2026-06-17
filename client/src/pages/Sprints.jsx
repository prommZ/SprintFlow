import { useState, useEffect } from 'react';
import { sprintsAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { formatDate, cn } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Rocket, Loader2, Play, CheckCircle, Trash2, BarChart3, ArrowRight } from 'lucide-react';

export default function Sprints() {
  const toast = useToast();
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '', status: 'Planning' });

  useEffect(() => { loadSprints(); }, []);

  const loadSprints = async () => {
    try {
      const res = await sprintsAPI.getAll();
      setSprints(res.data);
    } catch { toast.error('Failed to load sprints'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await sprintsAPI.create(form);
      toast.success('Sprint created');
      setShowModal(false);
      setForm({ name: '', goal: '', startDate: '', endDate: '', status: 'Planning' });
      loadSprints();
    } catch (err) { toast.error(err.message || 'Failed to create sprint'); }
    finally { setSaving(false); }
  };

  const startSprint = async (id) => {
    try {
      await sprintsAPI.update(id, { status: 'Active' });
      toast.success('Sprint started!');
      loadSprints();
    } catch (err) { toast.error(err.message || 'Failed to start sprint'); }
  };

  const completeSprint = async (id) => {
    try {
      await sprintsAPI.complete(id, { carryForward: true });
      toast.success('Sprint completed!');
      loadSprints();
    } catch { toast.error('Failed to complete sprint'); }
  };

  const deleteSprint = async (id) => {
    if (!confirm('Delete this sprint?')) return;
    try {
      await sprintsAPI.delete(id);
      toast.success('Sprint deleted');
      loadSprints();
    } catch { toast.error('Failed to delete'); }
  };

  const viewMetrics = async (id) => {
    try {
      const res = await sprintsAPI.getMetrics(id);
      setMetrics(res.data);
      setShowMetrics(id);
    } catch { toast.error('Failed to load metrics'); }
  };

  const chartTooltipStyle = {
    contentStyle: { background: '#181C23', border: '1px solid #252A34', borderRadius: '8px', fontSize: '12px' },
    labelStyle: { color: '#A0A6B0' },
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="card" count={3} /></div>;

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Sprints</h1>
          <p className="page-subtitle">Plan and track your sprint cycles</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Sprint
        </button>
      </div>

      {sprints.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No sprints yet"
          description="Create your first sprint to start planning"
          action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4 inline mr-1" /> Create Sprint</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sprints.map(sprint => {
            const completionRate = sprint.taskCounts?.total > 0
              ? Math.round((sprint.taskCounts.done / sprint.taskCounts.total) * 100) : 0;

            return (
              <div key={sprint._id} className={cn(
                'bg-card border rounded-xl p-5 transition-all hover:border-border-hover',
                sprint.status === 'Active' ? 'border-accent/40' : 'border-border'
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {sprint.status === 'Active' && <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />}
                      <h3 className="text-base font-semibold text-foreground">{sprint.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{sprint.goal || 'No goal set'}</p>
                  </div>
                  <span className={cn(
                    'badge text-xs',
                    sprint.status === 'Active' ? 'bg-accent-muted text-accent' :
                    sprint.status === 'Completed' ? 'bg-success-muted text-success' :
                    sprint.status === 'Cancelled' ? 'bg-danger-muted text-danger' :
                    'bg-surface-3 text-muted-foreground'
                  )}>
                    {sprint.status}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground font-medium">{completionRate}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>

                {/* Task counts */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span>{sprint.taskCounts?.total || 0} total</span>
                  <span>·</span>
                  <span className="text-success">{sprint.taskCounts?.done || 0} done</span>
                  <span>·</span>
                  <span className="text-accent">{sprint.taskCounts?.inProgress || 0} active</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {sprint.status === 'Planning' && (
                    <button onClick={() => startSprint(sprint._id)} className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3">
                      <Play className="w-3 h-3" /> Start
                    </button>
                  )}
                  {sprint.status === 'Active' && (
                    <button onClick={() => completeSprint(sprint._id)} className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3 bg-success hover:bg-success/80">
                      <CheckCircle className="w-3 h-3" /> Complete
                    </button>
                  )}
                  <button onClick={() => viewMetrics(sprint._id)} className="btn-ghost text-xs flex items-center gap-1 py-1.5">
                    <BarChart3 className="w-3 h-3" /> Metrics
                  </button>
                  <button onClick={() => deleteSprint(sprint._id)} className="btn-ghost text-xs text-danger py-1.5 ml-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Sprint Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Sprint">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Sprint Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Sprint 1" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Goal</label>
            <textarea value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })}
              className="input-field resize-none" rows={2} placeholder="What do you want to achieve?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">End Date *</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="input-field" required />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Sprint'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Metrics Modal */}
      <Modal isOpen={!!showMetrics} onClose={() => setShowMetrics(null)} title="Sprint Metrics" maxWidth="max-w-2xl">
        {metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-surface-2 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{metrics.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
              <div className="text-center p-3 bg-surface-2 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{metrics.velocity}</p>
                <p className="text-xs text-muted-foreground">Velocity</p>
              </div>
              <div className="text-center p-3 bg-surface-2 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{metrics.completedTasks}/{metrics.totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
            </div>
            {metrics.burndown?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Burndown Chart</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={metrics.burndown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252A34" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                    <Tooltip {...chartTooltipStyle} />
                    <Line type="monotone" dataKey="remaining" stroke="#6366F1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ideal" stroke="#252A34" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
