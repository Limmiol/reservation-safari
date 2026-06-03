import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, MapPin } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/helpers';
import StatusBadge from '@/components/ui/StatusBadge';
import ClientItineraryView from '@/components/ClientItineraryView';
import PaymentHistoryCard from '@/components/portal/PaymentHistoryCard';
import InvoiceDownloadCard from '@/components/portal/InvoiceDownloadCard';
import FeedbackForm from '@/components/portal/FeedbackForm';
import ItineraryMap from '@/components/maps/ItineraryMap';

export default function MyBookingDetail() {
  const id = window.location.pathname.split('/').pop();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['portal-booking', id],
    queryFn: async () => {
      const list = await base44.entities.Booking.filter({ id });
      return list[0] ?? null;
    },
    enabled: !!id,
  });

  const { data: pkg } = useQuery({
    queryKey: ['portal-package', booking?.package_id],
    queryFn: async () => {
      const list = await base44.entities.Package.filter({ id: booking.package_id });
      return list[0] ?? null;
    },
    enabled: !!booking?.package_id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['portal-payments', id],
    queryFn: () => base44.entities.Payment.filter({ booking_id: id }),
    enabled: !!id,
  });

  if (isLoading || !user) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking || (user?.email && booking.client_email !== user.email)) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Booking not found.</p>
        <Link to="/portal" className="text-sm underline mt-2 inline-block">Back to bookings</Link>
      </div>
    );
  }

  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
  const balance = (booking.total_amount || 0) - totalPaid;

  return (
    <div className="space-y-6">
      <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to my bookings
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-semibold">{booking.package_name}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">{booking.booking_ref}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(booking.start_date)} — {formatDate(booking.end_date)}</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{booking.num_guests} guest{booking.num_guests !== 1 ? 's' : ''}</span>
              {pkg?.destination && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{pkg.destination}</span>}
            </div>
            {booking.special_requests && (
              <p className="text-sm text-muted-foreground mt-3 italic">"{booking.special_requests}"</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold">{formatCurrency(booking.total_amount)}</p>
            {totalPaid > 0 && <p className="text-sm text-green-600 mt-1">Paid: {formatCurrency(totalPaid)}</p>}
            {balance > 0 && <p className="text-sm text-red-500 mt-0.5">Balance due: {formatCurrency(balance)}</p>}
          </div>
        </div>

        {/* Package includes/excludes */}
        {(pkg?.includes || pkg?.excludes) && (
          <div className="mt-5 pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pkg?.includes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Included</p>
                <ul className="space-y-1">
                  {pkg.includes.split(',').map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span> {item.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pkg?.excludes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Not Included</p>
                <ul className="space-y-1">
                  {pkg.excludes.split(',').map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5">✗</span> {item.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Itinerary */}
      <ClientItineraryView booking={booking} packageData={pkg} />

      {/* Map */}
      {booking.custom_itinerary || pkg?.itinerary_days ? (
        <ItineraryMap
          itinerary={booking.custom_itinerary || pkg.itinerary_days}
          packageName={booking.package_name}
        />
      ) : null}

      {/* Payment & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentHistoryCard payments={payments} />
        <InvoiceDownloadCard bookingId={id} />
      </div>

      {/* Feedback Form - Only for completed bookings */}
      {booking.status === 'completed' && (
        <FeedbackForm booking={booking} client={user} />
      )}
    </div>
  );
}