import React from 'react';
import { MapPin, Calendar, Users, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/helpers';

export default function BookingInfoCard({ booking }) {
  if (!booking) return null;
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Booking Details — Auto-filled</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium text-foreground">{booking.client_name}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{booking.package_name}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{formatDate(booking.start_date)} → {formatDate(booking.end_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-semibold text-foreground">{formatCurrency(booking.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}