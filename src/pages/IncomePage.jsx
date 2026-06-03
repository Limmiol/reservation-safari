import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { useAuth } from '@/lib/AuthContext';
import { getUserBusinessCurrency } from '@/lib/helpers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, TrendingUp, Search, BarChart2, DollarSign } from 'lucide-react';
import CurrencySelect from '@/components/ui/CurrencySelect';
import { formatCurrency } from '@/lib/helpers';

const categories = ['booking','consultation','commission','partnership','refund_recovery','other'];
const paymentMethods = ['cash','bank_transfer','credit_card','mobile_money','other'];

const empty = { title:'', category:'booking', amount:'', currency:'TZS', income_date:'', source:'', booking_ref:'', payment_method:'bank_transfer', notes:'', status:'received' };

export default function IncomePage() {
  const { language } = useLanguage();
  const { user, isLoadingAuth } = useAuth();
  const defaultCurrency = user ? getUserBusinessCurrency(user) : 'TZS';
  const t = (key) => translate(key, language);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty, currency: defaultCurrency });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  if (isLoadingAuth) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">Loading...</div>;
  }

  const { data: income = [] } = useQuery({
    queryKey: ['income'],
    queryFn: () => base44.entities.Income.list('-income_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { ...form, amount: parseFloat(form.amount) || 0, currency: form.currency || defaultCurrency };
      if (editing) await base44.entities.Income.update(editing.id, data);
      else await base44.entities.Income.create(data);
    },
    onSuccess: () => {
      toast.success(editing ? 'Income updated' : 'Income added');
      qc.invalidateQueries({ queryKey: ['income'] });
      setOpen(false); setEditing(null); setForm(empty);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['income'] }); },
  });

  const openEdit = (e) => { setEditing(e); setForm({ ...e, amount: String(e.amount), currency: e.currency || defaultCurrency }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...empty, currency: defaultCurrency }); setOpen(true); };

  const filtered = income.filter(e =>
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.source || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalsByCurrency = filtered.reduce((acc, e) => {
    const currency = e.currency || defaultCurrency;
    acc[currency] = (acc[currency] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const incomeCurrency = Object.keys(totalsByCurrency)[0] || defaultCurrency;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('income')}</h1>
            <p className="text-muted-foreground mt-1">{t('track_income')}</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />{t('add_income')}</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('total_shown')}</p>
              <div className="text-sm font-bold space-y-0.5">
                {Object.entries(totalsByCurrency).map(([curr, amount]) => (
                  <div key={curr}>{formatCurrency(amount, curr)}</div>
                ))}
              </div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('records')}</p>
              <p className="text-xl font-bold">{filtered.length}</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('avg_income')}</p>
              <p className="text-xl font-bold">
                {formatCurrency(filtered.length ? Math.round(total / filtered.length) : 0, incomeCurrency)}
              </p>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search income records..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {[t('date'),t('expense_title'),t('category'),t('income_source'),t('booking_ref_label'),t('amount'),t('method'),t('status'),''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(inc => (
                  <tr key={inc.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{inc.income_date}</td>
                    <td className="px-4 py-3 font-medium">{inc.title}</td>
                    <td className="px-4 py-3 capitalize">{(inc.category || '').replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inc.source || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inc.booking_ref || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{formatCurrency(inc.amount || 0, inc.currency || defaultCurrency)}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{(inc.payment_method || '').replace(/_/g,' ')}</td>
                    <td className="px-4 py-3"><StatusBadge status={inc.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(inc)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(inc.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No income records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('edit_income_dialog') : t('new_income_dialog')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium">Title *</label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Safari booking payment..." />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {categories.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Amount *</label>
              <Input className="mt-1" type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input className="mt-1" type="date" value={form.income_date} onChange={e => setForm(f => ({...f, income_date: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('currency')}</label>
              <CurrencySelect className="mt-1" value={form.currency || 'USD'} onValueChange={v => setForm(f => ({...f, currency: v}))} />
            </div>
            <div>
              <label className="text-sm font-medium">Source</label>
              <Input className="mt-1" value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))} placeholder="Client / partner name" />
            </div>
            <div>
              <label className="text-sm font-medium">Booking Ref</label>
              <Input className="mt-1" value={form.booking_ref} onChange={e => setForm(f => ({...f, booking_ref: e.target.value}))} placeholder="BK-0001" />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <select className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={form.payment_method} onChange={e => setForm(f => ({...f, payment_method: e.target.value}))}>
                {paymentMethods.map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}