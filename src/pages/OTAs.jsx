import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Edit2, Trash2, Globe, Mail, Phone, TrendingUp,
  BookOpen, DollarSign, Calendar, AlertCircle, CheckCircle,
  Clock, ExternalLink, Link2, Webhook, Copy, RefreshCw,
  ShieldCheck, ArrowDownLeft, Banknote, BarChart3, Activity,
  ChevronRight, Zap,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/helpers';

const STATUS_OPTIONS = ['active', 'inactive', 'pending_contract', 'suspended'];
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  pending_contract: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-700',
};
const STATUS_ICONS = {
  active: CheckCircle,
  inactive: Clock,
  pending_contract: AlertCircle,
  suspended: AlertCircle,
};

const EMPTY_FORM = {
  name: '', commission_rate: 0, status: 'active',
  contact_email: '', contact_phone: '', website: '',
  contract_start: '', contract_end: '', booking_source: '',
  payment_schedule: 'monthly', minimum_guarantee: '', notes: '',
  webhook_secret: '',
};

function generateSecret() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Commission settlement helpers ─────────────────────────────────────────────
function getSettlements(ota) {
  if (!ota.settlements) return [];
  try { return typeof ota.settlements === 'string' ? JSON.parse(ota.settlements) : ota.settlements; }
  catch { return []; }
}

function totalSettled(ota) {
  return getSettlements(ota).reduce((s, x) => s + (Number(x.amount) || 0), 0);
}

