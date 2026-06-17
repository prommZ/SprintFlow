import { useState, useEffect } from 'react';
import { standupsAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Loader2, Send, ChevronDown } from 'lucide-react';

export default function Standup() {
  const toast = useToast();
  const [todayStandup, setTodayStandup] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ completedYesterday: '', planToday: '', blockers: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        standupsAPI.getToday(),
        standupsAPI.getAll()
      ]);
      if (todayRes.data) {
        setTodayStandup(todayRes.data);
        setForm({
          completedYesterday: todayRes.data.completedYesterday || '',
          planToday: todayRes.data.planToday || '',
          blockers: todayRes.data.blockers || ''
        });
      }
      setHistory(historyRes.data);
    } catch { toast.error('Failed to load standups'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await standupsAPI.create(form);
      toast.success(todayStandup ? 'Standup updated!' : 'Standup saved!');
      loadData();
    } catch { toast.error('Failed to save standup'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="card" count={2} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">Daily Standup</h1>
      <p className="page-subtitle">What's on your mind today?</p>

      {/* Today's Standup Form */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <h2 className="text-base font-semibold text-foreground">
            {todayStandup ? "Today's Standup (update)" : "Today's Standup"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              ✅ What did I complete yesterday?
            </label>
            <textarea
              value={form.completedYesterday}
              onChange={(e) => setForm({ ...form, completedYesterday: e.target.value })}
              className="input-field resize-none"
              rows={3}
              placeholder="List what you accomplished..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              📋 What will I do today?
            </label>
            <textarea
              value={form.planToday}
              onChange={(e) => setForm({ ...form, planToday: e.target.value })}
              className="input-field resize-none"
              rows={3}
              placeholder="List your plans for today..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              🚫 Any blockers?
            </label>
            <textarea
              value={form.blockers}
              onChange={(e) => setForm({ ...form, blockers: e.target.value })}
              className="input-field resize-none"
              rows={2}
              placeholder="Any impediments or blockers..."
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {todayStandup ? 'Update Standup' : 'Submit Standup'}
          </button>
        </form>
      </div>

      {/* History */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Standup History</h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">No standup history yet.</p>
      ) : (
        <div className="space-y-3">
          {history.map(standup => (
            <div key={standup._id} className="bg-card border border-border rounded-xl p-5 hover:border-border-hover transition-all">
              <p className="text-sm font-medium text-accent mb-3">{formatDate(standup.date)}</p>
              <div className="space-y-3 text-sm">
                {standup.completedYesterday && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">✅ Completed</p>
                    <p className="text-foreground whitespace-pre-wrap">{standup.completedYesterday}</p>
                  </div>
                )}
                {standup.planToday && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">📋 Planned</p>
                    <p className="text-foreground whitespace-pre-wrap">{standup.planToday}</p>
                  </div>
                )}
                {standup.blockers && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">🚫 Blockers</p>
                    <p className="text-foreground whitespace-pre-wrap">{standup.blockers}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
