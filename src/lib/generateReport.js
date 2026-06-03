import { jsPDF } from 'jspdf';

// ── Brand palette ─────────────────────────────────────────────────────────────
const GREEN    = [22, 163, 74];
const DARK     = [15, 23, 42];
const GRAY     = [100, 116, 139];
const LT_GRAY  = [241, 245, 249];
const MID_GRAY = [203, 213, 225];
const WHITE    = [255, 255, 255];
const RED      = [220, 38, 38];

const PW = 210;   // A4 width  mm
const PH = 297;   // A4 height mm
const ML = 14;    // margin left
const MR = 14;    // margin right
const CW = PW - ML - MR;

// ── Low-level helpers ─────────────────────────────────────────────────────────
const rgb  = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const fill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const strk = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);

function truncate(str, maxLen) {
  if (!str && str !== 0) return '-';
  const s = String(str);
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '...' : s;
}

function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return String(d); }
}

function fmtAmt(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency || 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    const sym = { TZS: 'TSh', KES: 'Ksh', USD: '$', EUR: '\u20ac', GBP: '\u00a3' };
    return `${sym[currency] || currency} ${Number(amount || 0).toLocaleString()}`;
  }
}

function cap(str) {
  return (str || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Page header ───────────────────────────────────────────────────────────────
function drawHeader(doc, reportTitle, periodLabel, companyName) {
  // Green top band
  fill(doc, GREEN);
  doc.rect(0, 0, PW, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  rgb(doc, WHITE);
  doc.text(companyName || 'Reservation Safari', ML, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(periodLabel, PW - MR, 13, { align: 'right' });

  // Report title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  rgb(doc, DARK);
  doc.text(reportTitle, ML, 34);

  // Generated line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  rgb(doc, GRAY);
  const genDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  doc.text(`Generated ${genDate}  \u2022  ${periodLabel}`, ML, 41);

  // Thin separator
  strk(doc, MID_GRAY);
  doc.setLineWidth(0.3);
  doc.line(ML, 44, PW - MR, 44);

  return 50; // y after header
}

// ── Page footer ───────────────────────────────────────────────────────────────
function drawFooter(doc, pageNum, totalPages) {
  // White out previous footer area
  fill(doc, WHITE);
  doc.rect(0, PH - 16, PW, 16, 'F');

  strk(doc, MID_GRAY);
  doc.setLineWidth(0.3);
  doc.line(ML, PH - 12, PW - MR, PH - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  rgb(doc, GRAY);
  doc.text(`Page ${pageNum} of ${totalPages}`, ML, PH - 6);
  doc.text('Reservation Safari \u2014 Confidential', PW / 2, PH - 6, { align: 'center' });
  doc.text(new Date().toLocaleDateString('en-US'), PW - MR, PH - 6, { align: 'right' });
}

// ── Summary cards ─────────────────────────────────────────────────────────────
function drawSummary(doc, stats, y) {
  const cardW = (CW - (stats.length - 1) * 4) / stats.length;

  stats.forEach((s, i) => {
    const x = ML + i * (cardW + 4);

    fill(doc, LT_GRAY);
    strk(doc, MID_GRAY);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    rgb(doc, GRAY);
    doc.text(s.label.toUpperCase(), x + 4, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    rgb(doc, DARK);
    doc.text(String(s.value), x + 4, y + 16);
  });

  return y + 26;
}

// ── Data table (multi-page aware) ─────────────────────────────────────────────
function drawTable(doc, columns, rows, startY, reportTitle, periodLabel, companyName) {
  const ROW_H    = 8;
  const HEAD_H   = 9;
  const FOOT_Y   = PH - 16;   // footer band starts here
  const AVAIL_H  = FOOT_Y - startY;  // first page available height

  // Column widths proportional to flex
  const totalFlex = columns.reduce((s, c) => s + (c.flex || 1), 0);
  const colW = columns.map(c => ((c.flex || 1) / totalFlex) * CW);

  let y = startY;
  let page = 1;

  const renderHead = () => {
    fill(doc, DARK);
    doc.rect(ML, y, CW, HEAD_H, 'F');
    let x = ML;
    columns.forEach((col, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      rgb(doc, WHITE);
      doc.text(col.header, x + 3, y + 6);
      x += colW[i];
    });
    y += HEAD_H;
  };

  renderHead();

  rows.forEach((row, rowIdx) => {
    // Page break
    if (y + ROW_H > FOOT_Y) {
      doc.addPage();
      page++;
      y = drawHeader(doc, reportTitle, periodLabel, companyName);
      renderHead();
    }

    // Alternating row bg
    if (rowIdx % 2 === 0) {
      fill(doc, LT_GRAY);
      doc.rect(ML, y, CW, ROW_H, 'F');
    }

    let x = ML;
    columns.forEach((col, i) => {
      const raw  = col.render ? col.render(row) : (row[col.key] ?? '-');
      const text = truncate(raw, Math.max(5, Math.floor(colW[i] / 1.85)));

      doc.setFont('helvetica', col.bold ? 'bold' : 'normal');
      doc.setFontSize(7.5);

      if (col.color) {
        const c = col.color(row);
        c ? rgb(doc, c) : rgb(doc, DARK);
      } else {
        rgb(doc, DARK);
      }

      if (col.align === 'right') {
        doc.text(text, x + colW[i] - 3, y + 5.5, { align: 'right' });
      } else {
        doc.text(text, x + 3, y + 5.5);
      }

      x += colW[i];
    });

    // Row separator
    strk(doc, MID_GRAY);
    doc.setLineWidth(0.15);
    doc.line(ML, y + ROW_H, ML + CW, y + ROW_H);

    y += ROW_H;
  });

  return page;
}

// ── Period helper ─────────────────────────────────────────────────────────────
export function filterByPeriod(records, dateField, periodType, periodValue) {
  // All-time: return everything
  if (periodType === 'all') return records;

  let start, end;

  if (periodType === 'week') {
    const d   = new Date(periodValue);
    const dow = d.getDay(); // 0 = Sun
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    start = mon.toISOString().split('T')[0];
    end   = sun.toISOString().split('T')[0];
  } else if (periodType === 'month') {
    const [yr, mo] = periodValue.split('-').map(Number);
    start = `${yr}-${String(mo).padStart(2, '0')}-01`;
    end   = new Date(yr, mo, 0).toISOString().split('T')[0];
  } else if (periodType === 'year') {
    start = `${periodValue}-01-01`;
    end   = `${periodValue}-12-31`;
  }

  return records.filter(r => {
    const raw = r[dateField];
    // Records with no date are excluded from period filters
    if (!raw) return false;
    // Support ISO datetime strings (slice to YYYY-MM-DD) and plain dates
    const d = String(raw).slice(0, 10);
    return d >= start && d <= end;
  });
}

export function getPeriodLabel(periodType, periodValue) {
  if (periodType === 'all') return 'All Time';
  if (periodType === 'week') {
    const d   = new Date(periodValue);
    const dow = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = dt => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Week of ${fmt(mon)} \u2013 ${fmt(sun)}`;
  }
  if (periodType === 'month') {
    const [yr, mo] = periodValue.split('-').map(Number);
    return new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (periodType === 'year') {
    return `Year ${periodValue}`;
  }
  return periodValue;
}

// ── Expenses Report ───────────────────────────────────────────────────────────
export function downloadExpensesReport({ records, periodLabel, companyName }) {
  const doc = new jsPDF();

  const total    = records.reduce((s, r) => s + (r.amount || 0), 0);
  const approved = records.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0);
  const byCategory = {};
  records.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + (r.amount || 0); });
  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  let y = drawHeader(doc, 'Expenses Report', periodLabel, companyName);

  y = drawSummary(doc, [
    { label: 'Total Expenses',  value: fmtAmt(total) },
    { label: 'Approved',        value: fmtAmt(approved) },
    { label: 'Records',         value: records.length },
    { label: 'Top Category',    value: topCat ? cap(topCat[0]) : '-' },
  ], y);

  const columns = [
    { header: 'DATE',     key: 'expense_date',   flex: 1.3, render: r => fmtDate(r.expense_date) },
    { header: 'TITLE',    key: 'title',           flex: 2.2, bold: true },
    { header: 'CATEGORY', key: 'category',        flex: 1.3, render: r => cap(r.category) },
    { header: 'VENDOR',   key: 'vendor',          flex: 1.5 },
    { header: 'AMOUNT',   key: 'amount',          flex: 1.2, align: 'right', bold: true,
      render: r => fmtAmt(r.amount, r.currency), color: () => RED },
    { header: 'METHOD',   key: 'payment_method',  flex: 1.3, render: r => cap(r.payment_method) },
    { header: 'STATUS',   key: 'status',          flex: 0.9,
      color: r => r.status === 'approved' ? GREEN : r.status === 'rejected' ? RED : GRAY },
  ];

  const totalPages = drawTable(doc, columns, records, y, 'Expenses Report', periodLabel, companyName);

  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); drawFooter(doc, i, totalPages); }
  doc.save(`expenses-report-${periodLabel.replace(/[\s/\\:]+/g, '-').toLowerCase()}.pdf`);
}

// ── Vehicle Expenses Report ───────────────────────────────────────────────────
export function downloadVehicleExpensesReport({ records, vehicles = [], periodLabel, companyName }) {
  const doc = new jsPDF();

  const total      = records.reduce((s, r) => s + (r.amount || 0), 0);
  const avgCost    = records.length ? Math.round(total / records.length) : 0;
  const operational = vehicles.filter(v => v.maintenance_status === 'operational').length;

  let y = drawHeader(doc, 'Vehicle Expenses Report', periodLabel, companyName);

  y = drawSummary(doc, [
    { label: 'Total Vehicle Costs', value: fmtAmt(total) },
    { label: 'Records',             value: records.length },
    { label: 'Average Cost',        value: fmtAmt(avgCost) },
    { label: 'Operational Vehicles',value: operational || vehicles.length || '-' },
  ], y);

  const columns = [
    { header: 'DATE',        key: 'expense_date',  flex: 1.3, render: r => fmtDate(r.expense_date) },
    { header: 'DESCRIPTION', key: 'title',         flex: 2.4, bold: true },
    { header: 'VENDOR',      key: 'vendor',        flex: 1.5 },
    { header: 'AMOUNT',      key: 'amount',        flex: 1.2, align: 'right', bold: true,
      render: r => fmtAmt(r.amount, r.currency), color: () => RED },
    { header: 'METHOD',      key: 'payment_method',flex: 1.3, render: r => cap(r.payment_method) },
    { header: 'STATUS',      key: 'status',        flex: 0.9,
      color: r => r.status === 'approved' ? GREEN : r.status === 'rejected' ? RED : GRAY },
    { header: 'NOTES',       key: 'notes',         flex: 1.7 },
  ];

  const totalPages = drawTable(doc, columns, records, y, 'Vehicle Expenses Report', periodLabel, companyName);

  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); drawFooter(doc, i, totalPages); }
  doc.save(`vehicle-expenses-report-${periodLabel.replace(/[\s/\\:]+/g, '-').toLowerCase()}.pdf`);
}

// ── Bookings Report ───────────────────────────────────────────────────────────
export function downloadBookingsReport({ records, periodLabel, companyName }) {
  const doc = new jsPDF();

  const totalRevenue  = records.reduce((s, r) => s + (r.total_amount || 0), 0);
  const confirmed     = records.filter(r => ['confirmed','in_progress','completed'].includes(r.status)).length;
  const totalGuests   = records.reduce((s, r) => s + (r.num_guests || 0), 0);

  let y = drawHeader(doc, 'Bookings Report', periodLabel, companyName);

  y = drawSummary(doc, [
    { label: 'Total Revenue',  value: fmtAmt(totalRevenue) },
    { label: 'Total Bookings', value: records.length },
    { label: 'Confirmed',      value: confirmed },
    { label: 'Total Guests',   value: totalGuests },
  ], y);

  const STATUS_CLR = {
    confirmed: GREEN, completed: GREEN, in_progress: GREEN,
    cancelled: RED, inquiry: GRAY, quoted: [217, 119, 6],
  };

  const columns = [
    { header: 'REF',        key: 'booking_ref',   flex: 1.1, bold: true },
    { header: 'CLIENT',     key: 'client_name',   flex: 1.7 },
    { header: 'PACKAGE',    key: 'package_name',  flex: 2.0 },
    { header: 'START DATE', key: 'start_date',    flex: 1.3, render: r => fmtDate(r.start_date) },
    { header: 'GUESTS',     key: 'num_guests',    flex: 0.7, align: 'right' },
    { header: 'AMOUNT',     key: 'total_amount',  flex: 1.2, align: 'right', bold: true,
      render: r => fmtAmt(r.total_amount, r.currency), color: () => GREEN },
    { header: 'SOURCE',     key: 'booking_source',flex: 0.9, render: r => cap(r.booking_source) },
    { header: 'STATUS',     key: 'status',        flex: 1.0,
      color: r => STATUS_CLR[r.status] || DARK, render: r => cap(r.status) },
  ];

  const totalPages = drawTable(doc, columns, records, y, 'Bookings Report', periodLabel, companyName);

  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); drawFooter(doc, i, totalPages); }
  doc.save(`bookings-report-${periodLabel.replace(/[\s/\\:]+/g, '-').toLowerCase()}.pdf`);
}

// ── CSV helper (bonus) ────────────────────────────────────────────────────────
function csvEscape(val) {
  const s = String(val ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function downloadCSV({ headers, rows, filename }) {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map(row => row.map(csvEscape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadExpensesCSV({ records, periodLabel }) {
  const headers = ['Date','Title','Category','Vendor','Amount','Currency','Payment Method','Status','Notes'];
  const rows    = records.map(r => [
    r.expense_date, r.title, cap(r.category), r.vendor || '',
    r.amount || 0, r.currency || 'USD', cap(r.payment_method),
    r.status, r.notes || '',
  ]);
  downloadCSV({ headers, rows, filename: `expenses-${periodLabel.replace(/[\s/\\:]+/g,'-').toLowerCase()}.csv` });
}

export function downloadVehicleExpensesCSV({ records, periodLabel }) {
  const headers = ['Date','Description','Vendor','Amount','Currency','Payment Method','Status','Notes'];
  const rows    = records.map(r => [
    r.expense_date, r.title, r.vendor || '',
    r.amount || 0, r.currency || 'USD', cap(r.payment_method),
    r.status, r.notes || '',
  ]);
  downloadCSV({ headers, rows, filename: `vehicle-expenses-${periodLabel.replace(/[\s/\\:]+/g,'-').toLowerCase()}.csv` });
}

export function downloadBookingsCSV({ records, periodLabel }) {
  const headers = ['Ref','Client','Package','Start Date','End Date','Guests','Amount','Currency','Source','Status'];
  const rows    = records.map(r => [
    r.booking_ref, r.client_name, r.package_name,
    r.start_date, r.end_date, r.num_guests || 0,
    r.total_amount || 0, r.currency || 'USD',
    cap(r.booking_source), cap(r.status),
  ]);
  downloadCSV({ headers, rows, filename: `bookings-${periodLabel.replace(/[\s/\\:]+/g,'-').toLowerCase()}.csv` });
}
