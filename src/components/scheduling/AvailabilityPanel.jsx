import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Users, Truck, Wrench } from 'lucide-react';
import { format } from 'date-fns';

export default function AvailabilityPanel({ booking, vehicles, drivers, equipment, assignments }) {
  const isConflict = (start, end, itemStart, itemEnd) => {
    return start <= itemEnd && end >= itemStart;
  };

  const availability = useMemo(() => {
    return {
      vehicles: {
        available: vehicles.filter(v => {
          const hasConflict = assignments.some(a => {
            if (a.booking_id === booking.id || !a.vehicle_id || a.vehicle_id !== v.id) return false;
            return isConflict(booking.start_date, booking.end_date, a.start_date, a.end_date);
          });
          return !hasConflict && v.is_active && v.maintenance_status === 'operational';
        }).length,
        total: vehicles.filter(v => v.is_active && v.maintenance_status === 'operational').length,
      },
      drivers: {
        available: drivers.filter(d => {
          const hasConflict = assignments.some(a => {
            if (a.booking_id === booking.id || !a.driver_id || a.driver_id !== d.id) return false;
            return isConflict(booking.start_date, booking.end_date, a.start_date, a.end_date);
          });
          return !hasConflict && d.employment_status === 'active' && d.availability_status === 'available';
        }).length,
        total: drivers.filter(d => d.employment_status === 'active').length,
      },
      equipment: {
        available: equipment.filter(e => {
          const hasConflict = assignments.some(a => {
            if (a.booking_id === booking.id) return false;
            const equipmentItems = JSON.parse(a.equipment_items || '[]');
            if (!equipmentItems.some(ei => ei.id === e.id)) return false;
            return isConflict(booking.start_date, booking.end_date, a.start_date, a.end_date);
          });
          return !hasConflict && e.quantity_available > 0;
        }).length,
        total: equipment.length,
      },
    };
  }, [vehicles, drivers, equipment, assignments, booking]);

  const statusColor = (available, total) => {
    if (available === 0) return 'bg-red-50 text-red-700';
    if (available < total / 2) return 'bg-yellow-50 text-yellow-700';
    return 'bg-green-50 text-green-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Availability & Assignment Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booking Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{booking.booking_ref}</div>
              <div className="text-xs text-muted-foreground">{booking.client_name}</div>
            </div>
            <Badge>{booking.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex gap-2">
              <Clock className="w-3 h-3 mt-0.5" />
              <span>{booking.start_date} → {booking.end_date} ({booking.num_guests} guests)</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          {/* Vehicles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Truck className="w-4 h-4" />
                Vehicles
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(availability.vehicles.available, availability.vehicles.total)}`}>
                {availability.vehicles.available}/{availability.vehicles.total} available
              </span>
            </div>
            {availability.vehicles.available === 0 ? (
              <div className="flex gap-2 p-2 rounded bg-red-50 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No vehicles available for this period</span>
              </div>
            ) : (
              <div className="flex gap-2 p-2 rounded bg-green-50 text-green-700 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{availability.vehicles.available} vehicles ready to assign</span>
              </div>
            )}
          </div>

          {/* Drivers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4" />
                Drivers
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(availability.drivers.available, availability.drivers.total)}`}>
                {availability.drivers.available}/{availability.drivers.total} available
              </span>
            </div>
            {availability.drivers.available === 0 ? (
              <div className="flex gap-2 p-2 rounded bg-red-50 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No drivers available for this period</span>
              </div>
            ) : (
              <div className="flex gap-2 p-2 rounded bg-green-50 text-green-700 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{availability.drivers.available} drivers ready to assign</span>
              </div>
            )}
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="w-4 h-4" />
                Equipment
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(availability.equipment.available, availability.equipment.total)}`}>
                {availability.equipment.available}/{availability.equipment.total} items available
              </span>
            </div>
            {availability.equipment.available === 0 ? (
              <div className="flex gap-2 p-2 rounded bg-yellow-50 text-yellow-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Limited equipment availability for this period</span>
              </div>
            ) : (
              <div className="flex gap-2 p-2 rounded bg-green-50 text-green-700 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{availability.equipment.available} equipment items ready</span>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Readiness */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">Assignment Status</div>
          {availability.vehicles.available > 0 && availability.drivers.available > 0 ? (
            <div className="flex gap-2 p-2 rounded bg-green-50 text-green-700 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Booking is ready for resource assignment</span>
            </div>
          ) : (
            <div className="flex gap-2 p-2 rounded bg-red-50 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Resources unavailable. Check dates or contact availability management.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}