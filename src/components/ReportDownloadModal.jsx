import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, FileSpreadsheet, Calendar, ChevronRight } from 'lucide-react';
import {
  filterByPeriod,
  getPeriodLabel,
  downloadExpensesReport,
  downloadExpensesCSV,
  downloadVehicleExpensesReport,
  downloadVehicleExpensesCSV,
  downloadBookingsReport,
  downloadBookingsCSV,
} from '@/lib/generateReport';

// ── Period tabs ───────────────────────────────────────────────────────────────
const PERIOD_TYPES = [
  { id: 'all',   label: 'All Time' },
  { id: 'year',  label: 'Year' },
  { id: 'month', label: 'Month' },
  { id: 'week',  label: 'Week' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Build a "YYYY-MM-DD" for the Monday of the current week
function currentWeekMonday() {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().split('T')[0];
}

// ── Report config by type ─────────────────────────────────────────────────────
const REPORT_META = {
  expenses: {
    title: 'Expenses Report',
    icon: <FileText className="w-5 h-5 text-destructive" />,
    dateField: 'expense_date',
    downloadPDF: downloadExpensesReport,
    downloadCSV: downloadExpensesCSV,
  },
  vehicle_expenses: {
    title: 'Vehicle Expenses Report',
    icon: <FileText className="w-5 h-5 text-warning" />,
    dateField: 'expense_date',
    downloadPDF: downloadVehicleExpensesReport,
    downloadCSV: downloadVehicleExpensesCSV,
  },
  bookings: {
    title: 'Bookings Report',
    icon: <FileText className="w-5 h-5 text-primary" />,
    dateField: 'start_date',
    downloadPDF: downloadBookingsReport,
    downloadCSV: downloadBookingsCSV,
  },
};

/**
 * Props:
 *   open          boolean
 *   onClose       () => void
 *   type          'expenses' | 'vehicle_expenses' | 'bookings'
 *   allRecords    array  — all records (unfiltered)
 *   vehicles      array  — only needed for vehicle_expenses
 *   companyName   string — company name for PDF header
 */
export default function ReportDownloadModal({ open, onClose, type, allRecords = [], vehicles = [], companyName }) {
  const meta = REPORT_META[type] || REPORT_META.expenses;

  // Period selection state
  const [periodType, setPeriodType]   = useState('all');
  const [weekDate,   setWeekDate]     = useState(currentWeekMonday);
  const [monthValue, setMonthValue]   = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [yearValue, setYearValue] = useState(String(CURRENT_YEAR));

  // Derive current periodValue from tab
  const periodValue = periodType === 'week' ? weekDate : periodType === 'month' ? monthValue : yearValue;
  const periodLabel = useMemo(() => getPeriodLabel(periodType, periodValue), [periodType, periodValue]);

  // Filtered records
  const filtered = useMemo(
    () => filterByPeriod(allRecords, meta.dateField, periodType, periodValue),
    [allRecords, meta.dateField, periodType, periodValue]
  );

  const handlePDF = () => {
    meta.downloadPDF({ records: filtered, periodLabel, companyName, vehicles });
  };

  const handleCSV = () => {
    meta.downloadCSV({ records: filtered, periodLabel });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.icon}
            Download Report
          </DialogTitle>
        </DialogHeader>

        {/* Report name */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          {meta.title}
        </div>

        {/* Period type tabs */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Period</p>
          <div className="flex gap-2">
            {PERIOD_TYPES.map(pt => (
              <button
                type="button"
                key={pt.id}
                onClick={() => setPeriodType(pt.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  periodType === pt.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period picker — hidden for All Time */}
        {periodType !== 'all' && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select {periodType === 'week' ? 'a date in the week' : periodType === 'month' ? 'month & year' : 'year'}
            </p>

            {periodType === 'week' && (
              <input
                type="date"
                value={weekDate}
                onChange={e => setWeekDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              />
            )}

            {periodType === 'month' && (
              <input
                type="month"
                value={monthValue}
                onChange={e => setMonthValue(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              />
            )}

            {periodType === 'year' && (
              <select
                value={yearValue}
                onChange={e => setYearValue(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Preview */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {periodLabel}
            </p>
            <p className="text-sm font-semibold">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No data for this period</p>
          )}
        </div>

        {/* Download buttons */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={handlePDF}
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleCSV}
            disabled={filtered.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download CSV
          </Button>
        </div>

        <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
