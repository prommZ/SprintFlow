import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, CheckSquare, Columns3, Calendar, Rocket,
  MessageSquare, ClipboardCheck, Repeat, Target, FileText,
  BarChart3, User, ChevronLeft, ChevronRight, Zap, LogOut, Archive
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { tasksAPI } from '@/services/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/board', label: 'Board', icon: Columns3 },
  { path: '/sprints', label: 'Sprints', icon: Rocket },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { divider: true },
  { path: '/standup', label: 'Standup', icon: MessageSquare },
  { path: '/review', label: 'Review', icon: ClipboardCheck },
  { divider: true },
  { path: '/habits', label: 'Habits', icon: Repeat },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/notes', label: 'Notes', icon: FileText },
  { path: '/archive', label: 'Archive', icon: Archive },
  { divider: true },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [archiveCount, setArchiveCount] = useState(0);

  useEffect(() => {
    const fetchArchiveCount = async () => {
      try {
        const res = await tasksAPI.getArchived();
        setArchiveCount(res.data?.length || 0);
      } catch (err) {
        console.error("Failed to load archive count", err);
      }
    };
    if (user) {
      // Load once on mount — no polling interval
      fetchArchiveCount();
      // Refresh only when an archive/restore action fires this event
      window.addEventListener('archiveUpdated', fetchArchiveCount);
      return () => {
        window.removeEventListener('archiveUpdated', fetchArchiveCount);
      };
    }
  }, [user]);

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-card border-r border-border z-50 flex flex-col transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-[240px]',
          'lg:translate-x-0',
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-foreground">SprintFlow</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Collapse button - desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card-hover transition-all z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item, i) => {
            if (item.divider) {
              return <div key={i} className="my-3 border-t border-border/50" />;
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
                className={({ isActive }) =>
                  cn('sidebar-link flex items-center justify-between', isActive && 'active', collapsed && 'justify-center px-2')
                }
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {!collapsed && item.path === '/archive' && archiveCount > 0 && (
                  <span className="text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full">
                    {archiveCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3 space-y-1">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn('sidebar-link', isActive && 'active', collapsed && 'justify-center px-2')
            }
            title={collapsed ? 'Profile' : undefined}
          >
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-accent">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </NavLink>
          <button
            onClick={logout}
            className={cn('sidebar-link w-full text-danger hover:bg-danger-muted', collapsed && 'justify-center px-2')}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
