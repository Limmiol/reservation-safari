import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, CreditCard, Package, ArrowRight, TrendingUp, TrendingDown,
  Plus, FileText, Receipt, AlertTriangle, Clock, CheckCircle2,
  CalendarDays, BarChart2, Zap, Globe, Activity, Star, ChevronRight, ScanLine, Radar,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import RevenueChart from '@/components/charts/RevenueChart';
import PackageChart from '@/components/charts/PackageChart';
import { formatCurrency, formatDate } from '@/lib/helpers';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function splitByPeriod(items, dateField = 'created_date') {
  const now = Date.now();
  const d30 = now - 30 * 86400000;
  const d60 = now - 60 * 86400000;
  const recent = items.filter(i => new Date(i[dateField]).getTime() >= d30);
  const prior  = items.filter(i => {
    const t = new Date(i[dateField]).getTime();
    return t >= d60 && t < d30;
  });
  return { recent, prior };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon: Icon, trend, trendLabel, color = 'primary', to }) {
  const colorMap = {
    primary : 'bg-primary/10 text-primary',
    green   : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber   : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    rose    : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  };
  const inner = (
    <div className="rs-panel rs-panel-accent p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.4)]">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color]} group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight rs-mono">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trendLabel && <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mt-1 rs-mono">{trendLabel}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

const SCAN_LABELS = {
  pickup:        'Pickup',
  park_entry:    'Park entry',
  lodge_checkin: 'Lodge check-in',
  dropoff:       'Drop-off',
};

