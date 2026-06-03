import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Compass, BookOpen, Receipt, MessageSquare, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'My Bookings', icon: BookOpen, path: '/portal' },
  { label: 'My Invoices', icon: Receipt, path: '/portal/invoices' },
  { label: 'Messages', icon: MessageSquare, path: '/portal/messages' },
];

export default function ClientPortalLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Compass className="w-6 h-6 text-foreground" />
          <span className="font-semibold text-base tracking-tight">Safari Portal</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}