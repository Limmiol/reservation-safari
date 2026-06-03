import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';

// ── Revenue Trend Chart ──
export function RevenueTrendChart({ data, title = 'Revenue Trend' }) {
  return (
    <div className="rs-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-1 text-xs text-green-600">
          <TrendingUp className="w-3 h-3" />
          +12.5%
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip 
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            fillOpacity={1}
            fill="url(#colorRev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Booking Status Distribution ──
export function BookingStatusChart({ data, title = 'Booking Status Distribution' }) {
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'];

  return (
    <div className="rs-panel p-5">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Top Packages Performance ──
export function TopPackagesChart({ data, title = 'Top Packages' }) {
  return (
    <div className="rs-panel p-5">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Revenue by Currency ──
export function RevenueByCurrencyChart({ data, title = 'Revenue by Currency' }) {
  return (
    <div className="rs-panel p-5">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{item.currency}</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(item.revenue, item.currency)}
                </span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${Math.min((item.revenue / Math.max(...data.map(d => d.revenue))) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly Revenue Comparison ──
export function MonthlyComparisonChart({ data, title = 'Monthly Revenue' }) {
  return (
    <div className="rs-panel p-5">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value) => formatCurrency(value)}
          />
          <Legend />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="target" fill="hsl(var(--muted))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Client Growth Chart ──
export function ClientGrowthChart({ data, title = 'Client Growth' }) {
  return (
    <div className="rs-panel p-5">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="new" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Conversion Funnel ──
export function ConversionFunnelChart({ data, title = 'Booking Conversion Funnel' }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="rs-panel p-5">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const percentage = ((item.value / maxValue) * 100).toFixed(0);
          const conversionRate = idx > 0 ? ((item.value / data[idx - 1].value) * 100).toFixed(1) : '100';

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  {idx > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                      {conversionRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
