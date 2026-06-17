import { useState, useEffect } from 'react';
import { analyticsAPI, focusAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Zap, AlertTriangle, CheckCircle2, Clock, Target, RefreshCw } from 'lucide-react';

const chartTooltip = {
  contentStyle: { background: '#181C23', border: '1px solid #252A34', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#A0A6B0' }
};

export default function Analytics() {
  const toast = useToast();
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [focusStats, setFocusStats] = useState(null);
  const [sprintPerf, setSprintPerf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("[Analytics] Component mounted");
    loadData();
  }, []);

  const loadData = async () => {
    console.log("[Analytics] loadData triggered");
    try {
      setError(null);
      const todayStr = new Date().toLocaleDateString('en-CA');
      console.log("[Analytics] Requesting stats aligned with date:", todayStr);

      const [metricsRes, trendsRes, workloadRes, focusRes, sprintRes] = await Promise.all([
        analyticsAPI.getDashboard({ today: todayStr }),
        analyticsAPI.getProductivity({ days: 14, today: todayStr }),
        analyticsAPI.getWorkload({ today: todayStr }),
        focusAPI.getStats({ today: todayStr }),
        analyticsAPI.getSprintPerformance({ today: todayStr })
      ]);

      console.log("[Analytics] API responses loaded successfully:", {
        metrics: metricsRes?.data,
        trendsCount: trendsRes?.data?.length,
        trends: trendsRes?.data,
        workload: workloadRes?.data,
        focusStats: focusRes?.data,
        sprintPerf: sprintRes?.data
      });

      setMetrics(metricsRes.data);
      setTrends(trendsRes.data);
      setWorkload(workloadRes.data);
      setFocusStats(focusRes.data);
      setSprintPerf(sprintRes.data);
    } catch (err) {
      console.error("[Analytics] Error loading analytics data:", err);
      setError("Failed to load analytics data. Please check your connection or database status.");
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="stats" count={4} /></div>;

  if (error) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-danger-muted text-danger rounded-full flex items-center justify-center mb-4 text-3xl">
          ⚠️
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Failed to load Analytics</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            loadData();
          }}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Analytics</h1>
      <p className="page-subtitle">Your productivity insights at a glance</p>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tasks', value: metrics?.tasks?.total || 0, icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent-muted' },
          { label: 'Completed', value: metrics?.tasks?.completed || 0, icon: Target, color: 'text-success', bg: 'bg-success-muted' },
          { label: 'In Progress', value: metrics?.tasks?.inProgress || 0, icon: Clock, color: 'text-warning', bg: 'bg-warning-muted' },
          { label: 'Focus Today', value: `${metrics?.focusHoursToday || 0}h`, icon: Zap, color: 'text-accent', bg: 'bg-accent-muted' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Productivity Trend */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Task Completion Trend (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252A34" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A0A6B0' }}
                tickFormatter={v => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 10, fill: '#A0A6B0' }} />
              <Tooltip {...chartTooltip} />
              <Area type="monotone" dataKey="completed" stroke="#34D399" fill="#34D39920" strokeWidth={2} />
              <Area type="monotone" dataKey="created" stroke="#6366F1" fill="#6366F120" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-success rounded-full" /> Completed</span>
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-accent rounded-full" /> Created</span>
          </div>
        </div>

        {/* Focus Hours */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Focus Hours (This Week)</h3>
          {focusStats?.dailyBreakdown && (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={focusStats.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252A34" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="hours" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{focusStats.today?.hours || 0}h</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{focusStats.week?.hours || 0}h</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{focusStats.month?.hours || 0}h</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sprint Velocity */}
        {sprintPerf?.sprints?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Sprint Velocity</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sprintPerf.sprints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252A34" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                <YAxis tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="velocity" fill="#34D399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Average velocity: <span className="text-foreground font-medium">{sprintPerf.avgVelocity}</span>
            </p>
          </div>
        )}

        {/* Workload Analysis */}
        {workload && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">7-Day Workload</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workload.dailyWorkload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252A34" />
                <XAxis dataKey="dayName" tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                <YAxis tick={{ fontSize: 10, fill: '#A0A6B0' }} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="estimatedHours" radius={[4, 4, 0, 0]}>
                  {workload.dailyWorkload.map((entry, i) => (
                    <Cell key={i} fill={entry.isOverloaded ? '#F87171' : '#6366F1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Warnings */}
            {workload.warnings?.length > 0 && (
              <div className="mt-4 space-y-2">
                {workload.warnings.slice(0, 3).map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{w.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
