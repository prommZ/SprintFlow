import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/shared/Toast';
import { authAPI } from '@/services/api';
import { User, Lock, Loader2, Save } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    timezone: user?.timezone || 'UTC'
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.data);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container max-w-2xl">
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Manage your account settings</p>

      {/* User card */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-accent">{user?.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{user?.name}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-1">Member since {new Date(user?.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 mb-6">
        {[
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'password', label: 'Password', icon: Lock }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center ${
                tab === t.key ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
            <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <input type="email" value={user?.email || ''} className="input-field opacity-50" disabled />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
            <select value={profileForm.timezone} onChange={e => setProfileForm({ ...profileForm, timezone: e.target.value })} className="input-field">
              <option value="UTC">UTC</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
            <input type="password" value={passwordForm.currentPassword}
              onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
            <input type="password" value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="input-field" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
            <input type="password" value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="input-field" required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Change Password
          </button>
        </form>
      )}
    </div>
  );
}