function ScanFeedItem({ scan }) {
  const ago = (() => {
    const ms = Date.now() - new Date(scan.created_date).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();
  return (
    <Link to={`/bookings/${scan.booking_id}`} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors">
      <span className="rs-led rs-led-live flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{SCAN_LABELS[scan.scan_type] || scan.scan_type}</p>
        <p className="text-xs text-muted-foreground truncate">
          <span className="rs-mono text-primary">{scan.booking_ref || '—'}</span>
          {scan.scanned_by_name && <> · {scan.scanned_by_name}</>}
        </p>
      </div>
      <span className="text-[11px] rs-mono text-muted-foreground flex-shrink-0">{ago}</span>
    </Link>
  );
}

function QuickAction({ icon: Icon, label, to, color }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200 group`}>
      <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
    </Link>
  );
}

function ActivityItem({ booking }) {
  const statusColor = {
    confirmed : 'bg-green-500',
    pending   : 'bg-amber-400',
    cancelled : 'bg-red-500',
    in_progress: 'bg-blue-500',
    completed : 'bg-gray-400',
  };
  return (
    <Link to={`/bookings/${booking.id}`} className="flex items-center gap-3 py-2.5 hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[booking.status] || 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{booking.client_name}</p>
        <p className="text-xs text-muted-foreground truncate">{booking.package_name} · {booking.booking_ref}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-semibold text-foreground">{formatCurrency(booking.total_amount, booking.currency)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(booking.created_date)}</p>
      </div>
    </Link>
  );
}

function UpcomingTrip({ booking }) {
  const days = Math.ceil((new Date(booking.start_date) - Date.now()) / 86400000);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary leading-none">{days}</span>
        <span className="text-[9px] text-primary/70 uppercase">days</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{booking.client_name}</p>
        <p className="text-xs text-muted-foreground truncate">{booking.package_name}</p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(booking.start_date)}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: bookings  = [] } = useQuery({ queryKey: ['bookings'],  queryFn: () => base44.entities.Booking.list('-created_date', 200) });
  const { data: clients   = [] } = useQuery({ queryKey: ['clients'],   queryFn: () => base44.entities.Client.list('-created_date', 200) });
  const { data: payments  = [] } = useQuery({ queryKey: ['payments'],  queryFn: () => base44.entities.Payment.list('-created_date', 200) });
  const { data: packages  = [] } = useQuery({ queryKey: ['packages'],  queryFn: () => base44.entities.Package.list() });
  const { data: invoices  = [] } = useQuery({ queryKey: ['invoices'],  queryFn: () => base44.entities.Invoice.list('-created_date', 200) });
  const { data: quotes    = [] } = useQuery({ queryKey: ['quotes'],    queryFn: () => base44.entities.Quote.list('-created_date', 100) });
  const { data: scans     = [] } = useQuery({
    queryKey: ['booking-scans-all'],
    queryFn: () => base44.entities.BookingScan.list('-created_date', 10),
    refetchInterval: 15000,
  });

  // ── KPI calculations ──
  const confirmedPayments = payments.filter(p => ['confirmed', 'paid'].includes(p.status));
  const totalRevenue = confirmedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const { recent: recentBookings30, prior: priorBookings30 } = splitByPeriod(bookings);
  const { recent: recentClients30, prior: priorClients30 }   = splitByPeriod(clients);
  const { recent: recentPayments30, prior: priorPayments30 } = splitByPeriod(confirmedPayments);

  const rev30   = recentPayments30.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const prevRev = priorPayments30.reduce((s, p)  => s + (Number(p.amount) || 0), 0);

  const activeBookings = bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length;

  // ── Upcoming trips (next 14 days, confirmed) ──
  const today  = new Date().toISOString().slice(0, 10);
  const in14   = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const upcoming = bookings
    .filter(b => b.status === 'confirmed' && b.start_date >= today && b.start_date <= in14)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  // ── Overdue invoices ──
  const overdueInvoices = invoices.filter(i => i.status === 'overdue' || (i.due_date && i.due_date < today && i.status !== 'paid'));
  const overdueTotal    = overdueInvoices.reduce((s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.amount_paid || 0)), 0);

  // ── Revenue mini-chart (last 7 days) ──
  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStr = d.toISOString().slice(0, 10);
      const rev = confirmedPayments
        .filter(p => (p.payment_date || p.created_date || '').slice(0, 10) === dayStr)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      days.push({ day: label, revenue: rev });
    }
    return days;
  }, [confirmedPayments]);

  // ── Package performance ──
  const topPackages = useMemo(() => {
    const counts = {};
    bookings.forEach(b => {
      if (!b.package_name) return;
      counts[b.package_name] = (counts[b.package_name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, count }));
  }, [bookings]);

  // ── Booking status funnel ──
  const statusCounts = useMemo(() => {
    const s = { pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
    bookings.forEach(b => { if (s[b.status] !== undefined) s[b.status]++; });
    return [
      { name: 'Pending',     value: s.pending,     color: '#f59e0b' },
      { name: 'Confirmed',   value: s.confirmed,   color: '#22c55e' },
      { name: 'In Progress', value: s.in_progress, color: '#3b82f6' },
      { name: 'Completed',   value: s.completed,   color: '#a855f7' },
      { name: 'Cancelled',   value: s.cancelled,   color: '#ef4444' },
    ];
  }, [bookings]);

  const recentActivity = bookings.slice(0, 8);

  return (
    <div className="relative p-6 space-y-8 max-w-[1600px]">
      <div className="absolute inset-x-0 top-0 h-56 rs-hero pointer-events-none -z-10" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rs-led rs-led-live" />
            <span className="text-[10px] rs-mono uppercase tracking-[0.18em] text-muted-foreground">Live · {scans.length} scans today</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/scanner" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card/60 backdrop-blur border border-border rounded-xl hover:border-primary/40 hover:text-foreground transition-colors">
            <ScanLine className="w-4 h-4" /> Scanner
          </Link>
          <Link to="/analytics" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card/60 backdrop-blur border border-border rounded-xl hover:border-primary/40 hover:text-foreground transition-colors">
            <BarChart2 className="w-4 h-4" /> Analytics
          </Link>
          <Link to="/bookings" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors rs-glow-primary">
            <Plus className="w-4 h-4" /> New Booking
          </Link>
        </div>
      </div>

      {/* ── Overdue alert ── */}
      {overdueInvoices.length > 0 && (
        <Link to="/invoices" className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''} — {formatCurrency(overdueTotal)} outstanding
            </p>
            <p className="text-xs text-red-500">Click to review and send reminders</p>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400" />
        </Link>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Bookings"
          value={bookings.length}
          icon={BookOpen}
          color="blue"
          trend={pctChange(recentBookings30.length, priorBookings30.length)}
          subtitle={`${activeBookings} active`}
          trendLabel="vs last 30 days"
          to="/bookings"
        />
        <KpiCard
          title="Total Clients"
          value={clients.length}
          icon={Users}
          color="green"
          trend={pctChange(recentClients30.length, priorClients30.length)}
          trendLabel="vs last 30 days"
          to="/clients"
        />
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          color="primary"
          trend={pctChange(rev30, prevRev)}
          subtitle={`${formatCurrency(rev30)} this month`}
          trendLabel="vs last 30 days"
          to="/payments"
        />
        <KpiCard
          title="Active Packages"
          value={packages.filter(p => p.status === 'active').length}
          icon={Package}
          color="amber"
          subtitle={`${packages.length} total`}
          to="/packages"
        />
      </div>

      {/* ── Second row KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Open Quotes"
          value={quotes.filter(q => q.status === 'sent').length}
          icon={FileText}
          color="blue"
          subtitle="Awaiting acceptance"
          to="/quotes"
        />
        <KpiCard
          title="Pending Invoices"
          value={invoices.filter(i => ['sent', 'partial'].includes(i.status)).length}
          icon={Receipt}
          color="amber"
          subtitle={formatCurrency(invoices.filter(i => ['sent','partial'].includes(i.status)).reduce((s,i)=>s+Math.max(0,Number(i.total||0)-Number(i.amount_paid||0)),0))}
          to="/invoices"
        />
        <KpiCard
          title="This Month Revenue"
          value={formatCurrency(rev30)}
          icon={CreditCard}
          color="green"
          trend={pctChange(rev30, prevRev)}
          to="/payments"
        />
        <KpiCard
          title="Upcoming Trips"
          value={upcoming.length}
          icon={CalendarDays}
          color="rose"
          subtitle="Next 14 days"
          to="/calendar"
        />
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          <QuickAction icon={BookOpen} label="New Booking" to="/bookings"       color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <QuickAction icon={Users}    label="Add Client"  to="/clients"        color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
          <QuickAction icon={FileText} label="New Quote"   to="/quotes"         color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
          <QuickAction icon={Receipt}  label="New Invoice" to="/invoices"       color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
          <QuickAction icon={Package}  label="Add Package" to="/packages"       color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
          <QuickAction icon={CalendarDays} label="Calendar" to="/calendar"     color="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" />
          <QuickAction icon={BarChart2} label="Analytics"  to="/analytics"     color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
          <QuickAction icon={Zap}      label="Automations" to="/automations"   color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue area chart */}
        <div className="xl:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Revenue (last 7 days)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daily confirmed payments</p>
            </div>
            <Link to="/analytics" className="text-xs text-primary flex items-center gap-1 hover:underline">Full report <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last7} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 12 }}
                formatter={v => [formatCurrency(v), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: 'hsl(var(--primary))', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Booking status breakdown */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-1">Booking Status</h3>
          <p className="text-xs text-muted-foreground mb-5">Distribution across all bookings</p>
          <div className="space-y-3">
            {statusCounts.map(s => {
              const pct = bookings.length ? Math.round((s.value / bookings.length) * 100) : 0;
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">{s.value} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/analytics" className="mt-6 text-xs text-primary flex items-center gap-1 hover:underline">
            View full analytics <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Lower grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Recent Bookings</h3>
            </div>
            <Link to="/bookings" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No bookings yet</p>
            ) : recentActivity.map(b => <ActivityItem key={b.id} booking={b} />)}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Live Scan Activity */}
          <div className="rs-panel rs-panel-accent p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Live Scan Activity</h3>
                <span className="rs-led rs-led-live" />
              </div>
              <Link to="/scanner" className="text-[11px] rs-mono uppercase tracking-[0.14em] text-primary hover:underline">Scanner</Link>
            </div>
            <div className="divide-y divide-border/40">
              {scans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No scans yet — stand by.</p>
              ) : scans.slice(0, 6).map(s => <ScanFeedItem key={s.id} scan={s} />)}
            </div>
          </div>

          {/* Upcoming trips */}
          <div className="rs-panel rs-panel-accent p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Upcoming Trips</h3>
              </div>
              <Link to="/calendar" className="text-[11px] rs-mono uppercase tracking-[0.14em] text-primary hover:underline">Calendar</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No trips in next 14 days</p>
            ) : upcoming.map(b => <UpcomingTrip key={b.id} booking={b} />)}
          </div>

          {/* Top packages */}
          {topPackages.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Top Packages</h3>
              </div>
              <div className="space-y-2.5">
                {topPackages.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-center font-mono">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                      <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full"
                          style={{ width: `${Math.round((p.count / topPackages[0].count) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Full Revenue Chart ── */}
      <RevenueChart bookings={bookings} payments={payments} />

      {/* ── Package + Bar chart row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PackageChart bookings={bookings} packages={packages} />

        {/* Booking by day of week */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-1">Bookings by Status</h3>
          <p className="text-xs text-muted-foreground mb-5">All-time distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {statusCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
