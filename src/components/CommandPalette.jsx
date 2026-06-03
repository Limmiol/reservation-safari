import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, CalendarDays, BookOpen, FileText, Receipt, CreditCard,
  Ticket, Plane, ClipboardList, MessageSquare, Settings, Bot, Globe, Truck, Wrench,
  Briefcase, Map, DollarSign, Layers, TrendingDown, TrendingUp, Newspaper, PenSquare,
  MapPin, Zap, Search, ArrowRight, User, BarChart2, X, Library, Sparkles, FileUp, Sun, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_PAGES = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Analytics', path: '/analytics', icon: BarChart2, group: 'Navigation' },
  { label: 'Clients', path: '/clients', icon: Users, group: 'Navigation' },
  { label: 'Packages', path: '/packages', icon: Package, group: 'Navigation' },
  { label: 'Bookings', path: '/bookings', icon: BookOpen, group: 'Navigation' },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays, group: 'Navigation' },
  { label: 'Safari Library', path: '/safari-library', icon: Library, group: 'Navigation' },
  { label: 'Safari Quote Builder', path: '/safari-quote-builder', icon: Sparkles, group: 'Navigation' },
  { label: 'Trip Planner (natural language)', path: '/trip-planner', icon: Wand2, group: 'Tools' },
  { label: 'Package Import (PDF/Excel)', path: '/package-import', icon: FileUp, group: 'Tools' },
  { label: 'When to Visit', path: '/when-to-visit', icon: Sun, group: 'Tools' },
  { label: 'Quotes', path: '/quotes', icon: FileText, group: 'Operations' },
  { label: 'Invoices', path: '/invoices', icon: Receipt, group: 'Operations' },
  { label: 'Payments', path: '/payments', icon: CreditCard, group: 'Operations' },
  { label: 'Vouchers', path: '/vouchers', icon: Ticket, group: 'Operations' },
  { label: 'Flights', path: '/flights', icon: Plane, group: 'Operations' },
  { label: 'Manifests', path: '/manifests', icon: ClipboardList, group: 'Operations' },
  { label: 'Messages', path: '/messages', icon: MessageSquare, group: 'Operations' },
  { label: 'Income', path: '/income', icon: TrendingUp, group: 'Finance' },
  { label: 'Expenses', path: '/expenses', icon: TrendingDown, group: 'Finance' },
  { label: 'Financial Statements', path: '/financial-statements', icon: FileText, group: 'Finance' },
  { label: 'Vehicles', path: '/vehicles', icon: Truck, group: 'Fleet' },
  { label: 'Drivers', path: '/drivers', icon: Users, group: 'Fleet' },
  { label: 'Equipment', path: '/equipment', icon: Wrench, group: 'Fleet' },
  { label: 'Resource Scheduler', path: '/resource-scheduler', icon: Layers, group: 'Fleet' },
  { label: 'Availability', path: '/availability', icon: Map, group: 'Fleet' },
  { label: 'OTA Channels', path: '/otas', icon: Globe, group: 'Admin' },
  { label: 'Automations', path: '/automations', icon: Zap, group: 'Admin' },
  { label: 'Users', path: '/users', icon: Users, group: 'Admin' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'Admin' },
  { label: 'Profile', path: '/profile', icon: User, group: 'Admin' },
  { label: 'Blog', path: '/blog', icon: Newspaper, group: 'Content' },
  { label: 'Testimonials', path: '/testimonials', icon: MessageSquare, group: 'Content' },
  { label: 'Itinerary Manager', path: '/itinerary-manager', icon: MapPin, group: 'Content' },
  { label: 'Currency Converter', path: '/currency-converter', icon: DollarSign, group: 'Tools' },
  { label: 'Booking AI Agent', path: '/booking-ai', icon: Bot, group: 'Tools' },
];

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_PAGES.slice(0, 8);
    const q = query.toLowerCase();
    return ALL_PAGES.filter(p =>
      p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [query]);

  useEffect(() => { setActiveIdx(0); }, [filtered]);
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); }
  }, [open]);

  const go = (path) => { navigate(path); onClose(); };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[activeIdx]) go(filtered[activeIdx].path);
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  const groups = [...new Set(filtered.map(p => p.group))];

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, features…"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground rounded border border-border">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
          ) : (
            groups.map(group => {
              const items = filtered.filter(p => p.group === group);
              let globalIdx = filtered.indexOf(items[0]);
              return (
                <div key={group}>
                  {!query && (
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group}</div>
                  )}
                  {items.map((item) => {
                    const idx = filtered.indexOf(item);
                    const isActive = idx === activeIdx;
                    return (
                      <button
                        key={item.path}
                        onClick={() => go(item.path)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                          isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
                        )}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {query && <span className="text-xs text-muted-foreground">{item.group}</span>}
                        {isActive && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

// Hook to trigger Cmd+K
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
