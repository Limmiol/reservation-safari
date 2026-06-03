import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/ui/StatusBadge';
import { Plus, Trash2, Pencil } from 'lucide-react';

export default function ResourceAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    booking_id: '',
    start_date: '',
    end_date: '',
    vehicle_id: '',
    driver_id: '',
    status: 'pending',
    notes: '',
  });

  const queryClient = useQueryClient();
  const { data: assignments = [] } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: () => base44.entities.ResourceAssignment.list('-updated_date'),
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ResourceAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ResourceAssignment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource-assignments'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const booking = bookings.find(b => b.id === formData.booking_id);
    const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
    const driver = drivers.find(d => d.id === formData.driver_id);

    const submitData = {
      ...formData,
      booking_ref: booking?.booking_ref || '',
      vehicle_registration: vehicle?.registration_number || '',
      driver_name: driver?.full_name || '',
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const resetForm = () => {
    setFormData({
      booking_id: '',
      start_date: '',
      end_date: '',
      vehicle_id: '',
      driver_id: '',
      status: 'pending',
      notes: '',
    });
    setEditingId(null);
  };

  const handleEdit = (assignment) => {
    setFormData({
      booking_id: assignment.booking_id,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      vehicle_id: assignment.vehicle_id || '',
      driver_id: assignment.driver_id || '',
      status: assignment.status,
      notes: assignment.notes || '',
    });
    setEditingId(assignment.id);
    setIsOpen(true);
  };

  const filtered = assignments.filter(a =>
    a.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.driver_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">Resource Assignments</h1>
          <p className="text-muted-foreground mt-1">Assign vehicles, drivers, and equipment to bookings</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Create'} Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select value={formData.booking_id} onValueChange={(val) => setFormData({ ...formData, booking_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.booking_ref} - {booking.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
              <Select value={formData.vehicle_id} onValueChange={(val) => setFormData({ ...formData, vehicle_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} - {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formData.driver_id} onValueChange={(val) => setFormData({ ...formData, driver_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by booking or driver..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-accent">
              <tr>
                <th className="text-left p-4 font-medium">Booking</th>
                <th className="text-left p-4 font-medium">Dates</th>
                <th className="text-left p-4 font-medium">Vehicle</th>
                <th className="text-left p-4 font-medium">Driver</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-accent/30 transition-colors">
                  <td className="p-4 font-medium text-xs">{assignment.booking_ref}</td>
                  <td className="p-4 text-xs">
                    {assignment.start_date} to {assignment.end_date}
                  </td>
                  <td className="p-4 text-xs">{assignment.vehicle_registration || '-'}</td>
                  <td className="p-4 text-xs">{assignment.driver_name || '-'}</td>
                  <td className="p-4"><StatusBadge status={assignment.status} /></td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleEdit(assignment)}
                      className="text-primary hover:text-primary/80 mr-4 inline-block"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(assignment.id)}
                      className="text-destructive hover:text-destructive/80 inline-block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No assignments found</div>
        )}
      </div>
    </div>
  );
}