import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/helpers';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, CreditCard, BookOpen, CalendarCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function toISO(input) {
  if (!input) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) return String(input);
  const d = new Date(input);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AgentDashboard() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['agent-bookings', currentUser?.email],
    queryFn: () => base44.entities.Booking.filter({ agent_name: currentUser?.full_name }, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['agent-payments'],
    queryFn: () => base44.entities.Payment.list('-payment_date'),
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages-agent'],
    queryFn: () => base44.entities.Package.filter({ status: 'active' }),
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['availability-agent'],
    queryFn: () => base44.entities.Availability.list('-created_date'),
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['bookings-agent-avail'],
    queryFn: () => base44.entities.Booking.filter({ status: 'confirmed' }),
  });

  // Build upcoming availability slots (next 60 days)
  const slotEntries = availability.filter((a) => a.type === 'slot' && a.is_active);
  const today = toISO(new Date());
  const in60 = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return toISO(d);
  })();

  const upcomingSlots = slotEntries
    .filter((s) => s.date >= today && s.date <= in60)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 10)
    .map((slot) => {
      const booked = allBookings
        .filter((b) => {
          const s = toISO(b.start_date);
          const e = toISO(b.end_date);
          return b.package_id === slot.package_id && s && e && slot.date >= s && slot.date <= e;
        })
        .reduce((sum, b) => sum + (b.num_guests || 0), 0);
      return { ...slot, booked, remaining: Math.max(0, slot.total_slots - booked) };
    });

  // Calculate metrics
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const totalCommission = bookings.reduce((sum, b) => sum + (b.agent_commission || 0), 0);
  const averageBookingValue = totalBookings > 0 ? bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) / totalBookings : 0;

  // Status breakdown for pie chart
  const statusBreakdown = [
    { name: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: '#16a34a' },
    { name: 'In Progress', value: bookings.filter(b => b.status === 'in_progress').length, color: '#eab308' },
    { name: 'Quoted', value: bookings.filter(b => b.status === 'quoted').length, color: '#3b82f6' },
    { name: 'Inquiry', value: bookings.filter(b => b.status === 'inquiry').length, color: '#8b5cf6' },
    { name: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: '#6b7280' },
  ].filter(s => s.value > 0);

  // Monthly trend
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const count = bookings.filter(b => {
      const bDate = new Date(b.created_date);
      return bDate.getMonth() === date.getMonth() && bDate.getFullYear() === date.getFullYear();
    }).length;
    return { month, bookings: count };
  }).reverse();

  // Recent bookings
  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Agent Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {currentUser?.full_name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard 
          title="Total Bookings" 
          value={totalBookings} 
          icon={BookOpen}
          subtitle={`${confirmedBookings} confirmed`}
        />
        <StatCard 
          title="Total Commission" 
          value={formatCurrency(totalCommission)} 
          icon={CreditCard}
        />
        <StatCard 
          title="Avg Booking Value" 
          value={formatCurrency(averageBookingValue)} 
          icon={TrendingUp}
        />
        <StatCard 
          title="Conversion Rate" 
          value={totalBookings > 0 ? `${Math.round((confirmedBookings / totalBookings) * 100)}%` : '0%'} 
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Booking Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Trend (Last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        {statusBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Package Availability */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Package Availability</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Open slots in the next 60 days</p>
          </div>
          <Link
            to="/availability"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingSlots.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-25" />
              No upcoming availability slots set for the next 60 days.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSlots.map((slot) => {
                const pct = slot.total_slots > 0 ? (slot.booked / slot.total_slots) * 100 : 0;
                const statusColor =
                  slot.remaining === 0
                    ? 'text-red-600'
                    : pct >= 80
                    ? 'text-orange-500'
                    : 'text-green-600';
                const barColor =
                  slot.remaining === 0
                    ? 'bg-red-500'
                    : pct >= 80
                    ? 'bg-orange-400'
                    : 'bg-green-500';
                const label =
                  slot.remaining === 0
                    ? 'Full'
                    : `${slot.remaining} left`;
                return (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/40 transition-colors"
                  >
                    <div className="w-20 shrink-0">
                      <p className="text-xs font-semibold">{formatDate(slot.date)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{slot.package_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {slot.booked}/{slot.total_slots}
                      </span>
                      <div className="w-14 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-10 text-right ${statusColor}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No bookings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-medium">Ref</th>
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Package</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Commission</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-accent/30 transition-colors">
                      <td className="p-3 font-medium text-sm">{booking.booking_ref}</td>
                      <td className="p-3 text-sm">{booking.client_name}</td>
                      <td className="p-3 text-sm">{booking.package_name}</td>
                      <td className="p-3 font-medium">{formatCurrency(booking.total_amount)}</td>
                      <td className="p-3 font-medium text-green-600">{formatCurrency(booking.agent_commission || 0)}</td>
                      <td className="p-3"><StatusBadge status={booking.status} /></td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(booking.created_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}