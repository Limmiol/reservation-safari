import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

/**
 * Converts any date value to YYYY-MM-DD string for reliable comparison.
 */
function toISO(input) {
  if (!input) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) return String(input);
  const d = new Date(input);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AvailabilityCalendar({
  blockedDates = [],
  bookings = [],
  slotEntries = [],
  onDateRangeSelect,
  month = new Date(),
  readOnly = false,
}) {
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isDateBlocked = (iso) =>
    blockedDates.some((b) => {
      const s = toISO(b.start_date);
      const e = toISO(b.end_date);
      return s && e && iso >= s && iso <= e;
    });

  const getBookedCount = (iso) =>
    bookings
      .filter((b) => {
        const s = toISO(b.start_date);
        const e = toISO(b.end_date);
        return s && e && iso >= s && iso <= e;
      })
      .reduce((sum, b) => sum + (b.num_guests || 1), 0);

  const getTotalSlots = (iso) =>
    slotEntries
      .filter((s) => toISO(s.date) === iso && s.is_active)
      .reduce((sum, s) => sum + (s.total_slots || 0), 0);

  const isDateSelected = (date) => {
    if (!selectedRange.start) return false;
    const iso = toISO(date);
    const startISO = toISO(selectedRange.start);
    const endISO = selectedRange.end ? toISO(selectedRange.end) : startISO;
    return iso >= startISO && iso <= endISO;
  };

  const handleDateClick = (day) => {
    if (readOnly) return;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    if (!selectedRange.start) {
      setSelectedRange({ start: date, end: null });
    } else if (!selectedRange.end) {
      const start = selectedRange.start;
      const [s, e] = date < start ? [date, start] : [start, date];
      setSelectedRange({ start: s, end: e });
      onDateRangeSelect?.(s, e);
    } else {
      setSelectedRange({ start: date, end: null });
    }
  };

  const daysInMonth = getDaysInMonth(month);
  const firstDay = getFirstDayOfMonth(month);
  const days = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayISO = toISO(new Date());
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{monthName}</h3>
        {selectedRange.start && !readOnly && (
          <button
            onClick={() => setSelectedRange({ start: null, end: null })}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {selectedRange.start && !readOnly && (
        <p className="text-[11px] text-muted-foreground mb-2">
          {formatDate(selectedRange.start)}
          {selectedRange.end
            ? ` → ${formatDate(selectedRange.end)}`
            : ' — click end date'}
        </p>
      )}

      <div className="grid grid-cols-7 gap-0.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div
            key={d}
            className="text-center py-1 text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const iso = toISO(date);
          const blocked = isDateBlocked(iso);
          const booked = getBookedCount(iso);
          const totalSlots = getTotalSlots(iso);
          const selected = isDateSelected(date);
          const remaining = totalSlots > 0 ? Math.max(0, totalSlots - booked) : null;
          const isToday = iso === todayISO;
          const isPast = iso < todayISO;

          let bgClass = isPast ? 'bg-muted/40' : 'bg-secondary hover:bg-accent';
          let textClass = isPast ? 'text-muted-foreground/50' : '';
          let title = '';

          if (!selected) {
            if (blocked) {
              bgClass = 'bg-red-100 dark:bg-red-900/30';
              textClass = 'text-red-700 dark:text-red-400';
              title = 'Blocked';
            } else if (totalSlots > 0) {
              const pct = booked / totalSlots;
              if (pct >= 1) {
                bgClass = 'bg-blue-200 dark:bg-blue-900/40';
                textClass = 'text-blue-800 dark:text-blue-300';
                title = `Fully booked (${booked}/${totalSlots})`;
              } else if (pct >= 0.8) {
                bgClass = 'bg-orange-100 dark:bg-orange-900/30';
                textClass = 'text-orange-700 dark:text-orange-400';
                title = `Almost full — ${remaining} spot${remaining !== 1 ? 's' : ''} left`;
              } else {
                bgClass = 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100';
                textClass = 'text-green-700 dark:text-green-400';
                title = `${remaining} spot${remaining !== 1 ? 's' : ''} available`;
              }
            } else if (booked > 0) {
              bgClass = 'bg-blue-50 dark:bg-blue-900/20';
              textClass = 'text-blue-700 dark:text-blue-400';
              title = `${booked} booked (no slot limit set)`;
            }
          }

          if (selected) {
            bgClass = 'bg-primary';
            textClass = 'text-primary-foreground';
          }

          return (
            <button
              key={day}
              onClick={() => !blocked && handleDateClick(day)}
              disabled={blocked}
              title={title || undefined}
              className={`
                relative aspect-square rounded text-[11px] font-medium transition-colors
                flex flex-col items-center justify-center gap-0
                ${bgClass} ${textClass}
                ${blocked ? 'cursor-not-allowed' : readOnly ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <span className={isToday ? 'underline font-bold' : ''}>{day}</span>
              {/* Show remaining slot count below the day number */}
              {remaining !== null && !selected && !blocked && (
                <span className="text-[8px] leading-none opacity-70 -mt-0.5">
                  {remaining}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
