import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, CreditCard, Send, DollarSign, TrendingUp, Banknote, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
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
import { formatCurrency, formatDate, generateRef } from '@/lib/helpers';
import { safeJson } from '@/lib/safeJson';
import { buildApiUrl } from '@/api/localClient';
import CurrencySelect from '@/components/ui/CurrencySelect';

const RESET = { method: 'bank_transfer', status: 'confirmed', currency: 'USD' };

export default function Payments() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [formData, setFormData] = useState(RESET);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', user?.email],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date', 200);
      return user?.role === 'admin' ? allPayments : allPayments.filter(p => p.created_by === user?.email);
    },
    enabled: !!user,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.list('-created_date', 200);
      return user?.role === 'admin' ? allInvoices : allInvoices.filter(i => i.created_by === user?.email);
    },
    enabled: !!user,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-payments'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const invoice = invoices.find(i => i.id === data.invoice_id);
      const payment = await base44.entities.Payment.create({
        ...data,
        payment_ref: generateRef('PAY'),
        invoice_number: invoice?.invoice_number,
        booking_id: invoice?.booking_id,
        booking_ref: invoice?.booking_ref,
        client_id: invoice?.client_id,
        client_name: invoice?.client_name,
        client_email: invoice?.client_email,
      });
      if (invoice) {
        const newPaid = (invoice.amount_paid || 0) + parseFloat(data.amount);
        const newStatus = newPaid >= invoice.total ? 'paid' : 'partially_paid';
        await base44.entities.Invoice.update(invoice.id, { amount_paid: newPaid, status: newStatus });
        if (invoice.booking_id) {
          const bList = await base44.entities.Booking.filter({ id: invoice.booking_id });
          if (bList[0]) await base44.entities.Booking.update(bList[0].id, { amount_paid: (bList[0].amount_paid || 0) + parseFloat(data.amount) });
        }
      }
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowForm(false);
      setFormData(RESET);
      setSelectedInvoice(null);
    },
  });

  const handleInvoiceSelect = (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId);
    setSelectedInvoice(inv || null);
    if (!inv) return;
    const amountDue = (inv.total || 0) - (inv.amount_paid || 0);
    setFormData(f => ({
      ...f,
      invoice_id: inv.id,
      amount: amountDue,
      payment_date: new Date().toISOString().split('T')[0],
    }));
  };

  const close = () => { setShowForm(false); setFormData(RESET); setSelectedInvoice(null); };

  const resolveClientEmail = async (p) => {
    // 1. Payment record
    if (p.client_email) return p.client_email;
    // 2. Linked invoice
    const inv = invoices.find(i => i.id === p.invoice_id);
    if (inv?.client_email) return inv.client_email;
    // 3. Client record (cached list, then by-id fetch as last resort)
    const clientId = p.client_id || inv?.client_id;
    if (clientId) {
      const cached = clients.find(c => c.id === clientId);
      if (cached?.email) return cached.email;
      try {
        const found = await base44.entities.Client.filter({ id: clientId });
        if (found?.[0]?.email) return found[0].email;
      } catch {}
    }
    // 4. Last-ditch: match by name across clients
    const name = p.client_name || inv?.client_name;
    if (name) {
      const byName = clients.find(c => (c.full_name || c.name) === name);
      if (byName?.email) return byName.email;
    }
    return null;
  };

  const sendPaymentReceipt = async (p) => {
    const clientEmail = await resolveClientEmail(p);
    if (!clientEmail) {
      toast({
        title: 'No client email',
        description: 'Cannot find a client email for this payment. Add one on the client record or the linked invoice and try again.',
        variant: 'destructive',
      });
      return;
    }
    setSendingEmail(p.id);
    try {
      const res = await fetch(buildApiUrl('/api/email/send-payment-receipt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify({
          payment_ref: p.payment_ref, client_name: p.client_name, client_email: clientEmail,
          amount: p.amount, currency: p.currency || 'USD', payment_date: p.payment_date,
          method: p.method, invoice_number: p.invoice_number, booking_ref: p.booking_ref, notes: p.notes,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast({ title: 'Receipt sent!', description: `Emailed to ${clientEmail}` });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(null);
    }
  };

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalCollected = payments.filter(p => p.status !== 'failed').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const thisMonth = payments.filter(p => {
    if (!p.payment_date) return false;
    const d = new Date(p.payment_date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const methodCounts = payments.reduce((acc, p) => {
    const m = p.method || 'other';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <PageHeader title={t('payments')} description={t('track_all_payments')}>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />{t('record_payment')}</Button>
      </PageHeader>

      {/* KPI row */}
      {payments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Collected</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalCollected)}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-bold">{formatCurrency(thisMonth)}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-lg font-bold">{payments.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Method</p>
              <p className="text-lg font-bold capitalize">{topMethod.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState icon={CreditCard} title={t('no_payments_yet')} description={t('manage_payments')} actionLabel={t('record_payment')} onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('reference')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('client')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('invoice_label')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('method')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('date')}</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('amount')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('status')}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{p.payment_ref}</td>
                  <td className="px-5 py-3.5 text-sm font-medium">{p.client_name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{p.invoice_number}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                      {(p.method || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-right text-green-600 dark:text-green-400">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => sendPaymentReceipt(p)} disabled={sendingEmail === p.id} title="Send payment receipt">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
            <span>Total: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalCollected)}</span></span>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('record_payment')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('invoice_label')} *</Label>
              <Select value={formData.invoice_id || ''} onValueChange={handleInvoiceSelect}>
                <SelectTrigger><SelectValue placeholder={t('select_invoice')} /></SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.invoice_number} — {i.client_name} ({formatCurrency((i.total || 0) - (i.amount_paid || 0))} due)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedInvoice && (
              <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('invoice_details')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">{t('client')}: </span><span className="font-medium">{selectedInvoice.client_name}</span></div>
                  <div><span className="text-muted-foreground">{t('booking')}: </span><span className="font-medium">{selectedInvoice.booking_ref}</span></div>
                  <div><span className="text-muted-foreground">{t('total')}: </span><span className="font-medium">{formatCurrency(selectedInvoice.total)}</span></div>
                  <div><span className="text-muted-foreground">{t('balance')}: </span><span className="font-semibold text-red-600">{formatCurrency((selectedInvoice.total || 0) - (selectedInvoice.amount_paid || 0))}</span></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('amount')} *</Label>
                <Input type="number" step="0.01" required value={formData.amount || ''} onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('currency')}</Label>
                <CurrencySelect value={formData.currency || 'USD'} onValueChange={(v) => setFormData(f => ({ ...f, currency: v }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('date')} *</Label>
              <Input type="date" required value={formData.payment_date || ''} onChange={(e) => setFormData(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('method')}</Label>
              <Select value={formData.method} onValueChange={(v) => setFormData(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t('bank_transfer')}</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="cash">{t('cash')}</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Input value={formData.notes || ''} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>{t('cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.invoice_id}>
                {createMutation.isPending ? t('saving') : t('record_payment')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}