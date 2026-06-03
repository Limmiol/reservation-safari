import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/helpers';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { CalendarDays, MapPin, Car, MessageSquare, BookOpen, CheckCircle } from 'lucide-react';

export default function GuideDashboard() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Bookings assigned to this guide
  const { data: allBookings = [] } = useQuery({
    queryKey: ['guide-bookings'],
    queryFn: () => base44.entities.Booking.list('-start_date', 200),
    enabled: !!currentUser,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('-updated_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 50),
    enabled: !!currentUser,
  });

  const guideName = currentUser?.full_name || currentUser?.email || '';

  // Filter bookings assigned to this guide
  const myBookings = allBookings.filter(b =>
    b.guide_name === guideName ||
    b.guide_id === currentUser?.id ||
    b.assigned_guide === guideName
  );

  const upcoming = myBookings
    .filter(b => b.start_date && new Date(b.start_date) >= new Date() && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const active = myBookings.filter(b => b.status === 'in_progress' || b.status === 'confirmed');
  const completed = myBookings.filter(b => b.status === 'completed');

  // Operational vehicles
  const operationalVehicles = vehicles.filter(v => v.maintenance_status === 'operational');

  // Unread messages (simple: messages to current user)
  const myMessages = messages.filter(m =>
    m.recipient_email === currentUser?.email ||
    m.recipient_id === currentUser?.id
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Guide Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome, {guideName || 'Guide'}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming Trips" value={upcoming.length} icon={CalendarDays} subtitle="scheduled" />
        <StatCard title="Active Trips" value={active.length} icon={BookOpen} subtitle="in progress / confirmed" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} subtitle="trips" />
        <StatCard title="Available Vehicles" value={operationalVehicles.length} icon={Car} subtitle="operational" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming trips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4 text-primary" /> My Upcoming Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No upcoming trips assigned to you.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 8).map(b => (
                  <div key={b.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{b.package_name || 'Safari Trip'}</p>
                      <p className="text-xs text-muted-foreground">{b.client_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(b.start_date)} → {formatDate(b.end_date)}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle fleet status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="w-4 h-4 text-primary" /> Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No vehicles in fleet.</p>
            ) : (
              <div className="space-y-2">
                {vehicles.slice(0, 8).map(v => {
                  const statusColor = {
                    operational: 'bg-green-500',
                    maintenance_due: 'bg-amber-400',
                    under_maintenance: 'bg-orange-500',
                    out_of_service: 'bg-red-500',
                  }[v.maintenance_status] || 'bg-gray-400';
                  return (
                    <div key={v.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{v.registration_number}</p>
                        <p className="text-xs text-muted-foreground">{v.name} · {v.seating_capacity} seats</p>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize hidden sm:block">
                        {v.maintenance_status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All my bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Assigned Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {myBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No bookings are currently assigned to you.<br />
              <span className="text-xs">Your name must match the guide field on bookings.</span>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-medium">Ref</th>
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Package / Route</th>
                    <th className="text-left p-3 font-medium">Start</th>
                    <th className="text-left p-3 font-medium">End</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myBookings.map(b => (
                    <tr key={b.id} className="hover:bg-accent/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{b.booking_ref}</td>
                      <td className="p-3">{b.client_name}</td>
                      <td className="p-3 text-muted-foreground">{b.package_name || '—'}</td>
                      <td className="p-3 text-xs">{formatDate(b.start_date)}</td>
                      <td className="p-3 text-xs">{formatDate(b.end_date)}</td>
                      <td className="p-3"><StatusBadge status={b.status} /></td>
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
