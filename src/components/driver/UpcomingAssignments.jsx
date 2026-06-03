import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import { MapPin, Calendar, Users, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

export default function UpcomingAssignments({ driverEmail, driverId }) {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['driver-assignments', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const all = await base44.entities.ResourceAssignment.list('-start_date');
      return all.filter(a => a.driver_id === driverId);
    },
    enabled: !!driverId,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-for-driver'],
    queryFn: () => base44.entities.Booking.list(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-driver'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const getBookingDetails = (bookingId) => {
    return bookings.find(b => b.id === bookingId);
  };

  const getVehicleDetails = (vehicleId) => {
    return vehicles.find(v => v.id === vehicleId);
  };

  const today = new Date();
  const upcoming = assignments.filter(a => new Date(a.start_date) >= today);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-3 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Your Upcoming Assignments</h2>
        <p className="text-sm text-muted-foreground">{upcoming.length} upcoming trip(s)</p>
      </div>

      {upcoming.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No upcoming assignments</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {upcoming.map((assignment) => {
            const booking = getBookingDetails(assignment.booking_id);
            const vehicle = getVehicleDetails(assignment.vehicle_id);
            const daysUntil = Math.ceil((new Date(assignment.start_date) - today) / (1000 * 60 * 60 * 24));

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{booking?.package_name || 'Safari Trip'}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Booking: {booking?.booking_ref}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={assignment.status} />
                      {daysUntil === 0 ? (
                        <p className="text-xs font-semibold text-primary mt-2">TODAY</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">In {daysUntil} days</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Trip Dates</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(assignment.start_date)} → {formatDate(assignment.end_date)}
                      </p>
                    </div>
                  </div>

                  {/* Vehicle */}
                  {vehicle && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Assigned Vehicle</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.registration_number} - {vehicle.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Status: <span className="font-medium capitalize">{vehicle.maintenance_status}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Guests */}
                  {booking && (
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Guest Count</p>
                        <p className="text-sm text-muted-foreground">{booking.num_guests} guests</p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {assignment.notes && (
                    <div className="bg-accent/30 rounded p-3 mt-4">
                      <p className="text-xs font-medium text-foreground mb-1">Special Instructions</p>
                      <p className="text-sm text-muted-foreground">{assignment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}