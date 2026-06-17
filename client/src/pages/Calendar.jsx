import { useState, useEffect } from 'react';
import { tasksAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import { cn, getPriorityColor } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('month');
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => { loadTasks(); }, [month, year]);

  const loadTasks = async () => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    try {
      const res = await tasksAPI.getAll({
        dueAfter: start.toISOString(),
        dueBefore: end.toISOString(),
        limit: 200
      });
      setTasks(res.data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1);
      days.push({ date: d, isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const days = getDaysInMonth();

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">View your tasks on a calendar</p>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prev} className="p-2 hover:bg-surface-3 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground min-w-[180px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={next} className="p-2 hover:bg-surface-3 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="btn-ghost text-sm">Today</button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(day => (
            <div key={day} className="py-3 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {days.map(({ date, isCurrentMonth }, i) => {
            const dayTasks = getTasksForDate(date);
            const today = isToday(date);

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[100px] lg:min-h-[120px] p-2 border-b border-r border-border/50 transition-colors',
                  !isCurrentMonth && 'opacity-30',
                  today && 'bg-accent/5'
                )}
              >
                <div className={cn(
                  'text-sm font-medium mb-1',
                  today ? 'text-accent' : 'text-foreground'
                )}>
                  <span className={cn(
                    'inline-flex items-center justify-center w-7 h-7 rounded-full',
                    today && 'bg-accent text-white'
                  )}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task._id}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer',
                        task.status === 'done' ? 'bg-success-muted text-success line-through' :
                        task.priority === 'High' ? 'bg-danger-muted text-danger' :
                        task.priority === 'Medium' ? 'bg-warning-muted text-warning' :
                        'bg-surface-3 text-muted-foreground'
                      )}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
