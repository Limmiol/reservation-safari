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
import { Plus, Trash2, Pencil, TrendingDown, Search, Receipt, Download } from 'lucide-react';
import CurrencySelect, { CURRENCY_SYMBOLS } from '@/components/ui/CurrencySelect';
import ReportDownloadModal from '@/components/ReportDownloadModal';
import { formatCurrency } from '@/lib/helpers';

const categories = ['salary','rent','utilities','marketing','travel','supplies','maintenance','insurance','tax','other'];
const paymentMethods = ['cash','bank_transfer','credit_card','mobile_money','other'];

const empty = { title:'', category:'other', amount:'', currency:'TZS', expense_date:'', vendor:'', payment_method:'bank_transfer', notes:'', status:'approved', is_recurring:false };

export default function Expenses() {
  const { language } = useLanguage();
  const { user, isLoadingAuth } = useAuth();
  const defaultCurrency = user ? getUserBusinessCurrency(user) : 'TZS';
  const t = (key) => translate(key, language);
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [form, setForm] = useState({ ...empty, currency: defaultCurrency });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  if (isLoadingAuth) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">Loading...</div>;
  }

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-expense_date'),
  });

  const { data: vehicleExpenses = [] } = useQuery({
    queryKey: ['vehicle-expenses-all'],
    queryFn: () => base44.entities.VehicleExpense.list('-expense_date'),
  });

  const mappedVehicleExpenses = vehicleExpenses.map(exp => ({
    id: `vehicle-${exp.id}`,
    title: exp.description || `${exp.expense_type || 'Vehicle'} expense`,
    category: exp.expense_type || 'other',
    vendor: exp.vendor_name || '',
    amount: exp.amount || 0,
    currency: exp.currency || defaultCurrency,
    expense_date: exp.expense_date || '',
    payment_method: exp.payment_method || 'other',
    status: exp.status || 'approved',
    notes: exp.notes || '',
    isVehicleExpense: true,
    vehicle_id: exp.vehicle_id,
    vehicle_registration_number: exp.registration_number,
    expense_id: exp.expense_id || '',
  }));

  // Create a Set of expense IDs that are linked to vehicle expenses to avoid duplication
  const linkedExpenseIds = new Set(vehicleExpenses.map(v => v.expense_id).filter(Boolean));

  // Filter out regular expenses that are already represented as vehicle expenses
  const uniqueExpenses = expenses.filter(e => !linkedExpenseIds.has(e.id));

  const mergedExpenses = [...uniqueExpenses, ...mappedVehicleExpenses];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { ...form, amount: parseFloat(form.amount) || 0, currency: form.currency || defaultCurrency };
      if (editing) await base44.entities.Expense.update(editing.id, data);
      else await base44.entities.Expense.create(data);
    },
    onSuccess: () => {
      toast.success(editing ? 'Expense updated' : 'Expense added');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setOpen(false); setEditing(null); setForm(empty);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (record) => {
      if (record.isVehicleExpense) {
        const vehicleExpenseId = record.id.replace(/^vehicle-/, '');
        const vehicleExpense = await base44.entities.VehicleExpense.read(vehicleExpenseId);
        await base44.entities.VehicleExpense.delete(vehicleExpenseId);
        if (vehicleExpense?.expense_id) {
          await base44.entities.Expense.delete(vehicleExpense.expense_id);
        }
      } else {
        await base44.entities.Expense.delete(record.id);
      }
    },
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['vehicle-expenses-all'] });
      qc.invalidateQueries({ queryKey: ['vehicle-expenses', 'financial-statements'] });
      qc.invalidateQueries({ queryKey: ['expenses', 'financial-statements'] });
    },
  });

  const openEdit = (e) => { setEditing(e); setForm({ ...e, amount: String(e.amount), currency: e.currency || defaultCurrency }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...empty, currency: defaultCurrency }); setOpen(true); };

  const filtered = mergedExpenses.filter(e =>
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.vendor || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.vehicle_registration_number || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group totals by currency
  const totalsByCurrency = filtered.reduce((acc, e) => {
    const curr = e.currency || 'USD';
    acc[curr] = (acc[curr] || 0) + (e.amount || 0);
    return acc;
  }, {});

  const totalRecords = filtered.length;
  const expenseCurrencies = Object.keys(totalsByCurrency);
  const reportCurrency = expenseCurrencies.length ? expenseCurrencies[0] : defaultCurrency;
  const totalExpense = expenseCurrencies.reduce((sum, curr) => sum + totalsByCurrency[curr], 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('expenses')}</h1>
            <p className="text-muted-foreground mt-1">{t('track_expenses')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReportOpen(true)} className="gap-2">
              <Download className="w-4 h-4" />Report
            </Button>
            <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />{t('add_expense')}</Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('total_shown')}</p>
              <div className="text-sm font-bold space-y-0.5">
                {Object.entries(totalsByCurrency).map(([curr, amt]) => (
                  <div key={curr}>{formatCurrency(amt, curr || defaultCurrency)}</div>
                ))}
              </div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('records')}</p>
              <p className="text-xl font-bold">{totalRecords}</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('avg_expense')}</p>
              <p className="text-xl font-bold">
                {totalRecords ? formatCurrency(Object.values(totalsByCurrency).reduce((s, a) => s + a, 0) / totalRecords, reportCurrency) : formatCurrency(0, defaultCurrency)}
              </p>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {[t('date'),t('expense_title'),t('category'),t('vendor'),t('amount'),t('method'),t('status'),''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(exp => (
                  <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{exp.expense_date}</td>
                    <td className="px-4 py-3 font-medium">{exp.title}</td>
                    <td className="px-4 py-3 capitalize">{(exp.category || '').replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{exp.vendor || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-destructive">{formatCurrency(exp.amount, exp.currency || defaultCurrency)}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{(exp.payment_method || '').replace(/_/g,' ')}</td>
                    <td className="px-4 py-3"><StatusBadge status={exp.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(exp)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(exp)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No expenses found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ReportDownloadModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        type="expenses"
        allRecords={mergedExpenses}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('edit_expense_dialog') : t('new_expense_dialog')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium">Title *</label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Office supplies..." />
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
              <Input className="mt-1" type="date" value={form.expense_date} onChange={e => setForm(f => ({...f, expense_date: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('currency')}</label>
              <CurrencySelect className="mt-1" value={form.currency || 'USD'} onValueChange={v => setForm(f => ({...f, currency: v}))} />
            </div>
            <div>
              <label className="text-sm font-medium">Vendor</label>
              <Input className="mt-1" value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} placeholder="Vendor name" />
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
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
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