import { useState, useEffect } from 'react';
import { tasksAPI, focusAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { getPriorityColor, getStatusColor, formatDate, STATUSES, PRIORITIES, formatStatusLabel } from '@/lib/utils';
import {
  Plus, Search, Filter, MoreHorizontal, Edit3, Trash2,
  Archive, CheckSquare, Loader2, ChevronDown, X, Calendar, Zap
} from 'lucide-react';

export default function Tasks() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const defaultForm = {
    title: '', description: '', priority: 'Medium', status: 'todo',
    dueDate: '', startTime: '', endTime: '', tags: '',
    notes: '', estimatedHours: '', actualHours: '', eisenhowerCategory: ''
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    loadTasks();
    loadActiveSession();
  }, [search, filterStatus, filterPriority, sort]);

  useEffect(() => {
    let interval = null;
    if (activeSession) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const loadActiveSession = async () => {
    try {
      const res = await focusAPI.getActive();
      setActiveSession(res.data);
      if (res.data) {
        const start = new Date(res.data.startTime);
        const diff = Math.floor((new Date() - start) / 1000);
        setElapsedSeconds(diff > 0 ? diff : 0);
      }
    } catch (err) {
      console.error("Failed to load active focus session", err);
    }
  };

  const handleStartFocus = async (taskId) => {
    try {
      await focusAPI.start({ taskId });
      toast.success("Focus session started");
      loadActiveSession();
    } catch (err) {
      toast.error(err.message || "Failed to start focus session");
    }
  };

  const handleStopFocus = async () => {
    try {
      await focusAPI.end();
      toast.success("Focus session stopped and saved");
      setActiveSession(null);
      loadTasks();
    } catch (err) {
      toast.error(err.message || "Failed to stop focus session");
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadTasks = async () => {
    try {
      const params = { sort };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await tasksAPI.getAll(params);
      setTasks(res.data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title, description: task.description || '',
      priority: task.priority, status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      startTime: task.startTime || '', endTime: task.endTime || '',
      tags: task.tags?.join(', ') || '', notes: task.notes || '',
      estimatedHours: task.estimatedHours || '', actualHours: task.actualHours || '',
      eisenhowerCategory: task.eisenhowerCategory || ''
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : 0,
        actualHours: form.actualHours ? parseFloat(form.actualHours) : 0,
        dueDate: form.dueDate || null
      };
      if (editingTask) {
        await tasksAPI.update(editingTask._id, data);
        toast.success('Task updated');
      } else {
        await tasksAPI.create(data);
        toast.success('Task created');
      }
      setShowModal(false);
      loadTasks();
    } catch { toast.error('Failed to save task'); }
    finally { setSaving(false); }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      loadTasks();
    } catch { toast.error('Failed to delete'); }
    setMenuOpen(null);
  };

  const archiveTask = async (id) => {
    try {
      await tasksAPI.archive(id);
      toast.success('Task archived');
      loadTasks();
      window.dispatchEvent(new Event('archiveUpdated'));
    } catch { toast.error('Failed to archive'); }
    setMenuOpen(null);
  };

  const updateStatus = async (id, status) => {
    try {
      await tasksAPI.update(id, { status });
      toast.success(`Moved to ${status}`);
      loadTasks();
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="list" count={6} /></div>;

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Active Focus Session Widget */}
      {activeSession && (
        <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Active Focus Session: {activeSession.taskId?.title || 'General Focus'}
              </p>
              <p className="text-xs text-muted-foreground">
                Time elapsed: <span className="font-mono text-accent font-semibold">{formatTime(elapsedSeconds)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleStopFocus}
            className="w-full sm:w-auto px-4 py-2 bg-danger text-white hover:bg-danger-hover rounded-lg text-sm font-medium transition-colors"
          >
            Stop Focus Session
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search tasks..."
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input-field w-auto">
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field w-auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due Date</option>
          <option value="title">Title</option>
        </select>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create your first task to get started"
          action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4 inline mr-1" /> Create Task</button>}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task._id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-border-hover hover:bg-card-hover transition-all group">
              {/* Priority dot */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                task.priority === 'High' ? 'bg-danger' : task.priority === 'Medium' ? 'bg-warning' : 'bg-success'
              }`} />

              {/* Content */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(task)}>
                <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.estimatedHours > 0 && (
                    <span className="text-xs text-muted-foreground">{task.estimatedHours}h est.</span>
                  )}
                  {task.actualHours > 0 && (
                    <span className="text-xs text-success">{Math.round(task.actualHours * 10) / 10}h actual</span>
                  )}
                </div>
              </div>

              {/* Focus action button */}
              <div className="flex-shrink-0 mr-2">
                {activeSession?.taskId?._id === task._id || activeSession?.taskId === task._id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopFocus();
                    }}
                    className="py-1 px-2.5 bg-danger-muted text-danger hover:bg-danger/20 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    title="Stop Focus"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                    </span>
                    Stop Focus ({formatTime(elapsedSeconds)})
                  </button>
                ) : (
                  !activeSession && task.status !== 'done' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartFocus(task._id);
                      }}
                      className="py-1 px-2.5 hover:bg-accent/15 text-accent rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs"
                      title="Start Focus"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Start Focus
                    </button>
                  )
                )}
              </div>

              {/* Tags */}
              <div className="hidden md:flex items-center gap-1">
                {task.tags?.slice(0, 2).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-surface-3 rounded text-muted-foreground">{tag}</span>
                ))}
              </div>

              {/* Status */}
              <select
                value={task.status}
                onChange={(e) => updateStatus(task._id, e.target.value)}
                className={`badge text-xs cursor-pointer border-0 outline-none ${getStatusColor(task.status)}`}
              >
                {STATUSES.map(s => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
              </select>

              {/* Actions */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === task._id ? null : task._id)}
                  className="p-1 hover:bg-surface-3 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                {menuOpen === task._id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-36 animate-scale-in">
                      <button onClick={() => openEdit(task)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-surface-3">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => archiveTask(task._id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-surface-3">
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </button>
                      <button onClick={() => deleteTask(task._id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger-muted">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTask ? 'Edit Task' : 'New Task'} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field" placeholder="Task title" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none" rows={3} placeholder="Description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                {STATUSES.map(s => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Estimated Hours</label>
              <input type="number" step="0.5" min="0" value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Actual Hours</label>
              <input type="number" step="0.5" min="0" value={form.actualHours}
                onChange={(e) => setForm({ ...form, actualHours: e.target.value })} className="input-field" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Tags</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input-field" placeholder="tag1, tag2, tag3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Eisenhower Category</label>
            <select value={form.eisenhowerCategory} onChange={(e) => setForm({ ...form, eisenhowerCategory: e.target.value })} className="input-field">
              <option value="">None</option>
              <option value="urgent-important">Urgent & Important</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
              <option value="later">Later</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field resize-none" rows={2} placeholder="Additional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
