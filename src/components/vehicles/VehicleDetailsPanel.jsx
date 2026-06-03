import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { getUserBusinessCurrency, formatDate } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/ui/StatusBadge';
import { AlertTriangle, Plus, Trash2, Pencil, Calendar, DollarSign, Activity, TrendingUp, MapPin, Users, Clock, BarChart3, Upload, FileText } from 'lucide-react';
import CurrencySelect, { CURRENCY_SYMBOLS } from '@/components/ui/CurrencySelect';
import { toast } from 'sonner';

const EMPTY_FORM = {
  expense_type: 'maintenance',
  amount: '',
  currency: 'TZS', // This will be overridden in the component
  expense_date: new Date().toISOString().split('T')[0],
  description: '',
  vendor_name: '',
  odometer_reading: '',
  notes: '',
  receipt_url: '',
  expense_id: '',
};

export default function VehicleDetailsPanel({ vehicle }) {
  const { user, isLoadingAuth } = useAuth();
  const defaultCurrency = user ? getUserBusinessCurrency(user) : 'TZS';

  const fmt = (n, currency = defaultCurrency) => {
    const sym = CURRENCY_SYMBOLS[currency] || currency;
    return `${sym} ${Number(n || 0).toLocaleString('en-US')}`;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM, currency: defaultCurrency });
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({});
  const queryClient = useQueryClient();

  if (isLoadingAuth) {
    return <div className="p-6 flex items-center justify-center">Loading...</div>;
  }

  // Initialize vehicle form data when vehicle changes
  useEffect(() => {
    setVehicleFormData({
      registration_number: vehicle.registration_number || '',
      name: vehicle.name || '',
      vehicle_type: vehicle.vehicle_type || '4x4_safari',
      seating_capacity: vehicle.seating_capacity || '',
      year_manufactured: vehicle.year_manufactured || '',
      mileage: vehicle.mileage || '',
      fuel_capacity: vehicle.fuel_capacity || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      inspection_expiry: vehicle.inspection_expiry || '',
      next_maintenance_date: vehicle.next_maintenance_date || '',
      maintenance_status: vehicle.maintenance_status || 'operational',
    });
  }, [vehicle]);

  const updateVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.update(vehicle.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setEditingVehicle(false);
      toast.success('Vehicle updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update vehicle');
      console.error('Update error:', error);
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['vehicle-expenses', vehicle.id],
    queryFn: () => base44.entities.VehicleExpense.filter({ vehicle_id: vehicle.id }, '-expense_date'),
  });

  // Get all bookings for this vehicle
  const { data: vehicleBookings = [] } = useQuery({
    queryKey: ['vehicle-bookings', vehicle.id],
    queryFn: () => base44.entities.Booking.filter({ vehicle_id: vehicle.id }, '-start_date'),
  });

  // Get resource assignments for this vehicle
  const { data: vehicleAssignments = [] } = useQuery({
    queryKey: ['vehicle-assignments', vehicle.id],
    queryFn: () => base44.entities.ResourceAssignment.filter({ vehicle_id: vehicle.id }, '-start_date'),
  });

  // Get all drivers
  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Find current driver assignment
  const currentAssignment = vehicleAssignments
    .filter(a => a.status === 'active' || a.status === 'confirmed')
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];

  const currentDriver = currentAssignment ? allDrivers.find(d => d.id === currentAssignment.driver_id) : null;

  // Find driver for a booking
  const getDriverForBooking = (bookingId) => {
    const assignment = vehicleAssignments.find(a => 
      a.booking_id === bookingId && 
      a.resource_type === 'driver' &&
      new Date(a.start_date) <= new Date() &&
      new Date(a.end_date) >= new Date()
    );
    return assignment ? allDrivers.find(d => d.id === assignment.driver_id) : null;
  };

  // Get all packages for reference
  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.Package.list(),
  });

  // Get all clients for reference
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, vehicle_id: vehicle.id, registration_number: vehicle.registration_number };
      const expensePayload = {
        title: data.description || `${data.expense_type || 'Vehicle'} expense`,
        category: data.expense_type || 'other',
        amount: parseFloat(data.amount) || 0,
        currency: data.currency || defaultCurrency || 'USD',
        expense_date: data.expense_date,
        vendor: data.vendor_name,
        payment_method: data.payment_method || 'other',
        notes: data.notes,
        status: data.status || 'approved',
        vehicle_id: vehicle.id,
        vehicle_registration_number: vehicle.registration_number,
        vehicle_expense_type: data.expense_type,
      };

      if (editingId) {
        let expenseRecord;
        if (data.expense_id) {
          expenseRecord = await base44.entities.Expense.update(data.expense_id, expensePayload);
        } else {
          expenseRecord = await base44.entities.Expense.create(expensePayload);
          payload.expense_id = expenseRecord.id;
        }
        await base44.entities.VehicleExpense.update(editingId, payload);
        return { vehicleExpense: editingId, expense: expenseRecord };
      }

      const vehicleExpense = await base44.entities.VehicleExpense.create(payload);
      try {
        const expenseRecord = await base44.entities.Expense.create(expensePayload);
        await base44.entities.VehicleExpense.update(vehicleExpense.id, { expense_id: expenseRecord.id });
        return { vehicleExpense, expense: expenseRecord };
      } catch (error) {
        await base44.entities.VehicleExpense.delete(vehicleExpense.id);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses', vehicle.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses-all'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses', 'financial-statements'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'financial-statements'] });
      setShowForm(false);
      setEditingId(null);
      setFormData({ ...EMPTY_FORM, currency: defaultCurrency });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const existing = await base44.entities.VehicleExpense.read(id);
      await base44.entities.VehicleExpense.delete(id);
      if (existing?.expense_id) {
        await base44.entities.Expense.delete(existing.expense_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses', vehicle.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses-all'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses', 'financial-statements'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'financial-statements'] });
    },
  });

  const openNew = () => { setEditingId(null); setFormData({ ...EMPTY_FORM, currency: defaultCurrency }); setShowForm(true); };
  const openEdit = (exp) => {
    setEditingId(exp.id);
    setFormData({
      expense_type: exp.expense_type,
      amount: String(exp.amount || ''),
      currency: exp.currency || defaultCurrency,
      expense_date: exp.expense_date || '',
      description: exp.description || '',
      vendor_name: exp.vendor_name || '',
      odometer_reading: String(exp.odometer_reading || ''),
      notes: exp.notes || '',
      receipt_url: exp.receipt_url || '',
      expense_id: exp.expense_id || '',
    });
    setShowForm(true);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(f => ({ ...f, receipt_url: file_url }));
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload receipt');
      console.error('Upload error:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, amount: parseFloat(formData.amount) || 0 });
  };

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const maintenanceTotal = expenses.filter(e => ['maintenance','repair','service'].includes(e.expense_type)).reduce((s, e) => s + (e.amount || 0), 0);

  // Group totals by currency
  const totalsByCurrency = expenses.reduce((acc, e) => {
    const curr = e.currency || defaultCurrency;
    acc[curr] = (acc[curr] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const maintenanceTotalsByCurrency = expenses.filter(e => ['maintenance','repair','service'].includes(e.expense_type)).reduce((acc, e) => {
    const curr = e.currency || defaultCurrency;
    acc[curr] = (acc[curr] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const fuelTotalsByCurrency = expenses.filter(e => e.expense_type === 'fuel').reduce((acc, e) => {
    const curr = e.currency || defaultCurrency;
    acc[curr] = (acc[curr] || 0) + (e.amount || 0);
    return acc;
  }, {});

  // Calculate vehicle tracking metrics
  const completedTrips = vehicleBookings.filter(b => b.status === 'completed');
  const activeTrips = vehicleBookings.filter(b => ['confirmed', 'in_progress'].includes(b.status));
  const totalRevenue = completedTrips.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
  const totalPaid = completedTrips.reduce((sum, booking) => sum + (booking.amount_paid || 0), 0);
  const totalGuests = completedTrips.reduce((sum, booking) => sum + (booking.num_guests || 0), 0);

  // Group revenue by currency (like expenses)
  const revenueByCurrency = completedTrips.reduce((acc, booking) => {
    const curr = booking.currency || defaultCurrency;
    acc[curr] = (acc[curr] || 0) + (booking.total_amount || 0);
    return acc;
  }, {});

  // Calculate net profit by currency (revenue - expenses for each currency)
  const netProfitByCurrency = {};
  Object.keys(revenueByCurrency).forEach(curr => {
    netProfitByCurrency[curr] = (revenueByCurrency[curr] || 0) - (totalsByCurrency[curr] || 0);
  });
  // Also include currencies that have expenses but no revenue
  Object.keys(totalsByCurrency).forEach(curr => {
    if (!netProfitByCurrency[curr]) {
      netProfitByCurrency[curr] = 0 - (totalsByCurrency[curr] || 0);
    }
  });

  const netProfit = Object.values(netProfitByCurrency).reduce((sum, profit) => sum + profit, 0);
  
  // Calculate utilization (rough estimate based on days with bookings)
  const currentYear = new Date().getFullYear();
  const daysWithBookings = new Set(
    vehicleBookings
      .filter(b => new Date(b.start_date).getFullYear() === currentYear)
      .flatMap(b => {
        const start = new Date(b.start_date);
        const end = new Date(b.end_date);
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push(d.toDateString());
        }
        return days;
      })
  ).size;
  
  const utilizationRate = Math.round((daysWithBookings / 365) * 100);

  // Group bookings by month for revenue tracking
  const revenueByMonth = vehicleBookings.reduce((acc, booking) => {
    const month = new Date(booking.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    acc[month] = (acc[month] || 0) + (booking.total_amount || 0);
    return acc;
  }, {});

  // Calculate average revenue per trip
  const avgRevenuePerTrip = completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;

  const insuranceExpiring = vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < new Date(Date.now() + 30 * 86400000);
  const inspectionExpiring = vehicle.inspection_expiry && new Date(vehicle.inspection_expiry) < new Date(Date.now() + 30 * 86400000);
  const maintenanceDue = vehicle.next_maintenance_date && new Date(vehicle.next_maintenance_date) < new Date(Date.now() + 7 * 86400000);

  return (
    <Tabs defaultValue="overview" className="space-y-5">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="trips">Trip History</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="expenses">Expenses</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-5">
        {/* Vehicle Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {editingVehicle ? 'Edit Vehicle' : `${vehicle.registration_number} — ${vehicle.name}`}
              </CardTitle>
              {!editingVehicle ? (
                <Button size="sm" variant="outline" onClick={() => setEditingVehicle(true)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingVehicle(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => updateVehicleMutation.mutate(vehicleFormData)} disabled={updateVehicleMutation.isPending}>
                    {updateVehicleMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingVehicle ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Registration Number</label>
                    <Input
                      className="mt-1"
                      value={vehicleFormData.registration_number}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Model</label>
                    <Input
                      className="mt-1"
                      value={vehicleFormData.name}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Type</label>
                    <Select
                      value={vehicleFormData.vehicle_type}
                      onValueChange={(val) => setVehicleFormData(prev => ({ ...prev, vehicle_type: val }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4x4_safari">4x4 Safari</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="bus">Bus</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Seating Capacity</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={vehicleFormData.seating_capacity}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, seating_capacity: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Year Manufactured</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={vehicleFormData.year_manufactured}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, year_manufactured: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Mileage</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={vehicleFormData.mileage}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, mileage: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fuel Capacity (L)</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={vehicleFormData.fuel_capacity}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, fuel_capacity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Maintenance Status</label>
                    <Select
                      value={vehicleFormData.maintenance_status}
                      onValueChange={(val) => setVehicleFormData(prev => ({ ...prev, maintenance_status: val }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="maintenance_due">Maintenance Due</SelectItem>
                        <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                        <SelectItem value="out_of_service">Out of Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Insurance Expiry</label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={vehicleFormData.insurance_expiry}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Inspection Expiry</label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={vehicleFormData.inspection_expiry}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, inspection_expiry: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Next Maintenance</label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={vehicleFormData.next_maintenance_date}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, next_maintenance_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-medium">{vehicle.seating_capacity} pax</p></div>
                  <div><p className="text-xs text-muted-foreground">Mileage</p><p className="font-medium">{vehicle.mileage?.toLocaleString() || '—'} km</p></div>
                  <div><p className="text-xs text-muted-foreground">Year</p><p className="font-medium">{vehicle.year_manufactured || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Fuel Tank</p><p className="font-medium">{vehicle.fuel_capacity || '—'} L</p></div>
                  <div><p className="text-xs text-muted-foreground">Insurance</p><p className={`font-medium text-xs ${insuranceExpiring ? 'text-red-500' : ''}`}>{vehicle.insurance_expiry || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Next Service</p><p className={`font-medium text-xs ${vehicle.next_maintenance_date && new Date(vehicle.next_maintenance_date) < new Date() ? 'text-amber-500' : ''}`}>{vehicle.next_maintenance_date || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Inspection</p><p className={`font-medium text-xs ${inspectionExpiring ? 'text-red-500' : ''}`}>{vehicle.inspection_expiry || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={vehicle.maintenance_status} /></div>
                </div>
                {(insuranceExpiring || inspectionExpiring || maintenanceDue) && (
                  <div className="mt-3 space-y-1.5">
                    {insuranceExpiring && (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Insurance expires {formatDate(vehicle.insurance_expiry)}
                      </div>
                    )}
                    {inspectionExpiring && (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Inspection expires {formatDate(vehicle.inspection_expiry)}
                      </div>
                    )}
                    {maintenanceDue && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Maintenance due {formatDate(vehicle.next_maintenance_date)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Current Driver */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Current Driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentDriver ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{currentDriver.full_name}</p>
                    <p className="text-sm text-muted-foreground">{currentDriver.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{currentDriver.phone || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">License</p><p className="font-medium">{currentDriver.license_number || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">License Expiry</p><p className={`font-medium text-xs ${currentDriver.license_expiry && new Date(currentDriver.license_expiry) < new Date() ? 'text-red-500' : ''}`}>{currentDriver.license_expiry || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Experience</p><p className="font-medium">{currentDriver.experience_years ? `${currentDriver.experience_years} years` : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={currentDriver.availability_status} /></div>
                  <div><p className="text-xs text-muted-foreground">Languages</p><p className="font-medium">{currentDriver.languages_spoken || '—'}</p></div>
                </div>
                {currentAssignment && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Current Assignment</p>
                    <p className="text-sm font-medium">
                      {formatDate(currentAssignment.start_date)} - {formatDate(currentAssignment.end_date)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No driver currently assigned</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trips</p>
                  <p className="text-2xl font-bold">{vehicleBookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(revenueByCurrency).length > 1 
                      ? Object.entries(revenueByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')
                      : fmt(totalRevenue, Object.keys(revenueByCurrency)[0] || defaultCurrency)
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Guests</p>
                  <p className="text-2xl font-bold">{totalGuests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilization</p>
                  <p className="text-2xl font-bold">{utilizationRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Month Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Revenue by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(revenueByMonth).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No revenue data available</p>
              ) : (
                Object.entries(revenueByMonth).map(([month, revenue]) => (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{month}</span>
                    <span className="text-sm font-semibold">{fmt(revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trips" className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Trip History</CardTitle>
              <p className="text-sm text-muted-foreground">All trips assigned to this vehicle</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Trips</p>
              <p className="text-lg font-bold">{vehicleBookings.length}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {vehicleBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No trips assigned to this vehicle yet.</p>
            ) : (
              <div className="space-y-3">
                {vehicleBookings.map((booking) => {
                  const packageInfo = packages.find(p => p.id === booking.package_id);
                  const clientInfo = clients.find(c => c.id === booking.client_id);
                  const bookingDriver = getDriverForBooking(booking.id);
                  
                  return (
                    <div key={booking.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{booking.booking_ref}</h4>
                          <p className="text-sm text-muted-foreground">{packageInfo?.name || 'Unknown Package'}</p>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Client</p>
                          <p className="font-medium">{clientInfo?.full_name || booking.client_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Driver</p>
                          <p className="font-medium">{bookingDriver?.full_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dates</p>
                          <p className="font-medium">{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Guests</p>
                          <p className="font-medium">{booking.num_guests}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="font-medium">{fmt(booking.total_amount, booking.currency || defaultCurrency)}</p>
                        </div>
                      </div>
                      
                      {booking.special_requests && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">Special Requests</p>
                          <p className="text-sm">{booking.special_requests}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="activities" className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Trip Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completed Trips</span>
                <span className="font-semibold">{completedTrips.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Trips</span>
                <span className="font-semibold">{activeTrips.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Guests Served</span>
                <span className="font-semibold">{totalGuests}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Revenue per Trip</span>
                <span className="font-semibold">{fmt(avgRevenuePerTrip)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Outstanding Payments</span>
                <span className="font-semibold">{fmt(totalRevenue - totalPaid)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Popular Destinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const destinationCount = vehicleBookings.reduce((acc, booking) => {
                    const packageInfo = packages.find(p => p.id === booking.package_id);
                    const destination = packageInfo?.name || 'Unknown';
                    acc[destination] = (acc[destination] || 0) + 1;
                    return acc;
                  }, {});
                  
                  return Object.entries(destinationCount)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([destination, count]) => (
                      <div key={destination} className="flex justify-between items-center">
                        <span className="text-sm">{destination}</span>
                        <span className="text-sm font-semibold">{count} trips</span>
                      </div>
                    ));
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicleBookings
                .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                .slice(0, 10)
                .map((booking) => {
                  const packageInfo = packages.find(p => p.id === booking.package_id);
                  return (
                    <div key={booking.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{booking.booking_ref}</p>
                        <p className="text-xs text-muted-foreground">{packageInfo?.name || 'Unknown Package'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmt(booking.total_amount, booking.currency || defaultCurrency)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(booking.start_date)}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="expenses" className="space-y-5">
        {/* Expense Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-bold text-green-600">
                    {Object.entries(revenueByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-lg font-bold">
                    {Object.entries(totalsByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Fuel Expenses</p>
                  <p className="text-lg font-bold">
                    {Object.entries(fuelTotalsByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className={`w-4 h-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Object.entries(netProfitByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Expenses</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Total: <span className="font-semibold text-foreground">
                  {Object.entries(totalsByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')}
                </span>
              </p>
            </div>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded for this vehicle.</p>
            ) : (
              <div className="border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Odometer</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Vendor</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Receipt</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{formatDate(exp.expense_date)}</td>
                        <td className="px-3 py-2.5 font-medium capitalize">{(exp.expense_type || '').replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{exp.odometer_reading ? `${Number(exp.odometer_reading).toLocaleString()} km` : '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{exp.vendor_name || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{exp.description || '—'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{fmt(exp.amount, exp.currency)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {exp.receipt_url ? (
                            <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(exp)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(exp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/20">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-base">
                        {Object.entries(totalsByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Maintenance summary */}
            {Object.keys(maintenanceTotalsByCurrency).length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Maintenance / Repair / Service total: <span className="font-semibold text-foreground">
                  {Object.entries(maintenanceTotalsByCurrency).map(([curr, amt]) => fmt(amt, curr)).join(' + ')}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Add / Edit Expense Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingId(null); setFormData(EMPTY_FORM); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Vehicle Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Expense Type</label>
              <Select value={formData.expense_type} onValueChange={(v) => setFormData(f => ({ ...f, expense_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="spare_parts">Spare Parts</SelectItem>
                  <SelectItem value="tyres">Tyres</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="tolls">Tolls</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" className="mt-1" placeholder="0" value={formData.amount} onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))} required min="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <CurrencySelect className="mt-1" value={formData.currency || defaultCurrency} onValueChange={(v) => setFormData(f => ({ ...f, currency: v }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" className="mt-1" value={formData.expense_date} onChange={(e) => setFormData(f => ({ ...f, expense_date: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium">Odometer Reading</label>
                <Input type="number" className="mt-1" placeholder="e.g. 125000" value={formData.odometer_reading} onChange={(e) => setFormData(f => ({ ...f, odometer_reading: e.target.value }))} min="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Vendor / Provider</label>
              <Input className="mt-1" placeholder="e.g. Shell Station" value={formData.vendor_name} onChange={(e) => setFormData(f => ({ ...f, vendor_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input className="mt-1" placeholder="Details about the expense" value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea className="mt-1" placeholder="Additional notes or details" value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Receipt/Document</label>
              <div className="mt-1 flex gap-2">
                <Input placeholder="Receipt URL or upload file" value={formData.receipt_url} onChange={(e) => setFormData(f => ({ ...f, receipt_url: e.target.value }))} />
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('receipt-upload').click()}>
                  <Upload className="w-4 h-4" />
                </Button>
                <input id="receipt-upload" type="file" accept="image/*,.pdf" className="hidden" onChange={handleReceiptUpload} />
              </div>
              {formData.receipt_url && (
                <p className="text-xs text-muted-foreground mt-1">
                  <a href={formData.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View receipt</a>
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setFormData(EMPTY_FORM); }}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{editingId ? 'Update' : 'Add Expense'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
