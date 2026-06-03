import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRole } from '@/lib/useRole';
import { useToast } from '@/components/ui/use-toast';
import { celebrate } from '@/lib/confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AvailabilityCalendar from '@/components/admin/AvailabilityCalendar';
import { Trash2, Plus, Calendar, BarChart3, Lock } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

/** Normalize any date input to YYYY-MM-DD for reliable string comparison */
function toISO(input) {
  if (!input) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) return String(input);
  const d = new Date(input);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const REASON_LABELS = {
  maintenance: 'Maintenance',
  weather: 'Weather / Season',
  fully_booked: 'Fully Booked',
  staff_unavailable: 'Staff Unavailable',
  other: 'Other',
};

export default function Availability() {
  const queryClient = useQueryClient();
  const { isAgent } = useRole();
  const { toast } = useToast();
  const readOnly = isAgent;

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: packages = [] } = useQuery({
    queryKey: ['packages-for-availability'],
    queryFn: () => base44.entities.Package.list(),
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['availability'],
    queryFn: () => base44.entities.Availability.list('-created_date'),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-for-availability'],
    queryFn: () => base44.entities.Booking.list('-created_date', 500),
  });

  // Separate blocks from slots (old records without type are treated as blocks)
  const blocks = availability.filter(
    (a) => (!a.type || a.type === 'block') && a.is_active
  );
  const slotEntries = availability.filter((a) => a.type === 'slot' && a.is_active);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('overview');
  const [calPkg, setCalPkg] = useState('');
  const [slotFilterPkg, setSlotFilterPkg] = useState('__all__');
  const [blockFilterPkg, setBlockFilterPkg] = useState('__all__');

  // Edit slot state
  const [editingSlot, setEditingSlot] = useState(null);
  const [editSlotCount, setEditSlotCount] = useState('');

  // Block dialog
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockPkg, setBlockPkg] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [reason, setReason] = useState('other');
  const [blockNotes, setBlockNotes] = useState('');

  // Slot dialog
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [slotPkg, setSlotPkg] = useState('');
  const [slotMode, setSlotMode] = useState('single'); // 'single' | 'range'
  const [slotDate, setSlotDate] = useState('');
  const [slotRangeStart, setSlotRangeStart] = useState('');
  const [slotRangeEnd, setSlotRangeEnd] = useState('');
  const [slotCount, setSlotCount] = useState('');
  const [slotNotes, setSlotNotes] = useState('');

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Availability.delete(id),
    onSuccess: () => {
      toast({ title: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (err) => toast({ title: 'Delete failed', description: err.message, variant: 'destructive' }),
  });

  const editSlotMutation = useMutation({
    mutationFn: ({ id, total_slots }) => base44.entities.Availability.update(id, { total_slots }),
    onSuccess: () => {
      toast({ title: 'Slot updated' });
      setEditingSlot(null);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (err) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' }),
  });

  const addBlockMutation = useMutation({
    mutationFn: () => {
      const pkg = packages.find((p) => p.id === blockPkg);
      // Use manual inputs; fall back to calendar selection
      const start = blockStart || toISO(dateRange.start);
      const end = blockEnd || toISO(dateRange.end || dateRange.start) || start;
      return base44.entities.Availability.create({
        type: 'block',
        package_id: blockPkg,
        package_name: pkg?.name,
        start_date: start,
        end_date: end,
        reason,
        notes: blockNotes,
        is_active: true,
      });
    },
    onSuccess: () => {
      celebrate('stars');
      toast({ title: 'Dates blocked', description: 'The selected period has been blocked.' });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setShowBlockDialog(false);
      setDateRange({ start: null, end: null });
      setBlockStart('');
      setBlockEnd('');
      setReason('other');
      setBlockNotes('');
    },
    onError: (err) => toast({ title: 'Failed to block dates', description: err.message, variant: 'destructive' }),
  });

  const addSlotMutation = useMutation({
    mutationFn: async () => {
      const pkg = packages.find((p) => p.id === slotPkg);
      if (slotMode === 'single') {
        return base44.entities.Availability.create({
          type: 'slot',
          package_id: slotPkg,
          package_name: pkg?.name,
          date: slotDate,
          total_slots: Number(slotCount),
          notes: slotNotes,
          is_active: true,
        });
      }
      // Range mode: create one slot record per day between start and end
      const start = new Date(slotRangeStart);
      const end = new Date(slotRangeEnd);
      const creates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = toISO(new Date(d));
        creates.push(base44.entities.Availability.create({
          type: 'slot',
          package_id: slotPkg,
          package_name: pkg?.name,
          date: iso,
          total_slots: Number(slotCount),
          notes: slotNotes,
          is_active: true,
        }));
      }
      return Promise.all(creates);
    },
    onSuccess: (_, vars) => {
      celebrate();
      const days = slotMode === 'range'
        ? Math.round((new Date(slotRangeEnd) - new Date(slotRangeStart)) / 86400000) + 1
        : 1;
      toast({
        title: 'Availability saved!',
        description: `${days} day${days !== 1 ? 's' : ''} set to ${slotCount} slot${slotCount !== '1' ? 's' : ''} each.`,
      });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setShowSlotDialog(false);
      setSlotDate('');
      setSlotRangeStart('');
      setSlotRangeEnd('');
      setSlotCount('');
      setSlotNotes('');
    },
    onError: (err) => toast({ title: 'Failed to save slots', description: err.message, variant: 'destructive' }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openBlockDialog = (start, end) => {
    setDateRange({ start, end });
    setBlockStart(start ? toISO(start) : '');
    setBlockEnd(end ? toISO(end) : '');
    setBlockPkg(calPkg);
    setShowBlockDialog(true);
  };

  const openBlockDialogDirect = () => {
    setDateRange({ start: null, end: null });
    setBlockStart('');
    setBlockEnd('');
    setBlockPkg(blockFilterPkg !== '__all__' ? blockFilterPkg : '');
    setShowBlockDialog(true);
  };

  const openSlotDialog = (pkgId = '') => {
    setSlotPkg(pkgId || calPkg || '');
    setSlotMode('single');
    setSlotDate('');
    setSlotRangeStart('');
    setSlotRangeEnd('');
    setSlotCount('');
    setSlotNotes('');
    setShowSlotDialog(true);
  };

  const getPkgBlocks = (pkgId) => blocks.filter((b) => b.package_id === pkgId);
  const getPkgSlots = (pkgId) => slotEntries.filter((s) => s.package_id === pkgId);
  const getPkgBookings = (pkgId) => bookings.filter((b) => b.package_id === pkgId);

  const getBookedOnDate = (pkgId, iso) =>
    getPkgBookings(pkgId)
      .filter((b) => {
        const s = toISO(b.start_date);
        const e = toISO(b.end_date);
        return s && e && iso >= s && iso <= e;
      })
      .reduce((sum, b) => sum + (b.num_guests || 0), 0);

  const getStats = (pkgId) => {
    const today = toISO(new Date());
    const pkgSlots = getPkgSlots(pkgId).filter((s) => s.date >= today);
    const pkgBlocks = getPkgBlocks(pkgId).filter((b) => toISO(b.end_date) >= today);
    const totalFutureSlots = pkgSlots.reduce((s, e) => s + (e.total_slots || 0), 0);
    const totalBooked = pkgSlots.reduce((s, e) => s + getBookedOnDate(pkgId, e.date), 0);
    const remaining = Math.max(0, totalFutureSlots - totalBooked);
    const fillRate =
      totalFutureSlots > 0 ? Math.round((totalBooked / totalFutureSlots) * 100) : 0;
    return {
      totalFutureSlots,
      totalBooked,
      remaining,
      fillRate,
      openDays: pkgSlots.length,
      blockedPeriods: pkgBlocks.length,
    };
  };

  const today = toISO(new Date());

  // ── Filtered data for tabs ────────────────────────────────────────────────
  const filteredBlocks = blockFilterPkg && blockFilterPkg !== '__all__'
    ? blocks.filter((b) => b.package_id === blockFilterPkg)
    : blocks;

  const filteredSlots = slotFilterPkg && slotFilterPkg !== '__all__'
    ? slotEntries.filter((s) => s.package_id === slotFilterPkg)
    : slotEntries;

  const upcomingSlots = [...filteredSlots]
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const pastSlots = [...filteredSlots]
    .filter((s) => s.date < today)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .slice(0, 15);

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {readOnly
            ? 'View package availability and open slots'
            : 'Manage slots, block dates, and track capacity per package'}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          {!readOnly && <TabsTrigger value="slots">Manage Slots</TabsTrigger>}
          {!readOnly && <TabsTrigger value="blocks">Blocked Dates</TabsTrigger>}
        </TabsList>

        {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6">
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active packages found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const s = getStats(pkg.id);
                const fillColor =
                  s.fillRate >= 100
                    ? 'text-red-600'
                    : s.fillRate >= 80
                    ? 'text-orange-500'
                    : 'text-green-600';
                const barColor =
                  s.fillRate >= 100
                    ? 'bg-red-500'
                    : s.fillRate >= 80
                    ? 'bg-orange-400'
                    : 'bg-green-500';

                return (
                  <div
                    key={pkg.id}
                    className="bg-card border border-border rounded-xl p-5 space-y-4"
                  >
                    {/* Package header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{pkg.name}</h3>
                        <p className="text-xs text-muted-foreground">{pkg.destination}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${fillColor}`}>
                        {s.totalFutureSlots > 0 ? `${s.fillRate}% filled` : 'No slots'}
                      </span>
                    </div>

                    {/* Stat boxes */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-secondary rounded-lg py-2 px-1">
                        <p className="text-lg font-bold">{s.totalFutureSlots}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Total Slots
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg py-2 px-1">
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                          {s.totalBooked}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Booked
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg py-2 px-1">
                        <p className="text-lg font-bold text-green-700 dark:text-green-400">
                          {s.remaining}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Remaining
                        </p>
                      </div>
                    </div>

                    {/* Fill bar */}
                    {s.totalFutureSlots > 0 && (
                      <div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(100, s.fillRate)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer meta */}
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{s.openDays} day{s.openDays !== 1 ? 's' : ''} open</span>
                      <span>{s.blockedPeriods} blocked period{s.blockedPeriods !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => {
                          setCalPkg(pkg.id);
                          setTab('calendar');
                        }}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Calendar
                      </Button>
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs"
                          onClick={() => openSlotDialog(pkg.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Slots
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── CALENDAR ───────────────────────────────────────────────────── */}
        <TabsContent value="calendar" className="mt-6">
          <div className="mb-6 max-w-xs">
            <label className="text-sm font-medium mb-2 block">Package</label>
            <Select value={calPkg} onValueChange={setCalPkg}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {calPkg ? (
            <div className="space-y-6">
              {/* 3-month grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((offset) => {
                  const m = new Date();
                  m.setMonth(m.getMonth() + offset);
                  return (
                    <AvailabilityCalendar
                      key={offset}
                      month={m}
                      blockedDates={getPkgBlocks(calPkg)}
                      bookings={getPkgBookings(calPkg)}
                      slotEntries={getPkgSlots(calPkg)}
                      onDateRangeSelect={readOnly ? undefined : openBlockDialog}
                      readOnly={readOnly}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                  <span>Available (small number = spots left)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/30" />
                  <span>Almost full (&gt;80%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900/40" />
                  <span>Fully booked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
                  <span>Blocked</span>
                </div>
              </div>

              {!readOnly && (
                <div className="flex gap-3 items-center">
                  <Button
                    size="sm"
                    onClick={() => openSlotDialog(calPkg)}
                    className="gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Availability Slots
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Select a date range on the calendar to block it
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="text-sm">Select a package to view its calendar</p>
            </div>
          )}
        </TabsContent>

        {/* ── MANAGE SLOTS ───────────────────────────────────────────────── */}
        {!readOnly && (
          <TabsContent value="slots" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Availability Slots</h2>
                <p className="text-sm text-muted-foreground">
                  {slotEntries.length} slot{slotEntries.length !== 1 ? 's' : ''} across {packages.length} package{packages.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={() => openSlotDialog()} className="gap-2">
                <Plus className="w-4 h-4" /> Add Slots
              </Button>
            </div>

            {/* Filter */}
            <div className="mb-5 max-w-xs">
              <Select value={slotFilterPkg} onValueChange={setSlotFilterPkg}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Packages ({slotEntries.length})</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({slotEntries.filter(s => s.package_id === pkg.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredSlots.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground border border-dashed border-border rounded-xl">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium">No availability slots yet</p>
                <p className="text-xs mt-1">Add slots to control how many guests can book each day</p>
                <Button onClick={() => openSlotDialog()} className="mt-4 gap-2" variant="outline">
                  <Plus className="w-4 h-4" /> Add your first slot
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingSlots.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Upcoming ({upcomingSlots.length})
                    </h3>
                    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                      {upcomingSlots.map((slot) => {
                        const booked = getBookedOnDate(slot.package_id, slot.date);
                        const remaining = Math.max(0, slot.total_slots - booked);
                        const pct = slot.total_slots > 0 ? (booked / slot.total_slots) * 100 : 0;
                        const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500';
                        const isEditing = editingSlot === slot.id;
                        return (
                          <div key={slot.id} className="px-4 py-3 flex items-center gap-4 hover:bg-secondary/20 transition-colors group">
                            {/* Date */}
                            <div className="w-28 shrink-0">
                              <p className="text-sm font-semibold">{formatDate(slot.date)}</p>
                              <p className="text-[10px] text-muted-foreground">{slot.date}</p>
                            </div>

                            {/* Package */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {slot.package_name || packages.find(p => p.id === slot.package_id)?.name || '—'}
                              </p>
                              {slot.notes && (
                                <p className="text-xs text-muted-foreground truncate">{slot.notes}</p>
                              )}
                            </div>

                            {/* Capacity — inline edit */}
                            {isEditing ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <Input
                                  type="number"
                                  min={1}
                                  className="w-20 h-7 text-sm text-center"
                                  value={editSlotCount}
                                  onChange={e => setEditSlotCount(e.target.value)}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={editSlotMutation.isPending || !editSlotCount || Number(editSlotCount) < 1}
                                  onClick={() => editSlotMutation.mutate({ id: slot.id, total_slots: Number(editSlotCount) })}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setEditingSlot(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="text-xs text-muted-foreground">{booked} booked / {slot.total_slots} total</span>
                                </div>
                                <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                                <span className={`text-sm font-bold w-16 text-right tabular-nums ${remaining === 0 ? 'text-red-600' : remaining <= slot.total_slots * 0.2 ? 'text-orange-500' : 'text-green-600'}`}>
                                  {remaining} left
                                </span>
                              </div>
                            )}

                            {/* Actions */}
                            {!isEditing && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => { setEditingSlot(slot.id); setEditSlotCount(String(slot.total_slots)); }}
                                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                  title="Edit capacity"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button
                                  onClick={() => { if (confirm('Delete this slot?')) deleteMutation.mutate(slot.id); }}
                                  disabled={deleteMutation.isPending}
                                  className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive"
                                  title="Delete slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pastSlots.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Past — last 15
                    </h3>
                    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border opacity-50">
                      {pastSlots.map((slot) => {
                        const booked = getBookedOnDate(slot.package_id, slot.date);
                        const pct = slot.total_slots > 0 ? Math.round((booked / slot.total_slots) * 100) : 0;
                        return (
                          <div key={slot.id} className="px-4 py-2.5 flex items-center gap-4 group">
                            <div className="w-28 shrink-0">
                              <p className="text-sm">{formatDate(slot.date)}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{slot.package_name || '—'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {booked}/{slot.total_slots} · {pct}% filled
                            </span>
                            <button
                              onClick={() => { if (confirm('Delete this slot?')) deleteMutation.mutate(slot.id); }}
                              disabled={deleteMutation.isPending}
                              className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── BLOCKED DATES ──────────────────────────────────────────────── */}
        {!readOnly && (
          <TabsContent value="blocks" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Blocked Date Periods</h2>
                <p className="text-sm text-muted-foreground">
                  Dates where bookings are prevented
                </p>
              </div>
              <Button onClick={openBlockDialogDirect} className="gap-2">
                <Plus className="w-4 h-4" /> Block Dates
              </Button>
            </div>

            {/* Filter */}
            <div className="mb-5 max-w-xs">
              <Select value={blockFilterPkg} onValueChange={setBlockFilterPkg}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Packages ({blocks.length})</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({blocks.filter(b => b.package_id === pkg.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredBlocks.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground border border-dashed border-border rounded-xl">
                <Lock className="w-10 h-10 mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium">No blocked dates yet</p>
                <p className="text-xs mt-1">
                  Click "Block Dates" above to prevent bookings for a date range.
                </p>
                <Button onClick={openBlockDialogDirect} className="mt-4 gap-2" variant="outline">
                  <Plus className="w-4 h-4" /> Block Dates
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold">{block.package_name}</p>
                        <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded px-1.5 py-0.5">
                          {REASON_LABELS[block.reason] || block.reason}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(block.start_date)}
                        {block.end_date !== block.start_date &&
                          ` — ${formatDate(block.end_date)}`}
                      </p>
                      {block.notes && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">
                          {block.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(block.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-400 hover:text-red-600 shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ── Block Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Package *</label>
              <Select value={blockPkg} onValueChange={setBlockPkg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date *</label>
                <Input
                  type="date"
                  value={blockStart}
                  onChange={e => setBlockStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={blockEnd}
                  min={blockStart}
                  onChange={e => setBlockEnd(e.target.value)}
                  placeholder="Same as start"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
              <Textarea
                value={blockNotes}
                onChange={(e) => setBlockNotes(e.target.value)}
                placeholder="Any additional details..."
                maxLength={200}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => addBlockMutation.mutate()}
              disabled={addBlockMutation.isPending || !blockPkg || !blockStart}
            >
              {addBlockMutation.isPending ? 'Blocking…' : 'Block Dates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Slot Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability Slots</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Package *</label>
              <Select value={slotPkg} onValueChange={setSlotPkg}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setSlotMode('single')}
                className={`flex-1 py-2 font-medium transition-colors ${slotMode === 'single' ? 'bg-primary text-white' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
              >
                Single Day
              </button>
              <button
                type="button"
                onClick={() => setSlotMode('range')}
                className={`flex-1 py-2 font-medium transition-colors ${slotMode === 'range' ? 'bg-primary text-white' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
              >
                Date Range
              </button>
            </div>

            {slotMode === 'single' ? (
              <div>
                <label className="text-sm font-medium mb-2 block">Date *</label>
                <Input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date *</label>
                  <Input type="date" value={slotRangeStart} onChange={e => setSlotRangeStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date *</label>
                  <Input type="date" value={slotRangeEnd} min={slotRangeStart} onChange={e => setSlotRangeEnd(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Available Spots per Day *</label>
              <Input
                type="number"
                value={slotCount}
                onChange={e => setSlotCount(e.target.value)}
                placeholder="e.g. 12"
                min={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {slotMode === 'range'
                  ? 'This number of spots will be set for every day in the range'
                  : 'Maximum guests that can be booked on this date'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
              <Input
                value={slotNotes}
                onChange={e => setSlotNotes(e.target.value)}
                placeholder="e.g. Peak season, limited tents"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlotDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addSlotMutation.mutate()}
              disabled={
                addSlotMutation.isPending || !slotPkg || !slotCount || Number(slotCount) < 1 ||
                (slotMode === 'single' ? !slotDate : !slotRangeStart || !slotRangeEnd)
              }
            >
              {addSlotMutation.isPending ? 'Saving…' : 'Save Slots'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
