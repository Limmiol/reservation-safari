import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { Plus, Ticket, Eye, Download } from 'lucide-react';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import BookingInfoCard from '@/components/BookingInfoCard';
import { formatDate, generateRef } from '@/lib/helpers';

const RESET = { meal_plan: 'FB', status: 'draft' };

export default function Vouchers() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(RESET);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [voucherQr, setVoucherQr] = useState(null);
  const queryClient = useQueryClient();

  const openVoucher = async (v) => {
    setViewDoc(v);
    setVoucherQr(null);
    if (v?.booking_id) {
      try {
        const token = localStorage.getItem('rs_auth_token');
        const r = await fetch(`/api/bookings/${v.booking_id}/qr`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const { qr_data_url } = await r.json();
          setVoucherQr(qr_data_url);
        }
      } catch {}
    }
  };

  const { data: vouchers = [] } = useQuery({
    queryKey: ['vouchers'],
    queryFn: () => base44.entities.Voucher.list('-created_date', 200),
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Voucher.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
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
      package_name: b.package_name,
      num_guests: b.num_guests,
      check_in: b.start_date || '',
      check_out: b.end_date || '',
    }));
  };

  const close = () => { setShowForm(false); setFormData(RESET); setSelectedBooking(null); };

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title={t('vouchers')} description={t('manage_vouchers')}>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />{t('new_voucher')}</Button>
      </PageHeader>

      {vouchers.length === 0 ? (
        <EmptyState icon={Ticket} title={t('no_vouchers_yet')} description={t('create_vouchers_msg')} actionLabel={t('new_voucher')} onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('voucher_number')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('client')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('hotel')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('check_in')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('check_out')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('meal_plan')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('status')}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-mono">{v.voucher_number}</td>
                  <td className="px-6 py-3.5 text-sm font-medium">{v.client_name}</td>
                  <td className="px-6 py-3.5 text-sm">{v.hotel_name}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(v.check_in)}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(v.check_out)}</td>
                  <td className="px-6 py-3.5 text-sm">{v.meal_plan}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={v.status} /></td>
                  <td className="px-6 py-3.5 flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openVoucher(v)} title="View"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      try {
                        const res = await base44.functions.invoke('generateVoucherPDF', { voucher_id: v.id });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                        link.download = `Voucher-${v.voucher_number}.pdf`;
                        link.click();
                      } catch (err) {
                        console.error('Download failed:', err);
                      }
                    }} title="Download"><Download className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DocumentViewer open={!!viewDoc} onClose={() => { setViewDoc(null); setVoucherQr(null); }} type="voucher" document={viewDoc} qrDataUrl={voucherQr} />

      <Dialog open={showForm} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('new_voucher')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...formData, voucher_number: generateRef('VCH') }); }} className="space-y-4">
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
                    <Label>Client Name</Label>
                    <Input readOnly value={formData.client_name || ''} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Guests</Label>
                    <Input readOnly value={formData.num_guests || ''} className="bg-secondary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hotel Name *</Label>
                  <Input required value={formData.hotel_name || ''} onChange={(e) => setFormData(f => ({ ...f, hotel_name: e.target.value }))} placeholder="Enter hotel or lodge name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in *</Label>
                    <Input type="date" required value={formData.check_in || ''} onChange={(e) => setFormData(f => ({ ...f, check_in: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out *</Label>
                    <Input type="date" required value={formData.check_out || ''} onChange={(e) => setFormData(f => ({ ...f, check_out: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Input value={formData.room_type || ''} onChange={(e) => setFormData(f => ({ ...f, room_type: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meal Plan</Label>
                    <Select value={formData.meal_plan} onValueChange={(v) => setFormData(f => ({ ...f, meal_plan: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BB">BB (Bed & Breakfast)</SelectItem>
                        <SelectItem value="HB">HB (Half Board)</SelectItem>
                        <SelectItem value="FB">FB (Full Board)</SelectItem>
                        <SelectItem value="AI">AI (All Inclusive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Special Instructions</Label>
                  <Input value={formData.special_instructions || ''} onChange={(e) => setFormData(f => ({ ...f, special_instructions: e.target.value }))} />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>{t('cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.booking_id}>
                {createMutation.isPending ? t('creating') : t('create_voucher_btn')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}