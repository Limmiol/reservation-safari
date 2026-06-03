import React, { useState, useEffect, useRef } from 'react';
import { Bell, BookOpen, DollarSign, CalendarDays, Users, X, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'rs_notifications_read';

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { return new Set(); }
}

function saveReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function buildNotifications(bookings, clients) {
  const notes = [];

  // Recent bookings (created in last 7 days)
  const recent = [...bookings]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 20);

  recent.forEach(b => {
    const ageMs = Date.now() - new Date(b.created_date).getTime();
    if (ageMs < 7 * 24 * 3600 * 1000) {
      notes.push({
        id: `booking-new-${b.id}`,
        icon: BookOpen,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        title: 'New Booking',
        body: `${b.client_name || 'Client'} — ${b.package_name || 'Safari'}`,
        time: b.created_date,
        href: '/bookings',
      });
    }

    // Upcoming trips (start_date within next 30 days)
    if (b.start_date && b.status !== 'cancelled' && b.status !== 'completed') {
      const daysUntil = Math.ceil((new Date(b.start_date) - Date.now()) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 30) {
        notes.push({
          id: `booking-upcoming-${b.id}`,
          icon: CalendarDays,
          color: 'text-amber-500',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          title: daysUntil === 0 ? 'Trip Starting Today' : `Trip in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          body: `${b.client_name || 'Client'} — ${b.package_name || 'Safari'}`,
          time: b.start_date,
          href: '/bookings',
        });
      }
    }

    // Unpaid / balance due
    const balanceDue = Number(b.balance_due) || 0;
    if (balanceDue > 0 && b.status !== 'cancelled') {
      notes.push({
        id: `booking-payment-${b.id}`,
        icon: DollarSign,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        title: 'Payment Pending',
        body: `${b.client_name || 'Client'} owes $${balanceDue.toLocaleString()}`,
        time: b.updated_date || b.created_date,
        href: '/payments',
      });
    }
  });

  // New clients (last 7 days)
  clients.forEach(c => {
    const ageMs = Date.now() - new Date(c.created_date).getTime();
    if (ageMs < 7 * 24 * 3600 * 1000) {
      notes.push({
        id: `client-new-${c.id}`,
        icon: Users,
        color: 'text-green-500',
        bg: 'bg-green-50 dark:bg-green-950/30',
        title: 'New Client',
        body: c.full_name || c.name || c.email || 'Unknown',
        time: c.created_date,
        href: '/clients',
      });
    }
  });

  // Deduplicate + sort by time desc, max 30
  const seen = new Set();
  return notes
    .filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; })
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 30);
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(getReadIds);
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [bookings, clients] = await Promise.all([
          base44.entities.Booking.list('-created_date', 100),
          base44.entities.Client.list('-created_date', 100),
        ]);
        if (!cancelled) setNotifications(buildNotifications(bookings, clients));
      } catch {}
    }
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const all = new Set(notifications.map(n => n.id));
    setReadIds(all);
    saveReadIds(all);
  };

  const markRead = (id) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
          style={{ maxHeight: '480px', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 px-2 py-1 rounded hover:bg-accent transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const isRead = readIds.has(n.id);
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => { markRead(n.id); setOpen(false); window.location.href = n.href; }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors border-b border-border/50 last:border-0",
                      !isRead && "bg-primary/5"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", n.bg)}>
                      <Icon className={cn("w-4 h-4", n.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-semibold leading-tight", isRead ? "text-muted-foreground" : "text-foreground")}>
                          {n.title}
                        </p>
                        {!isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{timeAgo(n.time)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
