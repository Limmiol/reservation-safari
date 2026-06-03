import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/helpers';
import {
  Mail, RefreshCw, CheckCircle, XCircle, Clock,
  BookOpen, FileText, CreditCard, FileCheck, AlertTriangle,
  CalendarX, BarChart3, Zap, Play, MessageSquare, Phone,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const token = () => localStorage.getItem('rs_auth_token');
const apiFetch = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...opts.headers },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  }).then(r => r.json());

// ── Automation rule definitions ────────────────────────────────────────────────
// Each rule has an `email` key; some also have `sms` and/or `whatsapp` keys to
// turn on the same trigger on those channels independently.
const RULES = [
  {
    key        : 'booking_confirmation_auto',
    smsKey     : 'booking_confirmation_sms',
    whatsappKey: 'booking_confirmation_whatsapp',
    label      : 'Booking Confirmation',
    description: 'Notify the client when a booking is created and again when it is confirmed.',
    icon       : BookOpen,
    color      : 'text-blue-600',
    bg         : 'bg-blue-50 dark:bg-blue-900/20',
    trigger    : 'Event-based',
    types      : ['booking_created', 'booking_confirmed', 'booking_received_sms', 'booking_confirmed_sms', 'booking_received_whatsapp', 'booking_confirmed_whatsapp'],
  },
  {
    key        : 'invoice_auto',
    label      : 'Invoice Auto-Send',
    description: 'Automatically email the invoice to the client as soon as it is created or marked as "Sent".',
    icon       : FileText,
    color      : 'text-purple-600',
    bg         : 'bg-purple-50 dark:bg-purple-900/20',
    trigger    : 'Event-based',
    types      : ['invoice_sent'],
  },
  {
    key        : 'payment_receipt_auto',
    smsKey     : 'payment_receipt_sms',
    whatsappKey: 'payment_receipt_whatsapp',
    label      : 'Payment Receipt',
    description: 'Send a receipt to the client whenever a payment is recorded as confirmed or paid.',
    icon       : CreditCard,
    color      : 'text-green-600',
    bg         : 'bg-green-50 dark:bg-green-900/20',
    trigger    : 'Event-based',
    types      : ['payment_receipt', 'payment_receipt_sms', 'payment_receipt_whatsapp'],
  },
  {
    key        : 'upcoming_trip_reminder',
    smsKey     : 'upcoming_trip_reminder_sms',
    whatsappKey: 'upcoming_trip_reminder_whatsapp',
    label      : 'Upcoming Trip Reminder',
    description: 'Hourly check sends a friendly 7-day pre-departure reminder with packing tips.',
    icon       : Clock,
    color      : 'text-cyan-600',
    bg         : 'bg-cyan-50 dark:bg-cyan-900/20',
    trigger    : 'Scheduled (hourly)',
    types      : ['upcoming_reminder', 'upcoming_reminder_sms', 'upcoming_reminder_whatsapp'],
    check      : 'upcoming',
  },
  {
    key        : 'quote_auto',
    label      : 'Quote Auto-Send',
    description: 'Automatically email the quote to the client when its status is changed to "Sent".',
    icon       : FileCheck,
    color      : 'text-orange-600',
    bg         : 'bg-orange-50 dark:bg-orange-900/20',
    trigger    : 'Event-based',
    types      : ['quote_sent'],
  },
  {
    key        : 'overdue_reminder',
    smsKey     : 'overdue_reminder_sms',
    label      : 'Overdue Invoice Reminder',
    description: 'Every hour the system checks for invoices past their due date and sends a reminder. Invoices are also automatically marked as "Overdue".',
    icon       : AlertTriangle,
    color      : 'text-red-600',
    bg         : 'bg-red-50 dark:bg-red-900/20',
    trigger    : 'Scheduled (hourly)',
    types      : ['overdue_reminder', 'overdue_reminder_sms'],
    check      : 'overdue',
  },
  {
    key        : 'quote_expiry_check',
    label      : 'Quote Expiry Check',
    description: 'Automatically marks quotes as "Expired" when their validity date passes. Runs every hour.',
    icon       : CalendarX,
    color      : 'text-yellow-600',
    bg         : 'bg-yellow-50 dark:bg-yellow-900/20',
    trigger    : 'Scheduled (hourly)',
    types      : ['quote_expired'],
    check      : 'expiry',
  },
  {
    key        : 'weekly_report',
    label      : 'Weekly Admin Report',
    description: 'Sends a weekly summary email to all admin users every Monday, showing new bookings, payments, and revenue for the past week.',
    icon       : BarChart3,
    color      : 'text-indigo-600',
    bg         : 'bg-indigo-50 dark:bg-indigo-900/20',
    trigger    : 'Scheduled (weekly)',
    types      : ['weekly_report'],
    check      : 'weekly',
  },
];

