import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/helpers';
import StatusBadge from '@/components/ui/StatusBadge';
import { MapPin, Calendar, Users, ChevronRight } from 'lucide-react';

export default function MyBookings() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['portal-bookings', user?.email],
    queryFn: () => base44.entities.Booking.filter({ client_email: user.email }),
    enabled: !!user?.email,
  });

  if (isLoading || !user) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Welcome, {user.full_name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here are your safari bookings.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">No bookings found for your account.</p>
          <p className="text-sm text-muted-foreground mt-1">Contact us to make a reservation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              to={`/portal/bookings/${booking.id}`}
              className="block bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-base font-semibold">{booking.package_name}</h2>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{booking.booking_ref}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {booking.num_guests} guest{booking.num_guests !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatCurrency(booking.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}