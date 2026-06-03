import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Plane } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import BookingInfoCard from '@/components/BookingInfoCard';
import { formatDate } from '@/lib/helpers';

const RESET = { class: 'economy', status: 'booked' };

export default function Flights() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(RESET);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const queryClient = useQueryClient();

  const { data: flights = [] } = useQuery({
    queryKey: ['flights'],
    queryFn: () => base44.entities.FlightTicket.list('-created_date', 200),
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FlightTicket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flights'] });
      setShowForm(false);
      setFormData(RESET);
      setSelectedBooking(null);
    },
  });

  const handleBookingSelect = (bookingId) => {
    const b = bookings.find(b => b.id === bookingId);
    setSelectedBooking(b || null);
    if (!b) return;
    setFormData(f => ({
      ...f,
      booking_id: b.id,
      booking_ref: b.booking_ref,
      client_name: b.client_name,
      // Pre-fill passenger with client name, departure date with booking start
      passenger_name: b.client_name,
      departure_date: b.start_date || '',
    }));
  };

  const close = () => { setShowForm(false); setFormData(RESET); setSelectedBooking(null); };

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title={t('flights')} description={t('manage_flights')}>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />{t('add_flight')}</Button>
      </PageHeader>

      {flights.length === 0 ? (
        <EmptyState icon={Plane} title={t('no_flights')} description={t('manage_flights')} actionLabel={t('add_flight')} onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('passenger')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('flight_number')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('departure')} → {t('arrival')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('date')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Time</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Class</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flights.map((f) => (
                <tr key={f.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium">{f.passenger_name}</td>
                  <td className="px-6 py-3.5 text-sm">{f.airline} {f.flight_number}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{f.departure_city} → {f.arrival_city}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(f.departure_date)}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{f.departure_time || '—'}</td>
                  <td className="px-6 py-3.5 text-sm capitalize">{f.class}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('add_flight')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('booking')} *</Label>
              <Select value={formData.booking_id || ''} onValueChange={handleBookingSelect}>
                <SelectTrigger><SelectValue placeholder={t('select_booking_ph')} /></SelectTrigger>
                <SelectContent>
                  {bookings.map(b => <SelectItem key={b.id} value={b.id}>{b.booking_ref} — {b.client_name} · {b.package_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedBooking && <BookingInfoCard booking={selectedBooking} />}

            {selectedBooking && (
              <>
                <div className="space-y-2">
                  <Label>{t('passenger')} *</Label>
                  <Input required value={formData.passenger_name || ''} onChange={(e) => setFormData(f => ({ ...f, passenger_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('airline')} *</Label>
                    <Input required value={formData.airline || ''} onChange={(e) => setFormData(f => ({ ...f, airline: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('flight_number')} *</Label>
                    <Input required value={formData.flight_number || ''} onChange={(e) => setFormData(f => ({ ...f, flight_number: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From *</Label>
                    <Input required value={formData.departure_city || ''} onChange={(e) => setFormData(f => ({ ...f, departure_city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>To *</Label>
                    <Input required value={formData.arrival_city || ''} onChange={(e) => setFormData(f => ({ ...f, arrival_city: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input type="date" required value={formData.departure_date || ''} onChange={(e) => setFormData(f => ({ ...f, departure_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dep. Time</Label>
                    <Input type="time" value={formData.departure_time || ''} onChange={(e) => setFormData(f => ({ ...f, departure_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Arr. Time</Label>
                    <Input type="time" value={formData.arrival_time || ''} onChange={(e) => setFormData(f => ({ ...f, arrival_time: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>PNR</Label>
                    <Input value={formData.pnr || ''} onChange={(e) => setFormData(f => ({ ...f, pnr: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={formData.class} onValueChange={(v) => setFormData(f => ({ ...f, class: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="first">First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.booking_id}>
                {createMutation.isPending ? 'Adding...' : 'Add Flight'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}