// ── Per-OTA stats ─────────────────────────────────────────────────────────────
function useOtaStats(ota, bookingsByOta) {
  const linked = bookingsByOta[ota.id] || [];
  const totalRevenue = linked.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
  const commission = totalRevenue * ((ota.commission_rate || 0) / 100);
  const settled = totalSettled(ota);
  const outstanding = Math.max(0, commission - settled);
  const netRevenue = totalRevenue - commission;
  const confirmed = linked.filter(b => ['confirmed', 'completed'].includes(b.status)).length;
  return { count: linked.length, totalRevenue, commission, settled, outstanding, netRevenue, confirmed };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OTAs() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [linkOtaId, setLinkOtaId] = useState(null);
  const [settlementOtaId, setSettlementOtaId] = useState(null);
  const [settlementForm, setSettlementForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: otas = [] } = useQuery({
    queryKey: ['otas'],
    queryFn: () => base44.entities.OTA.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 500),
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['ota-sync-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('rs_auth_token');
      const res = await fetch('/api/automations/logs?type=ota_webhook&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      try {
        const data = await safeJson(res);
        return res.ok ? data : [];
      } catch {
        return [];
      }
    },
  });

  const bookingsByOta = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (b.ota_id) {
        if (!map[b.ota_id]) map[b.ota_id] = [];
        map[b.ota_id].push(b);
      }
    });
    return map;
  }, [bookings]);

  const unlinkedBookings = useMemo(() =>
    bookings.filter(b => !b.ota_id && b.booking_source === 'ota'), [bookings]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OTA.create(data),
    onSuccess: () => {
      toast({ title: 'OTA channel added' });
      setFormData(EMPTY_FORM); setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['otas'] });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.OTA.update(editingId, data),
    onSuccess: () => {
      toast({ title: 'OTA updated' });
      setFormData(EMPTY_FORM); setEditingId(null); setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['otas'] });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OTA.delete(id),
    onSuccess: () => { toast({ title: 'OTA removed' }); queryClient.invalidateQueries({ queryKey: ['otas'] }); },
  });

  const linkMutation = useMutation({
    mutationFn: ({ bookingId, otaId, otaName }) =>
      base44.entities.Booking.update(bookingId, { ota_id: otaId, ota_name: otaName }),
    onSuccess: () => { toast({ title: 'Booking linked' }); queryClient.invalidateQueries({ queryKey: ['bookings'] }); },
  });

  const unlinkMutation = useMutation({
    mutationFn: (bookingId) =>
      base44.entities.Booking.update(bookingId, { ota_id: null, ota_name: '' }),
    onSuccess: () => { toast({ title: 'Booking unlinked' }); queryClient.invalidateQueries({ queryKey: ['bookings'] }); },
  });

  // Record a commission settlement
  const recordSettlement = async () => {
    const ota = otas.find(o => o.id === settlementOtaId);
    if (!ota || !settlementForm.amount) return;
    const existing = getSettlements(ota);
    const updated = [...existing, {
      id: Date.now().toString(36),
      amount: Number(settlementForm.amount),
      date: settlementForm.date,
      notes: settlementForm.notes,
    }];
    await base44.entities.OTA.update(settlementOtaId, { settlements: JSON.stringify(updated) });
    toast({ title: 'Settlement recorded', description: `${formatCurrency(Number(settlementForm.amount))} marked as settled.` });
    queryClient.invalidateQueries({ queryKey: ['otas'] });
    setSettlementOtaId(null);
    setSettlementForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  };

  const handleSubmit = () => {
    if (!formData.name || formData.commission_rate === '') {
      toast({ title: 'Name and commission rate are required', variant: 'destructive' });
      return;
    }
    const payload = { ...formData };
    if (editingId) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const handleEdit = (ota) => {
    setEditingId(ota.id);
    setFormData({ ...EMPTY_FORM, ...ota });
    setIsOpen(true);
  };

  const handleClose = () => { setIsOpen(false); setEditingId(null); setFormData(EMPTY_FORM); };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Copied to clipboard' }));
  };

  // ── Summary totals ──────────────────────────────────────────────────────────
  const totals = useMemo(() => otas.reduce((acc, ota) => {
    const linked = bookingsByOta[ota.id] || [];
    const rev = linked.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
    const comm = rev * ((ota.commission_rate || 0) / 100);
    acc.bookings += linked.length;
    acc.revenue += rev;
    acc.commission += comm;
    acc.settled += totalSettled(ota);
    acc.netRevenue += rev - comm;
    return acc;
  }, { bookings: 0, revenue: 0, commission: 0, settled: 0, netRevenue: 0 }), [otas, bookingsByOta]);

  const linkingOta = otas.find(o => o.id === linkOtaId);
  const linkedBookings = linkOtaId ? (bookingsByOta[linkOtaId] || []) : [];
  const settlementOta = otas.find(o => o.id === settlementOtaId);

  // Webhook base URL shown in form
  const webhookBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">OTA Channels</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage online travel agency partners, webhook integrations, contracts & commission settlements
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add OTA
        </Button>
      </div>

      {/* Summary strip */}
      {otas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">OTA Bookings</div>
              <div className="text-xl font-bold">{totals.bookings}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Gross Revenue</div>
              <div className="text-xl font-bold">{formatCurrency(totals.revenue)}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Commission Due</div>
              <div className="text-xl font-bold text-orange-600">{formatCurrency(totals.commission)}</div>
              {totals.settled > 0 && (
                <div className="text-xs text-green-600">{formatCurrency(totals.settled)} settled</div>
              )}
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Net Revenue</div>
              <div className="text-xl font-bold text-emerald-700">{formatCurrency(totals.netRevenue)}</div>
            </div>
          </Card>
        </div>
      )}

      {/* OTA Cards grid */}
      {otas.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold mb-1">No OTA channels yet</p>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Add OTA partners to track commissions, receive webhook bookings, and manage payouts.
          </p>
          <Button onClick={() => setIsOpen(true)} className="mt-4 gap-2"><Plus className="w-4 h-4" />Add OTA</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {otas.map((ota) => {
            const stats = useOtaStatsHelper(ota, bookingsByOta);
            const StatusIcon = STATUS_ICONS[ota.status] || CheckCircle;
            const isExpired = ota.contract_end && new Date(ota.contract_end) < new Date();
            const expiringSoon = ota.contract_end && !isExpired && new Date(ota.contract_end) < new Date(Date.now() + 30 * 86400000);
            const hasWebhook = !!ota.webhook_secret;
            const outstandingComm = stats.outstanding;

            return (
              <Card key={ota.id} className="p-4 flex flex-col gap-3 relative">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base truncate">{ota.name}</h3>
                      {hasWebhook && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                          <Zap className="w-2.5 h-2.5" />Webhook
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${STATUS_COLORS[ota.status] || 'bg-gray-100 text-gray-600'}`}>
                      <StatusIcon className="w-3 h-3" />
                      {ota.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLinkOtaId(ota.id)} title="Manage linked bookings">
                      <Link2 className="w-3.5 h-3.5 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(ota)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm(`Delete ${ota.name}?`)) deleteMutation.mutate(ota.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-secondary/50 rounded p-2">
                    <div className="text-xs text-muted-foreground">Commission</div>
                    <div className="font-bold text-sm">{ota.commission_rate}%</div>
                  </div>
                  <div className="bg-secondary/50 rounded p-2">
                    <div className="text-xs text-muted-foreground">Bookings</div>
                    <div className="font-bold text-sm">{stats.count}</div>
                  </div>
                </div>

                {/* Revenue / Commission breakdown */}
                {stats.totalRevenue > 0 && (
                  <div className="space-y-1.5 text-sm border-t border-border/50 pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Revenue</span>
                      <span className="font-medium">{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission ({ota.commission_rate}%)</span>
                      <span className="font-medium text-orange-600">−{formatCurrency(stats.commission)}</span>
                    </div>
                    {stats.settled > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground pl-3">Settled</span>
                        <span className="text-green-600">−{formatCurrency(stats.settled)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-border/50 pt-1.5">
                      <span>Net Revenue</span>
                      <span className="text-emerald-700">{formatCurrency(stats.netRevenue)}</span>
                    </div>
                  </div>
                )}

                {/* Outstanding commission alert */}
                {outstandingComm > 0 && (
                  <button
                    onClick={() => setSettlementOtaId(ota.id)}
                    className="w-full flex items-center justify-between text-xs bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 hover:bg-orange-100 transition-colors"
                  >
                    <span className="text-orange-700 font-medium">
                      {formatCurrency(outstandingComm)} commission outstanding
                    </span>
                    <span className="text-orange-600 flex items-center gap-0.5">
                      Record settlement <ChevronRight className="w-3 h-3" />
                    </span>
                  </button>
                )}

                {/* Contract period */}
                {(ota.contract_start || ota.contract_end) && (
                  <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${isExpired ? 'bg-red-50 text-red-700' : expiringSoon ? 'bg-yellow-50 text-yellow-700' : 'bg-secondary/50 text-muted-foreground'}`}>
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>
                      {isExpired ? 'Contract expired · ' : expiringSoon ? 'Expiring soon — ' : 'Contract: '}
                      {ota.contract_start && formatDate(ota.contract_start)}
                      {ota.contract_start && ota.contract_end && ' → '}
                      {ota.contract_end && formatDate(ota.contract_end)}
                    </span>
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-1">
                  {ota.contact_email && (
                    <a href={`mailto:${ota.contact_email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                      <Mail className="w-3 h-3" />{ota.contact_email}
                    </a>
                  )}
                  {ota.contact_phone && (
                    <a href={`tel:${ota.contact_phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                      <Phone className="w-3 h-3" />{ota.contact_phone}
                    </a>
                  )}
                  {ota.website && (
                    <a href={ota.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                      <Globe className="w-3 h-3" /><span className="truncate">{ota.website}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                </div>
                {ota.notes && <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 line-clamp-2">{ota.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit OTA Dialog ─────────────────────────────────────────── */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit OTA Channel' : 'Add OTA Channel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">OTA Name *</label>
                <Input placeholder="e.g., Booking.com, Expedia, Safari Bookings"
                  value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Commission Rate (%) *</label>
                <Input type="number" min="0" max="100" step="0.5" placeholder="e.g., 15"
                  value={formData.commission_rate}
                  onChange={e => setFormData(f => ({ ...f, commission_rate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select value={formData.status || 'active'} onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Payment Schedule</label>
                <select value={formData.payment_schedule || 'monthly'}
                  onChange={e => setFormData(f => ({ ...f, payment_schedule: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="per_booking">Per Booking</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Min. Guarantee (USD)</label>
                <Input type="number" min="0" placeholder="0" value={formData.minimum_guarantee || ''}
                  onChange={e => setFormData(f => ({ ...f, minimum_guarantee: parseFloat(e.target.value) || '' }))} />
              </div>
            </div>

            {/* Contract dates */}
            <div className="border-t border-border pt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Contract Start</label>
                <Input type="date" value={formData.contract_start || ''}
                  onChange={e => setFormData(f => ({ ...f, contract_start: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Contract End</label>
                <Input type="date" value={formData.contract_end || ''}
                  onChange={e => setFormData(f => ({ ...f, contract_end: e.target.value }))} />
              </div>
            </div>

            {/* Contact */}
            <div className="border-t border-border pt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Email</label>
                <Input type="email" placeholder="partner@ota.com" value={formData.contact_email || ''}
                  onChange={e => setFormData(f => ({ ...f, contact_email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Phone</label>
                <Input type="tel" placeholder="+1234567890" value={formData.contact_phone || ''}
                  onChange={e => setFormData(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Website</label>
                <Input type="url" placeholder="https://example.com" value={formData.website || ''}
                  onChange={e => setFormData(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes / Contract Terms</label>
                <Textarea rows={2} placeholder="Special terms, cancellation policy, rate parity clauses..."
                  value={formData.notes || ''} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold">Webhook Integration</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Share the webhook URL and secret with your OTA to receive bookings automatically.
              </p>

              {/* Webhook URL (read-only) */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Webhook Endpoint URL</label>
                <div className="flex gap-2">
                  <Input readOnly value={`${webhookBase}/api/webhook/ota`}
                    className="font-mono text-xs bg-secondary text-muted-foreground" />
                  <Button type="button" size="icon" variant="outline"
                    onClick={() => copyToClipboard(`${webhookBase}/api/webhook/ota`)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Webhook secret */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Webhook Secret (X-Webhook-Secret header)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Generate or enter a secret..."
                    value={formData.webhook_secret || ''}
                    onChange={e => setFormData(f => ({ ...f, webhook_secret: e.target.value }))}
                    className="font-mono text-xs"
                  />
                  <Button type="button" size="icon" variant="outline" title="Generate secret"
                    onClick={() => setFormData(f => ({ ...f, webhook_secret: generateSecret() }))}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  {formData.webhook_secret && (
                    <Button type="button" size="icon" variant="outline"
                      onClick={() => copyToClipboard(formData.webhook_secret)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  OTA must send this value as the <code className="bg-secondary px-1 rounded">X-Webhook-Secret</code> header.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Update OTA' : 'Add OTA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Booking Management Dialog ─────────────────────────────────────── */}
      <Dialog open={!!linkOtaId} onOpenChange={() => setLinkOtaId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4" /> {linkingOta?.name} — Bookings & Settlements
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="linked">
            <TabsList className="w-full">
              <TabsTrigger value="linked" className="flex-1">Linked ({linkedBookings.length})</TabsTrigger>
              <TabsTrigger value="unlinked" className="flex-1">Available ({unlinkedBookings.length})</TabsTrigger>
              <TabsTrigger value="settlements" className="flex-1">Settlements</TabsTrigger>
              <TabsTrigger value="sync" className="flex-1">Sync Log</TabsTrigger>
            </TabsList>

            {/* Linked bookings */}
            <TabsContent value="linked" className="mt-3 space-y-2">
              {linkedBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bookings linked yet.</p>
              ) : (
                <>
                  {linkedBookings.map(b => (
                    <div key={b.id} className="flex items-start justify-between p-3 border border-border rounded-lg text-sm gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{b.booking_ref}</span>
                          {b.ota_reference && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                              OTA: {b.ota_reference}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 truncate">{b.client_name} · {b.package_name}</div>
                        {b.start_date && <div className="text-xs text-muted-foreground">{formatDate(b.start_date)}</div>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(b.total_amount)}</div>
                          <div className="text-xs text-orange-600">
                            −{formatCurrency((b.total_amount || 0) * ((linkingOta?.commission_rate || 0) / 100))} comm.
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive"
                          onClick={() => unlinkMutation.mutate(b.id)}>Unlink</Button>
                      </div>
                    </div>
                  ))}
                  {/* Totals row */}
                  {(() => {
                    const totalRev = linkedBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
                    const totalComm = totalRev * ((linkingOta?.commission_rate || 0) / 100);
                    const settledAmt = totalSettled(linkingOta || {});
                    return (
                      <div className="border-t border-border pt-2 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Gross Revenue</span><span className="font-bold">{formatCurrency(totalRev)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Commission ({linkingOta?.commission_rate}%)</span><span className="font-bold text-orange-600">{formatCurrency(totalComm)}</span></div>
                        {settledAmt > 0 && <div className="flex justify-between"><span className="text-muted-foreground pl-4">Settled</span><span className="text-green-600">{formatCurrency(settledAmt)}</span></div>}
                        <div className="flex justify-between font-semibold"><span>Outstanding</span><span className="text-orange-700">{formatCurrency(Math.max(0, totalComm - settledAmt))}</span></div>
                        <div className="flex justify-between text-emerald-700 font-semibold border-t border-border/50 pt-1"><span>Net Revenue</span><span>{formatCurrency(totalRev - totalComm)}</span></div>
                      </div>
                    );
                  })()}
                </>
              )}
            </TabsContent>

            {/* Available to link */}
            <TabsContent value="unlinked" className="mt-3">
              {unlinkedBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No unlinked OTA bookings found.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {unlinkedBookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 border border-border rounded-lg text-sm">
                      <div>
                        <span className="font-mono font-medium">{b.booking_ref}</span>
                        <span className="text-muted-foreground ml-2">· {b.client_name}</span>
                        <span className="text-muted-foreground ml-2">· {b.package_name}</span>
                        {b.start_date && <span className="text-muted-foreground ml-2">· {formatDate(b.start_date)}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(b.total_amount)}</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200"
                          onClick={() => linkMutation.mutate({ bookingId: b.id, otaId: linkOtaId, otaName: linkingOta?.name })}>
                          Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Settlements */}
            <TabsContent value="settlements" className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Track commission payments made to this OTA.</p>
                <Button size="sm" className="gap-1.5" onClick={() => setSettlementOtaId(linkOtaId)}>
                  <Banknote className="w-3.5 h-3.5" /> Record Settlement
                </Button>
              </div>
              {getSettlements(linkingOta || {}).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No settlements recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {getSettlements(linkingOta || {}).map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg text-sm">
                      <div>
                        <div className="font-medium text-green-700">{formatCurrency(s.amount)}</div>
                        <div className="text-xs text-muted-foreground">{s.date && formatDate(s.date)}{s.notes && ` — ${s.notes}`}</div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sync log */}
            <TabsContent value="sync" className="mt-3 space-y-2">
              {(() => {
                const otaLogs = syncLogs.filter(l => l.message?.includes(linkingOta?.name));
                return otaLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No webhook sync events recorded yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Events appear here when bookings arrive via webhook.</p>
                  </div>
                ) : (
                  otaLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-border rounded-lg text-sm">
                      <ArrowDownLeft className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{log.entity_ref}</div>
                        <div className="text-xs text-muted-foreground">{log.message}</div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {log.created_date ? new Date(log.created_date).toLocaleDateString() : ''}
                      </div>
                    </div>
                  ))
                );
              })()}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ── Commission Settlement Dialog ───────────────────────────────────── */}
      <Dialog open={!!settlementOtaId} onOpenChange={() => setSettlementOtaId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Record Commission Settlement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {settlementOta && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <div className="text-orange-700 font-medium">{settlementOta.name}</div>
                {(() => {
                  const s = useOtaStatsHelper(settlementOta, bookingsByOta);
                  return <div className="text-orange-600 text-xs mt-0.5">Outstanding: {formatCurrency(s.outstanding)}</div>;
                })()}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">Amount Settled *</label>
              <Input type="number" min="0" step="0.01" placeholder="e.g., 1500.00"
                value={settlementForm.amount}
                onChange={e => setSettlementForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Settlement Date</label>
              <Input type="date" value={settlementForm.date}
                onChange={e => setSettlementForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <Input placeholder="Bank transfer ref, invoice number..."
                value={settlementForm.notes}
                onChange={e => setSettlementForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setSettlementOtaId(null)}>Cancel</Button>
            <Button onClick={recordSettlement} disabled={!settlementForm.amount}>
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Record Settlement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Moved outside component to avoid Rules of Hooks violation
function useOtaStatsHelper(ota, bookingsByOta) {
  const linked = bookingsByOta[ota.id] || [];
  const totalRevenue = linked.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
  const commission = totalRevenue * ((ota.commission_rate || 0) / 100);
  const settled = totalSettled(ota);
  const outstanding = Math.max(0, commission - settled);
  const netRevenue = totalRevenue - commission;
  const confirmed = linked.filter(b => ['confirmed', 'completed'].includes(b.status)).length;
  return { count: linked.length, totalRevenue, commission, settled, outstanding, netRevenue, confirmed };
}