const TYPE_LABELS = {
  booking_created            : 'Booking Created (email)',
  booking_confirmed          : 'Booking Confirmed (email)',
  booking_received_sms       : 'Booking Received (SMS)',
  booking_confirmed_sms      : 'Booking Confirmed (SMS)',
  booking_received_whatsapp  : 'Booking Received (WhatsApp)',
  booking_confirmed_whatsapp : 'Booking Confirmed (WhatsApp)',
  booking_cancelled          : 'Booking Cancelled (email)',
  invoice_sent               : 'Invoice Sent',
  payment_receipt            : 'Payment Receipt (email)',
  payment_receipt_sms        : 'Payment Receipt (SMS)',
  payment_receipt_whatsapp   : 'Payment Receipt (WhatsApp)',
  quote_sent                 : 'Quote Sent',
  overdue_reminder           : 'Overdue Reminder (email)',
  overdue_reminder_sms       : 'Overdue Reminder (SMS)',
  quote_expired              : 'Quote Expired',
  upcoming_reminder          : 'Upcoming Trip (email)',
  upcoming_reminder_sms      : 'Upcoming Trip (SMS)',
  upcoming_reminder_whatsapp : 'Upcoming Trip (WhatsApp)',
  weekly_report              : 'Weekly Report',
};

const STATUS_STYLES = {
  sent  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  skipped: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function Automations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [runningCheck, setRunningCheck] = useState(null);
  const [logFilter, setLogFilter] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: config = {}, isLoading: configLoading } = useQuery({
    queryKey: ['automation-config'],
    queryFn : () => apiFetch('/api/automations/config'),
  });

  const { data: stats = {} } = useQuery({
    queryKey: ['automation-stats'],
    queryFn : () => apiFetch('/api/automations/stats'),
    refetchInterval: 30000,
  });

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['automation-logs', logFilter],
    queryFn : () => apiFetch(`/api/automations/logs?limit=100${logFilter ? `&type=${logFilter}` : ''}`),
    refetchInterval: 20000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (patch) => apiFetch('/api/automations/config', { method: 'POST', body: patch }),
    onSuccess : () => {
      queryClient.invalidateQueries({ queryKey: ['automation-config'] });
      toast({ title: 'Settings saved' });
    },
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
  });

  const toggleRule = (key) => {
    saveMutation.mutate({ [key]: !config[key] });
  };

  const runCheck = async (check, label) => {
    setRunningCheck(check);
    try {
      const res = await apiFetch('/api/automations/run-check', { method: 'POST', body: { check } });
      if (res.error) throw new Error(res.error);
      toast({ title: `✅ ${label} completed`, description: res.actioned !== undefined ? `${res.actioned} items actioned` : `${res.sent ?? 0} emails sent` });
      queryClient.invalidateQueries({ queryKey: ['automation-logs'] });
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] });
    } catch (err) {
      toast({ title: 'Run failed', description: err.message, variant: 'destructive' });
    } finally {
      setRunningCheck(null);
    }
  };

  const filteredLogs = logFilter ? logs.filter(l => l.type === logFilter) : logs;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Automations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure automatic email triggers and scheduled tasks for your safari operations
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sent today',    value: stats.today_sent ?? '—', color: 'text-green-600' },
          { label: 'Sent this week',value: stats.week_sent  ?? '—', color: 'text-blue-600'  },
          { label: 'Total sent',    value: stats.sent       ?? '—', color: 'text-foreground' },
          { label: 'Failed',        value: stats.failed     ?? '—', color: 'text-red-600'   },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="logs">Activity Log</TabsTrigger>
        </TabsList>

        {/* ── RULES TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="mt-5 space-y-3">
          {configLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            RULES.map(rule => {
              const Icon = rule.icon;
              const emailOn = !!config[rule.key];
              const smsOn      = rule.smsKey      ? !!config[rule.smsKey]      : null;
              const whatsappOn = rule.whatsappKey ? !!config[rule.whatsappKey] : null;
              const anyOn = emailOn || smsOn || whatsappOn;
              // Get last activity for this rule
              const lastLog = logs.find(l => rule.types.includes(l.type));

              const ChannelToggle = ({ icon: ChIcon, label, enabled, ruleKey, available = true }) => (
                <div className={`flex items-center gap-2 px-2 py-1 rounded-md border ${enabled ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'} ${!available ? 'opacity-40' : ''}`}>
                  <ChIcon className={`w-3.5 h-3.5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-[11px] font-medium">{label}</span>
                  <button
                    onClick={() => available && toggleRule(ruleKey)}
                    disabled={saveMutation.isPending || !available}
                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                      enabled ? 'bg-primary' : 'bg-input'
                    } ${!available ? 'cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              );

              return (
                <div
                  key={rule.key}
                  className={`border border-border rounded-xl p-5 transition-all ${anyOn ? 'bg-card' : 'bg-muted/30 opacity-70'}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${rule.bg}`}>
                      <Icon className={`w-5 h-5 ${rule.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{rule.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {rule.description}
                      </p>

                      {/* Channel toggles */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <ChannelToggle icon={Mail} label="Email" enabled={emailOn} ruleKey={rule.key} />
                        {rule.smsKey      && <ChannelToggle icon={Phone} label="SMS" enabled={smsOn} ruleKey={rule.smsKey} />}
                        {rule.whatsappKey && <ChannelToggle icon={MessageSquare} label="WhatsApp" enabled={whatsappOn} ruleKey={rule.whatsappKey} />}
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <span className="text-[11px] text-muted-foreground bg-secondary rounded px-2 py-0.5">
                          {rule.trigger}
                        </span>
                        {lastLog && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last: {formatDate(lastLog.created_date)}
                            <span className={`ml-1 rounded px-1.5 py-0.5 ${STATUS_STYLES[lastLog.status] || ''}`}>
                              {lastLog.status}
                            </span>
                          </span>
                        )}

                        {/* Manual run button for scheduled tasks */}
                        {rule.check && anyOn && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] px-2 gap-1"
                            onClick={() => runCheck(rule.check, rule.label)}
                            disabled={!!runningCheck}
                          >
                            {runningCheck === rule.check ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            Run now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Setup reminder */}
          <div className="rounded-xl border border-dashed border-border p-4 flex items-start gap-3 mt-4">
            <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Channels must be configured before they can send</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <Link to="/settings" className="underline text-primary">Settings → Email / SMTP</Link> for email,{' '}
                <Link to="/settings" className="underline text-primary">Settings → SMS / WhatsApp</Link> for SMS &amp; WhatsApp. Toggles above are silently skipped when their channel isn't configured.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── ACTIVITY LOG TAB ─────────────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-5">
          {/* Filter + refresh */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLogFilter('')}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${!logFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
              >
                All
              </button>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setLogFilter(logFilter === k ? '' : k)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${logFilter === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => refetchLogs()} className="gap-1.5 shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          {logsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No automation activity yet.</p>
              <p className="text-xs mt-1">Enable rules above — actions will be logged here automatically.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 bg-card border border-border rounded-lg px-4 py-3 text-sm"
                >
                  {/* Status icon */}
                  <div className="shrink-0 mt-0.5">
                    {log.status === 'sent' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs">
                        {TYPE_LABELS[log.type] || log.type}
                      </span>
                      {log.entity_ref && (
                        <span className="text-xs text-muted-foreground font-mono bg-secondary rounded px-1.5 py-0.5">
                          {log.entity_ref}
                        </span>
                      )}
                      <span className={`text-[11px] rounded px-1.5 py-0.5 ${STATUS_STYLES[log.status] || ''}`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.message}</p>
                    {log.recipient_email && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {log.recipient_email}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                    {log.created_date
                      ? new Date(log.created_date).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
