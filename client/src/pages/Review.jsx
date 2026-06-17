import { useState, useEffect } from 'react';
import { reviewsAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { formatDate } from '@/lib/utils';
import { ClipboardCheck, Loader2, Send, TrendingUp, CheckCircle2, Clock, Zap } from 'lucide-react';

export default function Review() {
  const toast = useToast();
  const [todayReview, setTodayReview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ wentWell: '', distractions: '', improvements: '', mood: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        reviewsAPI.getToday(),
        reviewsAPI.getAll()
      ]);
      if (todayRes.data) {
        setTodayReview(todayRes.data);
        setForm({
          wentWell: todayRes.data.wentWell || '',
          distractions: todayRes.data.distractions || '',
          improvements: todayRes.data.improvements || '',
          mood: todayRes.data.mood || ''
        });
      }
      setHistory(historyRes.data);
    } catch { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await reviewsAPI.create(form);
      setTodayReview(res.data);
      toast.success('Review saved!');
      loadData();
    } catch { toast.error('Failed to save review'); }
    finally { setSaving(false); }
  };

  const moods = [
    { value: 'great', emoji: '🤩', label: 'Great' },
    { value: 'good', emoji: '😊', label: 'Good' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'bad', emoji: '😔', label: 'Bad' },
    { value: 'terrible', emoji: '😫', label: 'Terrible' },
  ];

  if (loading) return <div className="page-container"><LoadingSkeleton type="card" count={2} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">End-of-Day Review</h1>
      <p className="page-subtitle">Reflect on your day and plan for improvement</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Review Form */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">🌟 What went well today?</label>
              <textarea value={form.wentWell} onChange={(e) => setForm({ ...form, wentWell: e.target.value })}
                className="input-field resize-none" rows={3} placeholder="Celebrate your wins..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">🎯 What distracted me?</label>
              <textarea value={form.distractions} onChange={(e) => setForm({ ...form, distractions: e.target.value })}
                className="input-field resize-none" rows={3} placeholder="Identify distractions..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">📈 What can I improve tomorrow?</label>
              <textarea value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })}
                className="input-field resize-none" rows={3} placeholder="Action items for improvement..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">How was your day?</label>
              <div className="flex gap-2">
                {moods.map(m => (
                  <button key={m.value} type="button"
                    onClick={() => setForm({ ...form, mood: m.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      form.mood === m.value ? 'border-accent bg-accent-muted' : 'border-border hover:border-border-hover'
                    }`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Save Review
            </button>
          </form>
        </div>

        {/* Today's Metrics */}
        <div className="space-y-4">
          {todayReview && (
            <>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{todayReview.completedCount}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{todayReview.pendingCount}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Productivity</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{todayReview.productivityScore}%</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Focus Hours</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{todayReview.focusHours}h</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* History */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Review History</h2>
      <div className="space-y-3">
        {history.map(review => (
          <div key={review._id} className="bg-card border border-border rounded-xl p-5 hover:border-border-hover transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-accent">{formatDate(review.date)}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{review.completedCount} done</span>
                <span>{review.productivityScore}% productive</span>
                {review.mood && <span>{moods.find(m => m.value === review.mood)?.emoji}</span>}
              </div>
            </div>
            {review.wentWell && <p className="text-sm text-foreground mb-2">🌟 {review.wentWell}</p>}
            {review.improvements && <p className="text-sm text-muted-foreground">📈 {review.improvements}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
