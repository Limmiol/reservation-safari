import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalSearch from '../GlobalSearch';
import NotificationBell from '../NotificationBell';
import { CommandPalette, useCommandPalette } from '../CommandPalette';
import KeyboardShortcutsModal, { useKeyboardShortcuts } from '../KeyboardShortcutsModal';
import { Menu, Sun, Moon, Search, Keyboard } from 'lucide-react';

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return [dark, setDark];
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useDarkMode();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const navigate = useNavigate();
  const { open: helpOpen, setOpen: setHelpOpen } = useKeyboardShortcuts(navigate);

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media (min-width: 768px) {
          .main-content { margin-left: ${collapsed ? '64px' : '240px'}; }
        }
      `}</style>

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <KeyboardShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="main-content transition-all duration-300 min-h-screen flex flex-col">
        <header className="glass sticky top-0 z-20 border-b border-border">
          <div className="ios-safe-area py-3 sm:py-4 flex items-center gap-3 px-4">
            <button
              className="md:hidden flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <GlobalSearch />
            </div>

            {/* Command palette trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted border border-border rounded-lg transition-colors"
              title="Command palette (Ctrl+K)"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>⌘K</span>
            </button>

            {/* Shortcuts help trigger */}
            <button
              onClick={() => setHelpOpen(true)}
              className="hidden sm:flex items-center justify-center w-7 h-7 text-xs font-mono text-muted-foreground bg-muted/60 hover:bg-muted border border-border rounded-lg transition-colors"
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              ?
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4.5 h-4.5" style={{width:18,height:18}} /> : <Moon className="w-4.5 h-4.5" style={{width:18,height:18}} />}
            </button>

            <NotificationBell />
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
