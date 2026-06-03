import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Search, BookOpen, Filter, MapPin, Clock, Users as UsersIcon, DollarSign, CheckCircle, Globe, Send, Download, LayoutList, Columns3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { celebrate } from '@/lib/confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, generateRef } from '@/lib/helpers';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import CurrencySelect from '@/components/ui/CurrencySelect';
import ReportDownloadModal from '@/components/ReportDownloadModal';
import { cn } from '@/lib/utils';
import { safeJson } from '@/lib/safeJson';
import { buildApiUrl } from '@/api/localClient';
import FilterBar from '@/components/FilterBar';

// ── Kanban Board ──────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: 'inquiry',     label: 'Inquiry',     color: 'bg-gray-100 dark:bg-gray-800',   dot: 'bg-gray-400',   border: 'border-gray-200 dark:border-gray-700' },
  { id: 'quoted',      label: 'Quoted',      color: 'bg-blue-50 dark:bg-blue-950/40', dot: 'bg-blue-400',   border: 'border-blue-200 dark:border-blue-800' },
  { id: 'confirmed',   label: 'Confirmed',   color: 'bg-green-50 dark:bg-green-950/40', dot: 'bg-green-500', border: 'border-green-200 dark:border-green-800' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-amber-50 dark:bg-amber-950/40', dot: 'bg-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  { id: 'completed',   label: 'Completed',   color: 'bg-purple-50 dark:bg-purple-950/40', dot: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'cancelled',   label: 'Cancelled',   color: 'bg-red-50 dark:bg-red-950/40',   dot: 'bg-red-400',    border: 'border-red-200 dark:border-red-800' },
];

