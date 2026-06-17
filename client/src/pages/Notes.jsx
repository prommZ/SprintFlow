import { useState, useEffect } from 'react';
import { notesAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { formatRelativeDate, cn } from '@/lib/utils';
import { Plus, FileText, Loader2, Trash2, Pin, PinOff, Search, Edit3 } from 'lucide-react';

const CATEGORIES = ['All', 'General', 'Ideas', 'Study', 'Project', 'Meeting'];

export default function Notes() {
  const toast = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [form, setForm] = useState({ title: '', content: '', category: 'General', tags: '' });

  useEffect(() => { loadNotes(); }, [search, category]);

  const loadNotes = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      const res = await notesAPI.getAll(params);
      setNotes(res.data);
    } catch { toast.error('Failed to load notes'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      if (editNote) {
        await notesAPI.update(editNote._id, data);
        toast.success('Note updated');
      } else {
        await notesAPI.create(data);
        toast.success('Note created!');
      }
      setShowModal(false);
      setEditNote(null);
      setForm({ title: '', content: '', category: 'General', tags: '' });
      loadNotes();
    } catch { toast.error('Failed to save note'); }
    finally { setSaving(false); }
  };

  const togglePin = async (id) => {
    try {
      await notesAPI.togglePin(id);
      loadNotes();
    } catch { toast.error('Failed to pin'); }
  };

  const deleteNote = async (id) => {
    if (!confirm('Delete this note?')) return;
    try {
      await notesAPI.delete(id);
      toast.success('Note deleted');
      loadNotes();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (note) => {
    setEditNote(note);
    setForm({ title: note.title, content: note.content || '', category: note.category, tags: note.tags?.join(', ') || '' });
    setShowModal(true);
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="card" count={6} /></div>;

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">Your personal knowledge vault</p>
        </div>
        <button onClick={() => { setEditNote(null); setForm({ title: '', content: '', category: 'General', tags: '' }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-10" placeholder="Search notes..." />
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                category === cat ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground hover:bg-surface-3'
              )}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Start capturing your ideas and knowledge"
          action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4 inline mr-1" /> Create Note</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <div key={note._id} className="bg-card border border-border rounded-xl p-5 hover:border-border-hover transition-all group cursor-pointer"
              onClick={() => openEdit(note)}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground truncate flex-1">{note.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => togglePin(note._id)} className="p-1 hover:bg-surface-3 rounded transition-colors">
                    {note.isPinned ? <PinOff className="w-3.5 h-3.5 text-accent" /> : <Pin className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteNote(note._id)} className="p-1 hover:bg-danger-muted rounded text-muted-foreground hover:text-danger transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {note.isPinned && (
                <div className="flex items-center gap-1 mb-2">
                  <Pin className="w-3 h-3 text-accent" />
                  <span className="text-[10px] text-accent">Pinned</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                {note.content?.replace(/<[^>]*>/g, '').slice(0, 150) || 'No content'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2 py-0.5 bg-surface-3 rounded text-muted-foreground">{note.category}</span>
                <span className="text-[10px] text-muted-foreground">{formatRelativeDate(note.updatedAt)}</span>
              </div>
              {note.tags?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {note.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-accent-muted rounded text-accent">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditNote(null); }} title={editNote ? 'Edit Note' : 'New Note'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-field" placeholder="Note title" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tags</label>
              <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                className="input-field" placeholder="tag1, tag2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Content</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              className="input-field resize-none font-mono text-sm" rows={12} placeholder="Write your note here..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditNote(null); }} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editNote ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
