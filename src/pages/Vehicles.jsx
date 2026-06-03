import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRole } from '@/lib/useRole';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { formatCurrency } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import { Plus, Trash2, Pencil, Eye, Car, Users, Gauge, Fuel, ShieldCheck, CalendarClock, Wrench, Truck, Bus, Download, DollarSign } from 'lucide-react';
import VehicleDetailsPanel from '@/components/vehicles/VehicleDetailsPanel';
import ReportDownloadModal from '@/components/ReportDownloadModal';

export default function Vehicles() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { isGuide } = useRole();
  const readOnly = isGuide;
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: '',
    name: '',
    vehicle_type: 'safari',
    seating_capacity: '',
    year_manufactured: '',
    maintenance_status: 'operational',
    last_maintenance_date: '',
    next_maintenance_date: '',
    mileage: '',
    fuel_capacity: '',
    insurance_expiry: '',
    inspection_expiry: '',
  });

  const queryClient = useQueryClient();
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('-updated_date'),
  });

  // Vehicle expenses = maintenance-category expenses
  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-expense_date'),
  });

  // Get all bookings for vehicle tracking
  const { data: allBookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-start_date'),
  });

  // Get all vehicle expenses for profit calculations
  const { data: allVehicleExpenses = [] } = useQuery({
    queryKey: ['vehicle-expenses-all'],
    queryFn: () => base44.entities.VehicleExpense.list('-expense_date'),
  });

  const vehicleExpenses = allExpenses.filter(e => e.category === 'maintenance');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      seating_capacity: parseInt(formData.seating_capacity),
      year_manufactured: parseInt(formData.year_manufactured),
      mileage: parseFloat(formData.mileage),
      fuel_capacity: parseFloat(formData.fuel_capacity),
    };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const resetForm = () => {
    setFormData({
      registration_number: '',
      name: '',
      vehicle_type: 'safari',
      seating_capacity: '',
      year_manufactured: '',
      maintenance_status: 'operational',
      last_maintenance_date: '',
      next_maintenance_date: '',
      mileage: '',
      fuel_capacity: '',
      insurance_expiry: '',
      inspection_expiry: '',
    });
    setEditingId(null);
  };

  const handleEdit = (vehicle) => {
    setFormData({
      registration_number: vehicle.registration_number,
      name: vehicle.name,
      vehicle_type: vehicle.vehicle_type,
      seating_capacity: vehicle.seating_capacity?.toString() || '',
      year_manufactured: vehicle.year_manufactured?.toString() || '',
      maintenance_status: vehicle.maintenance_status,
      last_maintenance_date: vehicle.last_maintenance_date || '',
      next_maintenance_date: vehicle.next_maintenance_date || '',
      mileage: vehicle.mileage?.toString() || '',
      fuel_capacity: vehicle.fuel_capacity?.toString() || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      inspection_expiry: vehicle.inspection_expiry || '',
    });
    setEditingId(vehicle.id);
    setIsOpen(true);
  };

  const filtered = vehicles.filter(v =>
    v.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate vehicle metrics
  const getVehicleMetrics = (vehicle) => {
    const vehicleBookings = allBookings.filter(b => b.vehicle_id === vehicle.id);
    const totalTrips = vehicleBookings.length;
    const completedTrips = vehicleBookings.filter(b => b.status === 'completed');
    const completedTripsCount = completedTrips.length;

    // Calculate revenue by currency
    const revenueByCurrency = completedTrips.reduce((acc, b) => {
      const curr = b.currency || 'USD';
      acc[curr] = (acc[curr] || 0) + (b.total_amount || 0);
      return acc;
    }, {});

    // Calculate expenses by currency for this vehicle
    const vehicleExpenses = allVehicleExpenses.filter(e => e.vehicle_id === vehicle.id);
    const expensesByCurrency = vehicleExpenses.reduce((acc, e) => {
      const curr = e.currency || 'TZS';
      acc[curr] = (acc[curr] || 0) + (e.amount || 0);
      return acc;
    }, {});

    // Calculate profit by currency
    const profitByCurrency = {};
    Object.keys(revenueByCurrency).forEach(curr => {
      profitByCurrency[curr] = (revenueByCurrency[curr] || 0) - (expensesByCurrency[curr] || 0);
    });
    // Include currencies with expenses but no revenue
    Object.keys(expensesByCurrency).forEach(curr => {
      if (!profitByCurrency[curr]) {
        profitByCurrency[curr] = 0 - (expensesByCurrency[curr] || 0);
      }
    });

    const totalRevenue = Object.values(revenueByCurrency).reduce((sum, amt) => sum + amt, 0);
    const totalExpenses = Object.values(expensesByCurrency).reduce((sum, amt) => sum + amt, 0);
    const totalGuests = completedTrips.reduce((sum, b) => sum + (b.num_guests || 0), 0);

    return {
      totalTrips,
      completedTrips: completedTripsCount,
      totalRevenue,
      totalGuests,
      totalExpenses,
      profit: Object.values(profitByCurrency).reduce((sum, profit) => sum + profit, 0),
      profitByCurrency
    };
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">{t('vehicles')}</h1>
          <p className="text-muted-foreground mt-1">{t('manage_fleet')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReportOpen(true)} className="gap-2">
            <Download className="w-4 h-4" />Vehicle Expenses
          </Button>
        {!readOnly && <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              {t('add_vehicle')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? t('edit_vehicle') : t('add_vehicle')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Registration #"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  required
                />
                <Input
                  placeholder="Vehicle Model"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Select value={formData.vehicle_type} onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4x4_safari">4x4 Safari</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Seating"
                  value={formData.seating_capacity}
                  onChange={(e) => setFormData({ ...formData, seating_capacity: e.target.value })}
                  required
                />
                <Input
                  type="number"
                  placeholder="Year"
                  value={formData.year_manufactured}
                  onChange={(e) => setFormData({ ...formData, year_manufactured: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Mileage"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Fuel Cap (L)"
                  value={formData.fuel_capacity}
                  onChange={(e) => setFormData({ ...formData, fuel_capacity: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Insurance Expiry"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Inspection"
                  value={formData.inspection_expiry}
                  onChange={(e) => setFormData({ ...formData, inspection_expiry: e.target.value })}
                />
                <Select value={formData.maintenance_status} onValueChange={(val) => setFormData({ ...formData, maintenance_status: val })} className="col-span-2">
                  <SelectTrigger>
                    <SelectValue placeholder="Maintenance Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance_due">Maintenance Due</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} size="sm">{t('cancel')}</Button>
                <Button type="submit" size="sm">{editingId ? t('update') : t('create')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>}
        </div>
      </div>

      <ReportDownloadModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        type="vehicle_expenses"
        allRecords={vehicleExpenses}
        vehicles={vehicles}
      />

      <div className="mb-6">
        <Input
          placeholder="Search by registration or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Car className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">{t('no_vehicles')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((vehicle) => {
            const statusColor = {
              operational: 'bg-emerald-500',
              maintenance_due: 'bg-amber-400',
              under_maintenance: 'bg-orange-500',
              out_of_service: 'bg-red-500',
            }[vehicle.maintenance_status] || 'bg-gray-400';

            const TypeIcon = {
              '4x4_safari': Car,
              van: Car,
              bus: Bus,
              truck: Truck,
              other: Car,
            }[vehicle.vehicle_type] || Car;

            const metrics = getVehicleMetrics(vehicle);

            return (
              <div
                key={vehicle.id}
                className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >


                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold leading-tight font-mono">{vehicle.registration_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{vehicle.name}</p>
                    </div>
                  </div>
                  {/* Status dot */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                    <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
                    <span className="text-xs text-muted-foreground capitalize hidden sm:block">{vehicle.maintenance_status?.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-5 border-t border-border" />

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-px bg-border mx-5 my-3 rounded-xl overflow-hidden">
                  <div className="bg-card px-3 py-2 flex flex-col items-center text-center">
                    <Users className="w-3.5 h-3.5 text-primary mb-1" />
                    <span className="text-sm font-semibold">{vehicle.seating_capacity || '—'}</span>
                    <span className="text-[10px] text-muted-foreground">Seats</span>
                  </div>
                  <div className="bg-card px-3 py-2 flex flex-col items-center text-center">
                    <Gauge className="w-3.5 h-3.5 text-primary mb-1" />
                    <span className="text-sm font-semibold">{vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()}` : '—'}</span>
                    <span className="text-[10px] text-muted-foreground">km</span>
                  </div>
                  <div className="bg-card px-3 py-2 flex flex-col items-center text-center">
                    <Fuel className="w-3.5 h-3.5 text-primary mb-1" />
                    <span className="text-sm font-semibold">{vehicle.fuel_capacity || '—'}</span>
                    <span className="text-[10px] text-muted-foreground">L Tank</span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="px-5 space-y-1.5 pb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5" /> Insurance</span>
                    <span className={`font-medium ${vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < new Date() ? 'text-red-500' : 'text-foreground'}`}>
                      {vehicle.insurance_expiry || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Wrench className="w-3.5 h-3.5" /> Next Service</span>
                    <span className={`font-medium ${vehicle.next_maintenance_date && new Date(vehicle.next_maintenance_date) < new Date() ? 'text-amber-500' : 'text-foreground'}`}>
                      {vehicle.next_maintenance_date || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarClock className="w-3.5 h-3.5" /> Year</span>
                    <span className="font-medium">{vehicle.year_manufactured || '—'}</span>
                  </div>
                </div>

                {/* Tracking Metrics */}
                <div className="px-5 pb-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <div className="font-semibold text-primary">{metrics.completedTrips}</div>
                      <div className="text-muted-foreground">Completed</div>
                    </div>
                    <div className={`bg-muted/30 rounded-lg p-2 text-center ${metrics.profit >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                      <div className={`font-semibold ${metrics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(metrics.profit))}
                      </div>
                      <div className="text-muted-foreground">Profit</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border flex divide-x divide-border">
                  <button
                    onClick={() => setSelectedVehicleDetails(vehicle)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> {t('view')}
                  </button>
                  {!readOnly && <>
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> {t('edit')}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(vehicle.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
                    </button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vehicle Details Modal */}
      {selectedVehicleDetails && (
        <Dialog open={!!selectedVehicleDetails} onOpenChange={(open) => !open && setSelectedVehicleDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('vehicle_details_expenses')}</DialogTitle>
            </DialogHeader>
            <VehicleDetailsPanel vehicle={selectedVehicleDetails} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}