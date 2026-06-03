import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ClipboardList, Eye } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import BookingInfoCard from '@/components/BookingInfoCard';
import { formatDate, generateRef } from '@/lib/helpers';

const RESET = { status: 'draft' };

export default function Manifests() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(RESET);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const queryClient = useQueryClient();

  const { data: manifests = [] } = useQuery({
    queryKey: ['manifests'],
    queryFn: () => base44.entities.Manifest.list('-created_date', 200),
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Manifest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
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
      package_name: b.package_name,
      num_passengers: b.num_guests,
      destination: b.package_name || '',
      trip_date: b.start_date || '',
    }));
  };

  const close = () => { setShowForm(false); setFormData(RESET); setSelectedBooking(null); };

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title={t('manifests')} description={t('manage_manifests')}>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />{t('new_manifest')}</Button>
      </PageHeader>

      {manifests.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t('no_manifests')} description={t('manage_manifests')} actionLabel={t('new_manifest')} onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('reference')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('booking')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('destination')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('trip_date')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('passengers')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('driver_guide')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('status')}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {manifests.map((m) => (
                <tr key={m.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-mono">{m.manifest_number}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{m.booking_ref}</td>
                  <td className="px-6 py-3.5 text-sm font-medium">{m.destination}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(m.trip_date)}</td>
                  <td className="px-6 py-3.5 text-sm text-center">{m.num_passengers}</td>
                  <td className="px-6 py-3.5 text-sm">{m.driver_guide || '—'}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={m.status} /></td>
                  <td className="px-6 py-3.5">
                    <Button variant="ghost" size="icon" onClick={() => setViewDoc(m)} title="View"><Eye className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DocumentViewer open={!!viewDoc} onClose={() => setViewDoc(null)} type="manifest" document={viewDoc} />

      <Dialog open={showForm} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('new_manifest')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...formData, manifest_number: generateRef('MAN') }); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Booking *</Label>
              <Select value={formData.booking_id || ''} onValueChange={handleBookingSelect}>
                <SelectTrigger><SelectValue placeholder="Select booking — data fills automatically" /></SelectTrigger>
                <SelectContent>
                  {bookings.map(b => <SelectItem key={b.id} value={b.id}>{b.booking_ref} — {b.client_name} · {b.package_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedBooking && <BookingInfoCard booking={selectedBooking} />}

            {selectedBooking && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Destination *</Label>
                    <Input required value={formData.destination || ''} onChange={(e) => setFormData(f => ({ ...f, destination: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trip Date *</Label>
                    <Input type="date" required value={formData.trip_date || ''} onChange={(e) => setFormData(f => ({ ...f, trip_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Passengers</Label>
                    <Input readOnly value={formData.num_passengers || ''} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle</Label>
                    <Input value={formData.vehicle || ''} onChange={(e) => setFormData(f => ({ ...f, vehicle: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Driver / Guide</Label>
                  <Input value={formData.driver_guide || ''} onChange={(e) => setFormData(f => ({ ...f, driver_guide: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input value={formData.emergency_contact || ''} onChange={(e) => setFormData(f => ({ ...f, emergency_contact: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes || ''} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.booking_id}>
                {createMutation.isPending ? 'Creating...' : 'Create Manifest'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}