import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { formatCurrency, getUserBusinessCurrency } from '@/lib/helpers';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/ui/PageHeader';
import { FileText, TrendingUp, TrendingDown, Wallet, ShieldCheck } from 'lucide-react';

function parseDate(value) {
  return value ? new Date(value + 'T00:00:00') : null;
}

function formatDateLabel(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function safeNumber(value) {
  return Math.max(0, Number(value) || 0);
}

export default function FinancialStatements() {
  const { language } = useLanguage();
  const { user, isLoadingAuth } = useAuth();
  const defaultCurrency = user ? getUserBusinessCurrency(user) : 'TZS';
  const t = (key) => translate(key, language);
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const [startDate, setStartDate] = useState(yearStart.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));

  if (isLoadingAuth) {
    return <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const { data: income = [] } = useQuery({
    queryKey: ['income', 'financial-statements'],
    queryFn: () => base44.entities.Income.list('-income_date', 500),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', 'financial-statements'],
    queryFn: () => base44.entities.Expense.list('-expense_date', 500),
  });
  const { data: vehicleExpenses = [] } = useQuery({
    queryKey: ['vehicle-expenses', 'financial-statements'],
    queryFn: () => base44.entities.VehicleExpense.list('-expense_date', 500),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', 'financial-statements'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 500),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', 'financial-statements'],
    queryFn: () => base44.entities.Payment.list('-created_date', 500),
  });

  const range = useMemo(() => ({
    start: parseDate(startDate),
    end: parseDate(endDate),
  }), [startDate, endDate]);

  const filteredIncome = useMemo(() => income.filter(item => {
    const date = parseDate(item.income_date || item.created_date);
    return date && range.start && range.end && date >= range.start && date <= range.end;
  }), [income, range]);

  const filteredExpenses = useMemo(() => expenses.filter(item => {
    const date = parseDate(item.expense_date || item.created_date);
    return date && range.start && range.end && date >= range.start && date <= range.end;
  }), [expenses, range]);

  const filteredVehicleExpenses = useMemo(() => vehicleExpenses.filter(item => {
    const date = parseDate(item.expense_date || item.created_date);
    return date && range.start && range.end && date >= range.start && date <= range.end;
  }), [vehicleExpenses, range]);

  // Create a Set of expense IDs that are linked to vehicle expenses to avoid duplication
  const linkedExpenseIds = useMemo(() => 
    new Set(vehicleExpenses.map(v => v.expense_id).filter(Boolean)),
    [vehicleExpenses]
  );

  // Filter out regular expenses that are already represented as vehicle expenses
  const uniqueFilteredExpenses = useMemo(() =>
    filteredExpenses.filter(e => !linkedExpenseIds.has(e.id)),
    [filteredExpenses, linkedExpenseIds]
  );

  const filteredInvoices = useMemo(() => invoices.filter(item => {
    const date = parseDate(item.invoice_date || item.created_date || item.due_date);
    return date && range.start && range.end && date >= range.start && date <= range.end;
  }), [invoices, range]);

  const filteredPayments = useMemo(() => payments.filter(item => {
    const date = parseDate(item.payment_date || item.created_date);
    return date && range.start && range.end && date >= range.start && date <= range.end;
  }), [payments, range]);

  const totals = useMemo(() => {
    const revenue = filteredIncome.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const expenseTotal = uniqueFilteredExpenses.reduce((sum, item) => sum + safeNumber(item.amount), 0)
      + filteredVehicleExpenses.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const cash = filteredPayments.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const receivables = filteredInvoices.reduce((sum, inv) => {
      const due = safeNumber(inv.total) - safeNumber(inv.amount_paid);
      return sum + Math.max(0, due);
    }, 0);
    const payables = filteredExpenses.reduce((sum, item) => {
      if (['pending', 'approved'].includes((item.status || '').toLowerCase())) {
        return sum + safeNumber(item.amount);
      }
      return sum;
    }, 0) + filteredVehicleExpenses.reduce((sum, item) => {
      if (['pending', 'approved'].includes((item.status || '').toLowerCase())) {
        return sum + safeNumber(item.amount);
      }
      return sum;
    }, 0);

    const totalAssets = cash + receivables;
    const totalLiabilities = payables;
    const equity = totalAssets - totalLiabilities;
    const netProfit = revenue - expenseTotal;

    return {
      revenue,
      expenseTotal,
      cash,
      receivables,
      payables,
      totalAssets,
      totalLiabilities,
      equity,
      netProfit,
    };
  }, [filteredIncome, filteredExpenses, filteredInvoices, filteredPayments]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 min-h-screen">
      <PageHeader title={t('financial_statements')} description={t('financial_statements_summary')}>
        <Button onClick={() => window.print()}>{t('print_report')}</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{t('statement_period')}</h2>
              <p className="text-sm text-muted-foreground">{t('select_range')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">{t('start_date')}</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('end_date')}</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-4 bg-muted/50">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('as_of')}</p>
              <p className="mt-2 text-lg font-semibold">{formatDateLabel(endDate)}</p>
            </div>
            <div className="rounded-2xl border border-border p-4 bg-muted/50">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('basis')}</p>
              <p className="mt-2 text-lg font-semibold">{t('accrual_basis')}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-3 text-primary">
            <FileText className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-semibold">{t('financial_statement_note')}</h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-6">
            {t('financial_statement_ifrs_note')}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-foreground">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">{t('statement_of_financial_position')}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('cash_and_cash_equivalents')}</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(totals.cash, defaultCurrency)}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('accounts_receivable')}</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(totals.receivables, defaultCurrency)}</p>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t('total_assets')}</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalAssets, defaultCurrency)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('accounts_payable')}</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(totals.payables, defaultCurrency)}</p>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t('total_liabilities')}</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalLiabilities, defaultCurrency)}</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('equity')}</p>
              <p className="text-xs text-muted-foreground">{t('assets_minus_liabilities')}</p>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(totals.equity, defaultCurrency)}</p>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-foreground">
            <TrendingUp className="w-5 h-5 text-sky-600" />
            <h3 className="text-lg font-semibold">{t('income_statement')}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('revenue')}</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(totals.revenue, defaultCurrency)}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('expenses')}</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(totals.expenseTotal, defaultCurrency)}</p>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t('net_profit')}</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.netProfit, defaultCurrency)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/50 p-4">
            <p className="text-sm font-semibold">{t('income_statement_breakdown')}</p>
            <p className="text-xs text-muted-foreground mt-2">{t('statement_basis_description')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
