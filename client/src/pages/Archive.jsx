import { useState, useEffect } from 'react';
import { tasksAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { getPriorityColor, getStatusColor, formatDate, STATUSES, PRIORITIES, formatStatusLabel } from '@/lib/utils';
import { Search, RotateCcw, Trash2, Calendar, Archive, RefreshCw } from 'lucide-react';

export default function ArchivePage() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    loadArchivedTasks();
  }, [search, filterStatus, filterPriority, sort]);

  const loadArchivedTasks = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (sort) params.sort = sort;

      const res = await tasksAPI.getArchived(params);
      setTasks(res.data || []);
    } catch (err) {
      toast.error('Failed to load archived tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    setActionInProgress(id);
    try {
      await tasksAPI.restore(id);
      toast.success('Task restored successfully');
      loadArchivedTasks();
      // Dispatch a custom event to notify Sidebar to reload count
      window.dispatchEvent(new Event('archiveUpdated'));
    } catch (err) {
      toast.error(err.message || 'Failed to restore task');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeletePermanently = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) return;
    setActionInProgress(id);
    try {
      await tasksAPI.delete(id);
      toast.success('Task permanently deleted');
      loadArchivedTasks();
      // Dispatch a custom event to notify Sidebar to reload count
      window.dispatchEvent(new Event('archiveUpdated'));
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="list" count={6} /></div>;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="page-title">Archived Tasks</h1>
        <span className="bg-surface-3 text-muted-foreground text-xs font-bold px-2.5 py-1 rounded-full border border-border">
          {tasks.length}
        </span>
      </div>
      <p className="page-subtitle mb-6 -mt-4">Search, restore, or permanently delete archived items.</p>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search archived tasks..."
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field w-auto">
          <option value="">All Original Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input-field w-auto">
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field w-auto">
          <option value="newest">Archived Newest</option>
          <option value="oldest">Archived Oldest</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {/* Tasks Table/List */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No archived tasks"
          description="Tasks you archive will appear here"
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-3.5">Task Title</th>
                  <th className="px-6 py-3.5">Previous Status</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5">Archived Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-surface-3/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate" title={task.title}>
                      {task.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge text-xs ${getStatusColor(task.previousStatus || task.status)}`}>
                        {formatStatusLabel(task.previousStatus || task.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {formatDate(task.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {task.archivedAt ? formatDate(task.archivedAt) : formatDate(task.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(task._id)}
                          disabled={actionInProgress === task._id}
                          className="p-1.5 hover:bg-success-muted text-success rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Restore task"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeletePermanently(task._id)}
                          disabled={actionInProgress === task._id}
                          className="p-1.5 hover:bg-danger-muted text-danger rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
