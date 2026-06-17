import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'
        )}
      >
        {/* Mobile header */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 hover:bg-surface-3 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <span className="ml-3 text-lg font-semibold text-foreground">SprintFlow</span>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
