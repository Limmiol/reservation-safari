import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/helpers';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, BookOpen, CreditCard, Package, Globe, DollarSign, BarChart2, Activity } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316'];

function Card({ children, className = '' }) {
  return <div className={`bg-card rounded-2xl border border-border p-6 ${className}`}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-5">
      <h3 className="font-semibold text-base">{children}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricPill({ label, value, positive }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${positive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {label}: {value}
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState('12m');

  const { data: bookings  = [] } = useQuery({ queryKey: ['bookings'],  queryFn: () => base44.entities.Booking.list('-created_date', 500) });
  const { data: clients   = [] } = useQuery({ queryKey: ['clients'],   queryFn: () => base44.entities.Client.list('-created_date', 500) });
  const { data: payments  = [] } = useQuery({ queryKey: ['payments'],  queryFn: () => base44.entities.Payment.list('-created_date', 500) });
  const { data: packages  = [] } = useQuery({ queryKey: ['packages'],  queryFn: () => base44.entities.Package.list() });
  const { data: invoices  = [] } = useQuery({ queryKey: ['invoices'],  queryFn: () => base44.entities.Invoice.list('-created_date', 500) });
  const { data: expenses  = [] } = useQuery({ queryKey: ['expenses'],  queryFn: () => base44.entities.Expense.list('-created_date', 500) });
  const { data: vehicleExpenses = [] } = useQuery({ queryKey: ['vehicle-expenses'],  queryFn: () => base44.entities.VehicleExpense.list('-created_date', 500) });
  const { data: otas      = [] } = useQuery({ queryKey: ['otas'],      queryFn: () => base44.entities.OTA.list() });

  // Create a Set of expense IDs that are linked to vehicle expenses to avoid duplication
  const linkedExpenseIds = useMemo(() => 
    new Set(vehicleExpenses.map(v => v.expense_id).filter(Boolean)),
    [vehicleExpenses]
  );

  // Filter out regular expenses that are already represented as vehicle expenses
  const uniqueExpenses = useMemo(() =>
    expenses.filter(e => !linkedExpenseIds.has(e.id)),
    [expenses, linkedExpenseIds]
  );

  const confirmedPay = payments.filter(p => ['confirmed', 'paid'].includes(p.status));
  const totalRevenue = confirmedPay.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalExpenses = (uniqueExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)) + 
                        (vehicleExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0));
  const netProfit = totalRevenue - totalExpenses;
  const avgBookingValue = bookings.length ? Math.round(bookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0) / bookings.length) : 0;
  const conversionRate = bookings.length ? Math.round((bookings.filter(b => b.status === 'confirmed').length / bookings.length) * 100) : 0;

  const periodMonths = period === '3m' ? 3 : period === '6m' ? 6 : 12;

  // Monthly revenue + bookings trend
  const monthlyData = useMemo(() => {
    const map = {};
    for (let i = periodMonths - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      map[key] = { month: key, revenue: 0, bookings: 0, clients: 0, expenses: 0 };
    }
    confirmedPay.forEach(p => {
      const key = new Date(p.created_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (map[key]) map[key].revenue += Number(p.amount) || 0;
    });
    bookings.forEach(b => {
      const key = new Date(b.created_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (map[key]) map[key].bookings++;
    });
    clients.forEach(c => {
      const key = new Date(c.created_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (map[key]) map[key].clients++;
    });
    uniqueExpenses.forEach(e => {
      const key = new Date(e.created_date || e.date || Date.now()).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (map[key]) map[key].expenses += Number(e.amount) || 0;
    });
    vehicleExpenses.forEach(e => {
      const key = new Date(e.created_date || e.date || Date.now()).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (map[key]) map[key].expenses += Number(e.amount) || 0;
    });
    return Object.values(map).map(d => ({ ...d, revenue: Math.round(d.revenue), expenses: Math.round(d.expenses), profit: Math.round(d.revenue - d.expenses) }));
  }, [confirmedPay, bookings, clients, uniqueExpenses, vehicleExpenses, periodMonths]);

  // Package performance
  const packagePerf = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!b.package_name) return;
      if (!map[b.package_name]) map[b.package_name] = { name: b.package_name, bookings: 0, revenue: 0 };
      map[b.package_name].bookings++;
      map[b.package_name].revenue += Number(b.total_amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8).map(p => ({
      ...p,
      name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
      revenue: Math.round(p.revenue),
    }));
  }, [bookings]);

  // Booking source breakdown
  const sourceData = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const src = b.booking_source || 'direct';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [bookings]);

  // OTA performance
  const otaPerf = useMemo(() => {
    return otas.map(ota => {
      const otaBookings = bookings.filter(b => b.ota_id === ota.id);
      const gross = otaBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
      const commission = gross * ((ota.commission_rate || 0) / 100);
      return { name: ota.name, bookings: otaBookings.length, gross: Math.round(gross), commission: Math.round(commission), net: Math.round(gross - commission) };
    }).filter(o => o.bookings > 0).sort((a, b) => b.gross - a.gross);
  }, [otas, bookings]);

  // Booking status funnel
  const statusFunnel = useMemo(() => {
    const order = ['pending', 'confirmed', 'in_progress', 'completed'];
    return order.map(s => ({ name: s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()), value: bookings.filter(b => b.status === s).length }));
  }, [bookings]);

  // Client acquisition cumulative
  const clientCumulative = useMemo(() => {
    let total = 0;
    return monthlyData.map(m => {
      total += m.clients;
      return { ...m, cumulative: total };
    });
  }, [monthlyData]);

  const ttChartStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 12 };

  return (
    <div className="p-6 space-y-8 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" /> Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Business intelligence & performance overview</p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {['3m','6m','12m'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-green-500' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'text-red-500' },
          { label: 'Net Profit', value: formatCurrency(netProfit), icon: DollarSign, color: netProfit >= 0 ? 'text-green-500' : 'text-red-500' },
          { label: 'Avg Booking Value', value: formatCurrency(avgBookingValue), icon: BookOpen, color: 'text-blue-500' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: Activity, color: 'text-purple-500' },
        ].map(k => (
          <Card key={k.label} className="flex items-center gap-3 p-4">
            <k.icon className={`w-5 h-5 flex-shrink-0 ${k.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold text-foreground">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue vs Expenses */}
      <Card>
        <SectionTitle sub={`Monthly revenue and expenses — last ${periodMonths} months`}>Revenue vs Expenses</SectionTitle>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
            <Tooltip contentStyle={ttChartStyle} formatter={(v, n) => [formatCurrency(v), n]} />
            <Legend />
            <Area type="monotone" dataKey="revenue"  name="Revenue"  stroke="#22c55e" strokeWidth={2} fill="url(#revG)" />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expG)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly bookings + client growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle sub="New bookings per month">Booking Volume</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={ttChartStyle} />
              <Bar dataKey="bookings" name="Bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle sub="Cumulative client count over time">Client Growth</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={clientCumulative} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={ttChartStyle} />
              <Line type="monotone" dataKey="cumulative" name="Total Clients" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Package performance + Booking source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle sub="Revenue generated per package">Package Performance</SectionTitle>
          {packagePerf.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No booking data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={packagePerf} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 10 }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <YAxis type="category" dataKey="name" width={80} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={ttChartStyle} formatter={v => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionTitle sub="Where bookings originate from">Booking Sources</SectionTitle>
          {sourceData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No booking data yet</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={ttChartStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {sourceData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm flex-1 text-foreground">{s.name}</span>
                    <span className="text-sm font-semibold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Booking funnel */}
      <Card>
        <SectionTitle sub="Bookings by stage — all time">Booking Funnel</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statusFunnel.map((s, i) => {
            const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
            const maxVal = Math.max(...statusFunnel.map(x => x.value));
            const pct = maxVal ? Math.round((s.value / maxVal) * 100) : 0;
            return (
              <div key={s.name} className="text-center p-4 rounded-xl border border-border">
                <div className="text-3xl font-bold" style={{ color: colors[i] }}>{s.value}</div>
                <div className="text-sm font-medium text-foreground mt-1">{s.name}</div>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i] }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* OTA Performance */}
      {otaPerf.length > 0 && (
        <Card>
          <SectionTitle sub="Revenue and commission breakdown per OTA channel">OTA Channel Performance</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="pb-3 text-left font-medium">Channel</th>
                  <th className="pb-3 text-right font-medium">Bookings</th>
                  <th className="pb-3 text-right font-medium">Gross Revenue</th>
                  <th className="pb-3 text-right font-medium">Commission</th>
                  <th className="pb-3 text-right font-medium">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {otaPerf.map(o => (
                  <tr key={o.name} className="hover:bg-accent/30 transition-colors">
                    <td className="py-3 font-medium text-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" /> {o.name}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">{o.bookings}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(o.gross)}</td>
                    <td className="py-3 text-right text-red-500">-{formatCurrency(o.commission)}</td>
                    <td className="py-3 text-right font-semibold text-green-600">{formatCurrency(o.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