function KanbanBoard({ bookings, onUpdate, onOpen }) {
  const byStatus = (status) => bookings.filter(b => b.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
      {KANBAN_COLUMNS.map(col => {
        const cards = byStatus(col.id);
        return (
          <div key={col.id} className={`flex-shrink-0 w-64 rounded-2xl border ${col.border} ${col.color} p-3 flex flex-col gap-2`}>
            {/* Column header */}
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className="text-xs font-semibold text-foreground">{col.label}</span>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full">{cards.length}</span>
            </div>

            {/* Cards */}
            {cards.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-8 opacity-60">No bookings</div>
            )}
            {cards.map(b => (
              <div
                key={b.id}
                onClick={() => onOpen(b.id)}
                className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-150 group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">{b.client_name}</p>
                  <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 bg-muted px-1.5 py-0.5 rounded">{b.booking_ref?.slice(-6)}</span>
                </div>
                {b.package_name && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {b.package_name}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs">
                  {b.start_date ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{new Date(b.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ) : <span />}
                  {b.num_guests ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <UsersIcon className="w-3 h-3" />{b.num_guests}
                    </span>
                  ) : null}
                </div>
                {b.total_amount > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 text-xs font-semibold text-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-green-500" />{formatCurrency(b.total_amount, b.currency)}
                  </div>
                )}
                {/* Quick status buttons */}
                <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  {KANBAN_COLUMNS.filter(c => c.id !== b.status).slice(0, 2).map(c => (
                    <button
                      key={c.id}
                      onClick={() => onUpdate(b.id, { status: c.id })}
                      className="flex-1 text-[10px] py-1 px-2 rounded-lg border border-border bg-muted hover:bg-accent transition-colors text-muted-foreground truncate"
                    >
                      → {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function Bookings() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sendingEmail, setSendingEmail] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({ num_guests: 1, status: 'inquiry', booking_source: 'direct' });
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', user?.email],
    queryFn: async () => {
      const allBookings = await base44.entities.Booking.list('-created_date', 200);
      // Admin sees all bookings, normal users see only their own
      return user?.role === 'admin' ? allBookings : allBookings.filter(b => b.created_by === user?.email);
    },
    enabled: !!user,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });
  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.Package.filter({ status: 'active' }),
  });
  const { data: otas = [] } = useQuery({
    queryKey: ['otas'],
    queryFn: () => base44.entities.OTA.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const client = clients.find(c => c.id === data.client_id);
      const pkg = packages.find(p => p.id === data.package_id);
      const total = (pkg?.price_per_person || 0) * (data.num_guests || 1);
      const endDate = pkg && data.start_date
        ? new Date(new Date(data.start_date).getTime() + (pkg.duration_days - 1) * 86400000).toISOString().split('T')[0]
        : data.start_date;

      // Auto-fill custom_itinerary from package, adjusting dates to booking's start_date
      let custom_itinerary = undefined;
      if (pkg?.itinerary_days && data.start_date) {
        try {
          const pkgDays = JSON.parse(pkg.itinerary_days);
          const start = new Date(data.start_date);
          const filledDays = pkgDays.map((day, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return {
              ...day,
              date: date.toISOString().split('T')[0],
              label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            };
          });
          custom_itinerary = JSON.stringify(filledDays);
        } catch {}
      }

      return base44.entities.Booking.create({
        ...data,
        booking_ref: generateRef('SF'),
        client_name: client?.full_name,
        client_email: client?.email,
        package_name: pkg?.name,
        total_amount: total,
        end_date: endDate,
        ...(custom_itinerary ? { custom_itinerary } : {}),
      });
    },
    onSuccess: () => {
      celebrate('side');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowForm(false);
      setFormData({ num_guests: 1, status: 'inquiry', booking_source: 'direct' });
      setSelectedPkg(null);
    },
  });

  const handlePackageSelect = (pkgId) => {
    const pkg = packages.find(p => p.id === pkgId);
    setSelectedPkg(pkg || null);
    const total = (pkg?.price_per_person || 0) * (formData.num_guests || 1);
    // Auto-compute end date if start_date already set
    let end_date = formData.end_date;
    if (pkg && formData.start_date) {
      end_date = new Date(new Date(formData.start_date).getTime() + (pkg.duration_days - 1) * 86400000).toISOString().split('T')[0];
    }
    setFormData(prev => ({
      ...prev,
      package_id: pkgId,
      total_amount: total,
      end_date,
    }));
  };

  const handleGuestsChange = (val) => {
    const guests = parseInt(val) || 1;
    const total = (selectedPkg?.price_per_person || 0) * guests;
    setFormData(prev => ({ ...prev, num_guests: guests, total_amount: total }));
  };

  const handleStartDateChange = async (val) => {
    let end_date = formData.end_date;
    if (selectedPkg && val) {
      end_date = new Date(new Date(val).getTime() + (selectedPkg.duration_days - 1) * 86400000).toISOString().split('T')[0];
      
      // Check availability via server-side authoritative endpoint
      try {
        const token = localStorage.getItem('rs_auth_token');
        const avRes = await fetch('/api/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ package_id: selectedPkg.id, start_date: val, end_date }),
        });
        const avData = await safeJson(avRes);
        setAvailabilityError(avData.available ? '' : (avData.reason || 'Package not available for these dates'));
      } catch {
        setAvailabilityError('');
      }
    }
    setFormData(prev => ({ ...prev, start_date: val, end_date }));
  };

  const filtered = bookings.filter(b => {
    const matchSearch = (b.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.booking_ref || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sendBookingConfirmation = async (b) => {
    if (!b.client_email) { toast({ title: 'No client email', description: 'This booking has no client email address.', variant: 'destructive' }); return; }
    setSendingEmail(b.id);
    try {
      const res = await fetch(buildApiUrl('/api/email/send-booking-confirmation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify({
          booking_ref: b.booking_ref, client_name: b.client_name, client_email: b.client_email,
          package_name: b.package_name, start_date: b.start_date, end_date: b.end_date,
          num_guests: b.num_guests, total_amount: b.total_amount, currency: b.currency || 'USD',
          amount_paid: b.amount_paid || 0, booking_source: b.booking_source, special_requests: b.special_requests,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast({ title: 'Confirmation sent!', description: `Emailed to ${b.client_email}` });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(null);
    }
  };

  // KPI summary
  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  const totalRevenue = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const confirmedRevenue = bookings.filter(b => ['confirmed','in_progress','completed'].includes(b.status)).reduce((s, b) => s + (b.total_amount || 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-5">
      <PageHeader title={t('bookings')} description={t('manage_safari_reservations')}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Kanban view"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" onClick={() => setReportOpen(true)} className="gap-2">
            <Download className="w-4 h-4" />Report
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> {t('new_booking_btn')}
          </Button>
        </div>
      </PageHeader>

      {/* Advanced Filter Bar */}
      <FilterBar
        searchPlaceholder={t('search_placeholder')}
        onSearchChange={setSearch}
        filters={[
          {
            id: 'status',
            options: [
              { label: 'All Status', value: 'all' },
              { label: t('inquiry'), value: 'inquiry' },
              { label: t('quoted'), value: 'quoted' },
              { label: t('confirmed'), value: 'confirmed' },
              { label: t('in_progress'), value: 'in_progress' },
              { label: t('completed'), value: 'completed' },
              { label: t('cancelled'), value: 'cancelled' },
            ],
            value: statusFilter,
          },
        ]}
        onFilterChange={(filterId, value) => {
          if (filterId === 'status') setStatusFilter(value);
        }}
        onClearAll={() => {
          setSearch('');
          setStatusFilter('all');
        }}
      />

      {/* Status quick stats */}
      {bookings.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'inquiry',     label: 'Inquiry',     dot: 'bg-gray-400' },
            { key: 'quoted',      label: 'Quoted',      dot: 'bg-blue-400' },
            { key: 'confirmed',   label: 'Confirmed',   dot: 'bg-green-500' },
            { key: 'in_progress', label: 'In Progress', dot: 'bg-amber-400' },
            { key: 'completed',   label: 'Completed',   dot: 'bg-purple-500' },
            { key: 'cancelled',   label: 'Cancelled',   dot: 'bg-red-400' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                statusFilter === s.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", s.dot)} />
              {s.label}
              <span className="font-bold">{statusCounts[s.key] || 0}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground px-2">
            <span>Total: <span className="font-semibold text-foreground">{formatCurrency(totalRevenue)}</span></span>
            <span>Confirmed: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(confirmedRevenue)}</span></span>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title={t('no_bookings')} description={t('no_bookings_start')} actionLabel={t('new_booking_btn')} onAction={() => setShowForm(true)} />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard bookings={filtered} onUpdate={(id, patch) => updateMutation.mutate({ id, data: patch })} onOpen={(id) => window.location.href = `/bookings/${id}`} />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('reference')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('client')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('source')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('package')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('dates')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('num_guests')}</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('amount')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">{t('status')}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/bookings/${b.id}`}>
                  <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{b.booking_ref}</td>
                  <td className="px-5 py-3.5 text-sm font-medium">{b.client_name}</td>
                  <td className="px-5 py-3.5 text-sm">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-secondary text-muted-foreground capitalize">
                      {b.booking_source === 'ota' ? b.ota_name || 'OTA' : b.booking_source === 'agent' ? b.agent_name || 'Agent' : 'Direct'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm">{b.package_name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDate(b.start_date)}</td>
                  <td className="px-5 py-3.5 text-sm text-center">{b.num_guests}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-right">{formatCurrency(b.total_amount)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => sendBookingConfirmation(b)} disabled={sendingEmail === b.id} title={b.client_email ? `Email confirmation to ${b.client_email}` : 'No client email'}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReportDownloadModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        type="bookings"
        allRecords={bookings}
      />

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setFormData({ num_guests: 1, status: 'inquiry', booking_source: 'direct' }); setSelectedPkg(null); } }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('new_booking_btn')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-5">

            {/* Client */}
            <div className="space-y-2">
              <Label>{t('client')} *</Label>
              <Select value={formData.client_id || ''} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('select_client')} /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Package */}
            <div className="space-y-2">
              <Label>{t('package')} *</Label>
              <Select value={formData.package_id || ''} onValueChange={handlePackageSelect}>
                <SelectTrigger><SelectValue placeholder={t('select_package')} /></SelectTrigger>
                <SelectContent>
                  {packages.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.destination} · {p.duration_days}d · {formatCurrency(p.price_per_person)}/pp
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Package details card — shown after selection */}
            {selectedPkg && (
              <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('package_details_header')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{selectedPkg.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{selectedPkg.duration_days} days</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formatCurrency(selectedPkg.price_per_person)} / person</span>
                  </div>
                  {selectedPkg.max_guests && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UsersIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Max {selectedPkg.max_guests} guests</span>
                    </div>
                  )}
                </div>
                {selectedPkg.includes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Includes</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPkg.includes.split(',').map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-card border border-border px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3 text-green-500" />{item.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Availability Error */}
            {availabilityError && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{availabilityError}</p>
              </div>
            )}

            {/* Dates & Guests */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('start_date')} *</Label>
                <Input type="date" required value={formData.start_date || ''} onChange={(e) => handleStartDateChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('end_date')}</Label>
                <Input type="date" value={formData.end_date || ''} readOnly={!!selectedPkg} className={selectedPkg ? 'bg-secondary text-muted-foreground' : ''} onChange={(e) => !selectedPkg && setFormData({ ...formData, end_date: e.target.value })} />
                {selectedPkg && <p className="text-xs text-muted-foreground">Auto-calculated ({selectedPkg.duration_days} days)</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('num_guests')} *</Label>
                <Input type="number" min="1" max={selectedPkg?.max_guests || 999} required value={formData.num_guests} onChange={(e) => handleGuestsChange(e.target.value)} />
                {selectedPkg?.max_guests && <p className="text-xs text-muted-foreground">{t('max')}: {selectedPkg.max_guests}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('total_amount')}</Label>
                <Input readOnly value={formData.total_amount ? formatCurrency(formData.total_amount) : '—'} className="bg-secondary font-semibold text-foreground" />
                {selectedPkg && formData.num_guests > 1 && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(selectedPkg.price_per_person)} × {formData.num_guests} guests</p>
                )}
              </div>
            </div>

            {/* Booking Source */}
            <div className="space-y-2">
              <Label>{t('booking_source')} *</Label>
              <Select value={formData.booking_source || 'direct'} onValueChange={(v) => setFormData({ ...formData, booking_source: v, ota_name: '', ota_reference: '', agent_id: '' })}>
                <SelectTrigger><SelectValue placeholder={t('source')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">{t('direct')}</SelectItem>
                  <SelectItem value="ota">OTA Channel</SelectItem>
                  <SelectItem value="agent">Safari Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* OTA Details */}
            {formData.booking_source === 'ota' && (
              <>
                {/* Select from registered OTAs or enter manually */}
                {otas.filter(o => o.status === 'active').length > 0 ? (
                  <div className="space-y-2">
                    <Label>OTA Channel *</Label>
                    <Select
                      value={formData.ota_id || '__manual__'}
                      onValueChange={(v) => {
                        if (v === '__manual__') {
                          setFormData({ ...formData, ota_id: '', ota_name: '', ota_commission_rate: '' });
                        } else {
                          const ota = otas.find(o => o.id === v);
                          setFormData({
                            ...formData,
                            ota_id: ota?.id || '',
                            ota_name: ota?.name || '',
                            ota_commission_rate: ota?.commission_rate || '',
                          });
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select OTA channel..." /></SelectTrigger>
                      <SelectContent>
                        {otas.filter(o => o.status === 'active').map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.name} ({o.commission_rate}% commission)</SelectItem>
                        ))}
                        <SelectItem value="__manual__">Other / Enter manually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {/* Manual OTA name if not in registered list */}
                {(!formData.ota_id || !otas.find(o => o.id === formData.ota_id)) && (
                  <div className="space-y-2">
                    <Label>OTA Name *</Label>
                    <Input
                      placeholder="e.g., Booking.com, Airbnb, Expedia"
                      value={formData.ota_name || ''}
                      onChange={(e) => setFormData({ ...formData, ota_name: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>OTA Reference / Booking ID</Label>
                    <Input
                      placeholder="e.g., BK-123456"
                      value={formData.ota_reference || ''}
                      onChange={(e) => setFormData({ ...formData, ota_reference: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Commission Rate (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.5" placeholder="e.g., 15"
                      value={formData.ota_commission_rate || ''}
                      onChange={(e) => setFormData({ ...formData, ota_commission_rate: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Agent Details */}
            {formData.booking_source === 'agent' && (
              <>
                <div className="space-y-2">
                  <Label>Safari Agent *</Label>
                  <Input
                    placeholder="Agent name"
                    value={formData.agent_name || ''}
                    onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 500"
                    value={formData.agent_commission || ''}
                    onChange={(e) => setFormData({ ...formData, agent_commission: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission Currency</Label>
                  <CurrencySelect value={formData.commission_currency || 'USD'} onValueChange={(v) => setFormData({ ...formData, commission_currency: v })} />
                </div>
              </>
            )}

            {/* Language */}
            <div className="space-y-2">
              <Label>Guest Language</Label>
              <Select value={formData.lang || ''} onValueChange={(v) => setFormData({ ...formData, lang: v || undefined })}>
                <SelectTrigger><SelectValue placeholder="Use client's preferred language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Kiswahili</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Overrides the client default for notifications on this booking.</p>
            </div>

            {/* Special Requests */}
            <div className="space-y-2">
              <Label>{t('special_requests')}</Label>
              <Textarea rows={2} value={formData.special_requests || ''} onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })} placeholder="Dietary requirements, accessibility needs, etc." />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormData({ num_guests: 1, status: 'inquiry', booking_source: 'direct' }); setSelectedPkg(null); }}>{t('cancel')}</Button>
              <Button type="submit" disabled={
                createMutation.isPending ||
                !formData.client_id ||
                !formData.package_id ||
                !!availabilityError ||
                (formData.booking_source === 'ota' && !formData.ota_name) ||
                (formData.booking_source === 'agent' && !formData.agent_name)
              }>
                {createMutation.isPending ? t('creating') : t('create_booking')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}