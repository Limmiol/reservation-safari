import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import SchedulingBoard from '@/components/scheduling/SchedulingBoard';
import AvailabilityPanel from '@/components/scheduling/AvailabilityPanel';

export default function ResourceScheduler() {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  // Fetch data
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.filter({ status: filterStatus === 'all' ? {} : { status: filterStatus } }),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ResourceAssignment.list(),
  });

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ResourceAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = !searchQuery || 
        b.booking_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, filterStatus]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <Calendar className="w-8 h-8" />
          Resource Scheduler
        </h1>
        <p className="text-muted-foreground mt-1">Drag and drop resources to assign them to bookings</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium">Search Bookings</label>
          <Input
            placeholder="Search by reference or client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="w-48">
          <label className="text-sm font-medium">Filter by Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Booking List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bookings ({filteredBookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No bookings found</p>
                ) : (
                  filteredBookings.map(booking => (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedBooking?.id === booking.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:bg-accent'
                      }`}
                    >
                      <div className="font-medium text-sm">{booking.booking_ref}</div>
                      <div className="text-xs opacity-75">{booking.client_name}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {booking.start_date} → {booking.end_date}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Booking Details & Availability */}
        <div className="lg:col-span-2">
          {selectedBooking ? (
            <AvailabilityPanel
              booking={selectedBooking}
              vehicles={vehicles}
              drivers={drivers}
              equipment={equipment}
              assignments={assignments}
              onAssign={createAssignmentMutation.mutate}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a booking to view and assign resources
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Scheduling Board */}
      {selectedBooking && (
        <SchedulingBoard
          booking={selectedBooking}
          vehicles={vehicles}
          drivers={drivers}
          equipment={equipment}
          assignments={assignments}
          onAssign={createAssignmentMutation.mutate}
          onUpdate={updateAssignmentMutation.mutate}
        />
      )}
    </div>
  );
}