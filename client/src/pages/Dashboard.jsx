import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/shared/Toast';
import { analyticsAPI, tasksAPI } from '@/services/api';
import { getGreeting, getPriorityColor, getStatusColor, formatDate } from '@/lib/utils';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import Modal from '@/components/shared/Modal';
import {
  CheckCircle2, Clock, ListTodo, Loader2, Rocket, Plus,
  TrendingUp, Zap, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [metrics, setMetrics] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTask, setQuickTask] = useState({ title: '', priority: 'Medium', dueDate: new Date().toISOString().split('T')[0] });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const [metricsRes, todayRes] = await Promise.all([
        analyticsAPI.getDashboard({ today: todayStr }),
        tasksAPI.getToday({ today: todayStr })
      ]);
      setMetrics(metricsRes.data);
      setTodayTasks(todayRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTask.title.trim()) return;
    setCreating(true);
    try {
      await tasksAPI.create({ ...quickTask, status: 'todo' });
      toast.success('Task created!');
      setQuickTask({ title: '', priority: 'Medium', dueDate: new Date().toISOString().split('T')[0] });
      setShowQuickAdd(false);
      loadData();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="mb-8">
          <div className="h-8 bg-surface-3 rounded w-64 mb-2 animate-pulse" />
          <div className="h-5 bg-surface-3 rounded w-48 animate-pulse" />
        </div>
        <LoadingSkeleton type="stats" count={4} />
        <div className="mt-8">
          <LoadingSkeleton type="list" count={4} />
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Today's Tasks",
      value: metrics?.today?.tasks || 0,
      icon: ListTodo,
      color: 'text-accent',
      bgColor: 'bg-accent-muted'
    },
    {
      label: 'Completed',
      value: metrics?.today?.completed || 0,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success-muted'
    },
    {
      label: 'In Progress',
      value: metrics?.tasks?.inProgress || 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning-muted'
    },
    {
      label: 'Focus Hours',
      value: `${metrics?.focusHoursToday || 0}h`,
      icon: Zap,
      color: 'text-accent',
      bgColor: 'bg-accent-muted'
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's your productivity snapshot for today</p>
        </div>
        <button onClick={() => setShowQuickAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`w-9 h-9 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Today's Tasks</h2>
            <Link to="/tasks" className="text-sm text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <ListTodo className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tasks for today</p>
              <button onClick={() => setShowQuickAdd(true)} className="btn-primary mt-4">
                <Plus className="w-4 h-4 inline mr-1" /> Add Task
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 8).map((task) => (
                <Link
                  key={task._id}
                  to="/tasks"
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-border-hover hover:bg-card-hover transition-all group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'High' ? 'bg-danger' :
                    task.priority === 'Medium' ? 'bg-warning' : 'bg-success'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                  </div>
                  <span className={`badge text-xs ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Productivity Score */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Productivity</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#252A34" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="#6366F1" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(metrics?.today?.productivity || 0) * 2.64} 264`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">
                    {metrics?.today?.productivity || 0}%
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {metrics?.today?.completed || 0} of {metrics?.today?.tasks || 0} tasks completed
            </p>
          </div>

          {/* Active Sprint */}
          {metrics?.activeSprint && (
            <Link to="/sprints" className="block bg-card border border-border rounded-xl p-5 hover:border-border-hover transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-medium text-foreground">Active Sprint</h3>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{metrics.activeSprint.name}</p>
              <p className="text-xs text-muted-foreground mb-3">{metrics.activeSprint.goal}</p>
              <div className="text-xs text-muted-foreground">
                {formatDate(metrics.activeSprint.startDate)} → {formatDate(metrics.activeSprint.endDate)}
              </div>
            </Link>
          )}

          {/* Carried Forward */}
          {metrics?.carriedForward > 0 && (
            <div className="bg-warning-muted border border-warning/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Carried Forward</p>
                <p className="text-xs text-warning/80 mt-1">
                  {metrics.carriedForward} task{metrics.carriedForward > 1 ? 's' : ''} from previous days
                </p>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { to: '/standup', label: 'Daily Standup', icon: '📝' },
                { to: '/review', label: 'End-of-Day Review', icon: '📊' },
                { to: '/board', label: 'Scrum Board', icon: '📋' },
                { to: '/habits', label: 'Track Habits', icon: '🔥' }
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 transition-colors group"
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {link.label}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <Modal isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="Quick Add Task">
        <form onSubmit={handleQuickAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Title</label>
            <input
              type="text"
              value={quickTask.title}
              onChange={(e) => setQuickTask({ ...quickTask, title: e.target.value })}
              className="input-field"
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
              <select
                value={quickTask.priority}
                onChange={(e) => setQuickTask({ ...quickTask, priority: e.target.value })}
                className="input-field"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Due Date</label>
              <input
                type="date"
                value={quickTask.dueDate}
                onChange={(e) => setQuickTask({ ...quickTask, dueDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowQuickAdd(false)} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
