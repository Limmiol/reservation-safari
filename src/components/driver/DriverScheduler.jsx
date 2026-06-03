import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/helpers';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Car, Plus, Filter } from 'lucide-react';

export default function DriverScheduler() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    driver_id: '',
    date: '',
    start_time: '',
    end_time: '',
    activity_type: 'available',
    notes: '',
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-updated_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: () => base44.entities.ResourceAssignment.list('-updated_date'),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-schedule'],
    queryFn: () => base44.entities.Booking.list('-start_date'),
  });

  // Get assignments for selected date
  const getDayAssignments = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(a => {
      const startDate = new Date(a.start_date).toISOString().split('T')[0];
      const endDate = new Date(a.end_date).toISOString().split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  // Get driver schedule for the day
  const getDriverSchedule = (driverId, date) => {
    const dayAssignments = getDayAssignments(date);
    return dayAssignments.filter(a => a.driver_id === driverId);
  };

  // Get available drivers for a date
  const getAvailableDrivers = (date) => {
    const dayAssignments = getDayAssignments(date);
    const assignedDriverIds = new Set(dayAssignments.map(a => a.driver_id));

    return drivers.filter(driver =>
      driver.employment_status === 'active' &&
      !assignedDriverIds.has(driver.id)
    );
  };

  const dayAssignments = getDayAssignments(selectedDate);
  const filteredAssignments = selectedDriver === 'all'
    ? dayAssignments
    : dayAssignments.filter(a => a.driver_id === selectedDriver);

  const availableDrivers = getAvailableDrivers(selectedDate);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Driver Scheduler
          </h1>
          <p className="text-muted-foreground mt-2">Plan and manage driver assignments with visual scheduling</p>
        </div>
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-xl transition-shadow">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Driver Assignment</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Driver</label>
                  <Select value={scheduleForm.driver_id} onValueChange={(val) => setScheduleForm({...scheduleForm, driver_id: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.filter(d => d.employment_status === 'active').map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <Input
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Time</label>
                  <Input
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Time</label>
                  <Input
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Activity Type</label>
                  <Select value={scheduleForm.activity_type} onValueChange={(val) => setScheduleForm({...scheduleForm, activity_type: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="off">Day Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Input
                  placeholder="Additional notes..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Schedule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Schedule Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        {/* Daily Schedule */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {formatDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Driver</label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignments */}
              <div className="space-y-3">
                {filteredAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No assignments for this date</p>
                  </div>
                ) : (
                  filteredAssignments.map((assignment) => {
                    const driver = drivers.find(d => d.id === assignment.driver_id);
                    const booking = bookings.find(b => b.id === assignment.booking_id);

                    return (
                      <div key={assignment.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={driver?.profile_image} />
                            <AvatarFallback className="text-xs">
                              {driver?.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{driver?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}
                            </p>
                            {booking && (
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {booking.booking_ref}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {booking.num_guests} guests
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Available Drivers */}
              {availableDrivers.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Available Drivers ({availableDrivers.length})
                  </h4>
                  <div className="space-y-2">
                    {availableDrivers.slice(0, 3).map(driver => (
                      <div key={driver.id} className="flex items-center gap-2 text-sm">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={driver.profile_image} />
                          <AvatarFallback className="text-xs">
                            {driver.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{driver.full_name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          Available
                        </Badge>
                      </div>
                    ))}
                    {availableDrivers.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{availableDrivers.length - 3} more available
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}