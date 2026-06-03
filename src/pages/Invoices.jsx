import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Receipt, Eye, Download, Send, Search, DollarSign, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { celebrate } from '@/lib/confetti';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import BookingInfoCard from '@/components/BookingInfoCard';
import { formatCurrency, formatDate, generateRef } from '@/lib/helpers';
import { safeJson } from '@/lib/safeJson';
import { buildApiUrl } from '@/api/localClient';
import { cn } from '@/lib/utils';

const RESET = { status: 'draft' };

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES = {
  draft:          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent:           'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  paid:           'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  overdue:        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cancelled:      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export default function Invoices() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(RESET);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.list('-created_date', 200);
      return user?.role === 'admin' ? allInvoices : allInvoices.filter(i => i.created_by === user?.email);
    },
    enabled: !!user,
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', user?.email],
    queryFn: async () => {
      const allBookings = await base44.entities.Booking.list('-created_date', 200);
      return user?.role === 'admin' ? allBookings : allBookings.filter(b => b.created_by === user?.email);
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => {
      celebrate();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowForm(false);
      setFormData(RESET);
      setSelectedBooking(null);
    },
  });

  const handleBookingSelect = (bookingId) => {
    const b = bookings.find(b => b.id === bookingId);
    setSelectedBooking(b || null);
    if (!b) return;
    const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setFormData({
      status: 'draft',
      booking_id: b.id,
      booking_ref: b.booking_ref,
      client_id: b.client_id,
      client_name: b.client_name,
      client_email: b.client_email,
      items: JSON.stringify([{ description: b.package_name, qty: b.num_guests, unit_price: (b.total_amount || 0) / (b.num_guests || 1), total: b.total_amount || 0 }]),
      subtotal: b.total_amount || 0,
      total: b.total_amount || 0,
      due_date: due,
    });
  };

  const close = () => { setShowForm(false); setFormData(RESET); setSelectedBooking(null); };

  const [sendingEmail, setSendingEmail] = useState(null);
  const sendInvoiceEmail = async (inv) => {
    if (!inv.client_email) { toast({ title: 'No client email', description: 'This invoice has no client email address.', variant: 'destructive' }); return; }
    setSendingEmail(inv.id);
    try {
      let parsedItems = [];
      try { parsedItems = inv.items ? JSON.parse(inv.items) : []; } catch {}
      const res = await fetch(buildApiUrl('/api/email/send-invoice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify({
          invoice_number: inv.invoice_number, client_name: inv.client_name, client_email: inv.client_email,
          total: inv.total, amount_paid: inv.amount_paid || 0, due_date: inv.due_date,
          booking_ref: inv.booking_ref, notes: inv.notes, items: parsedItems, currency: inv.currency || 'USD',
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast({ title: 'Invoice sent!', description: `Emailed to ${inv.client_email}` });
      updateMutation.mutate({ id: inv.id, data: { status: 'sent' } });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(null);
    }
  };

  // KPI calculations
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const outstanding = invoices
    .filter(i => !['paid', 'cancelled'].includes(i.status))
    .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  // Filtered list
  const filtered = invoices.filter(inv => {
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.client_name || '').toLowerCase().includes(q) ||
      (inv.booking_ref || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const isDueOverdue = (inv) => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return false;
    return inv.due_date && new Date(inv.due_date) < new Date();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <PageHeader title={t('invoices')} description={t('track_manage_invoices')}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />{t('new_invoice_btn')}</Button>
      </PageHeader>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-lg font-bold">{formatCurrency(totalInvoiced)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(outstanding)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{overdueCount} invoice{overdueCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit flex-wrap">
        {STATUS_TABS.map(tab => {
          const count = tab.value === 'all' ? invoices.length : invoices.filter(i => i.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                statusFilter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full",
                  statusFilter === tab.value
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        invoices.length === 0
          ? <EmptyState icon={Receipt} title={t('no_invoices_yet')} description={t('create_invoice_booking')} actionLabel={t('new_invoice_btn')} onAction={() => setShowForm(true)} />
          : <EmptyState icon={Search} title="No matching invoices" description="Try adjusting your search or filter." />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('invoice_number')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('client')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('booking')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('due_date')}</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('total')}</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('paid')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('status')}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-3.5 text-sm font-mono font-medium">{inv.invoice_number}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium">{inv.client_name}</p>
                    {inv.client_email && <p className="text-xs text-muted-foreground">{inv.client_email}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{inv.booking_ref}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("text-sm", isDueOverdue(inv) && "text-red-600 dark:text-red-400 font-medium")}>
                      {formatDate(inv.due_date)}
                    </span>
                    {isDueOverdue(inv) && <span className="ml-1 text-xs text-red-500">• overdue</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-right">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3.5 text-sm text-right">
                    <span className={cn(inv.amount_paid > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground")}>
                      {formatCurrency(inv.amount_paid || 0)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Select value={inv.status} onValueChange={(v) => updateMutation.mutate({ id: inv.id, data: { status: v } })}>
                      <SelectTrigger className="w-36 h-7 text-xs border-0 shadow-none bg-transparent p-0 focus:ring-0">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_STYLES[inv.status] || STATUS_STYLES.draft)}>
                          {inv.status?.replace('_', ' ')}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDoc(inv)} title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                        try {
                          const res = await base44.functions.invoke('generateInvoicePDF', { invoice_id: inv.id });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                          link.download = `Invoice-${inv.invoice_number}.pdf`;
                          link.click();
                        } catch (err) { console.error('Download failed:', err); }
                      }} title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendInvoiceEmail(inv)} disabled={sendingEmail === inv.id} title={inv.client_email ? `Email to ${inv.client_email}` : 'No client email'}>
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
            <span>Total shown: <span className="font-semibold text-foreground">{formatCurrency(filtered.reduce((s, i) => s + (i.total || 0), 0))}</span></span>
          </div>
        </div>
      )}

      <DocumentViewer open={!!viewDoc} onClose={() => setViewDoc(null)} type="invoice" document={viewDoc} />

      <Dialog open={showForm} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('new_invoice_btn')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...formData, invoice_number: generateRef('INV') }); }} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('client_name_label')}</Label>
                    <Input readOnly value={formData.client_name || ''} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('client_email_label')}</Label>
                    <Input readOnly value={formData.client_email || ''} className="bg-secondary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('total')}</Label>
                    <Input readOnly value={formatCurrency(formData.total)} className="bg-secondary font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('due_date')} *</Label>
                    <Input type="date" required value={formData.due_date || ''} onChange={(e) => setFormData(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('notes')}</Label>
                  <Input value={formData.notes || ''} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Payment instructions, remarks..." />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>{t('cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.booking_id}>
                {createMutation.isPending ? t('creating') : t('new_invoice_btn')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
