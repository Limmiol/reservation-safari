import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  ScanLine, Camera, CameraOff, CheckCircle, AlertCircle, RefreshCw,
  MapPin, Users as UsersIcon, Calendar, QrCode, Radar, ArrowRight,
} from 'lucide-react';
import { formatDate } from '@/lib/helpers';
import { buildApiUrl } from '@/api/localClient';

const SCAN_TYPES = [
  { value: 'pickup',        label: 'Pickup',          sub: 'driver', roles: ['driver', 'admin'] },
  { value: 'park_entry',    label: 'Park entry',      sub: 'guide',  roles: ['guide', 'admin'] },
  { value: 'lodge_checkin', label: 'Lodge check-in',  sub: 'guide',  roles: ['guide', 'admin'] },
  { value: 'dropoff',       label: 'Drop-off',        sub: 'driver', roles: ['driver', 'admin'] },
];

const READER_ID = 'rs-qr-reader';

export default function Scanner() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [scanType, setScanType] = useState('pickup');
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [lookup, setLookup] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [manualToken, setManualToken] = useState('');

  const qrRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    return () => { stopScanner().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const token = () => localStorage.getItem('rs_auth_token');

  const startScanner = async () => {
    setCamError('');
    setLookup(null);
    try {
      const q = new Html5Qrcode(READER_ID, { verbose: false });
      qrRef.current = q;
      setScanning(true);
      await q.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => { await handleDecoded(decodedText); },
        () => { /* per-frame errors – ignore */ },
      );
    } catch (err) {
      setScanning(false);
      setCamError(err?.message || 'Could not start camera');
    }
  };

  const stopScanner = async () => {
    const q = qrRef.current;
    qrRef.current = null;
    setScanning(false);
    if (q) {
      try { await q.stop(); } catch {}
      try { await q.clear(); } catch {}
    }
  };

  const handleDecoded = async (text) => {
    let parsed;
    try { parsed = JSON.parse(text); } catch {
      setCamError('QR payload is not a Reservation Safari booking code.');
      return;
    }
    if (!parsed?.ref || !parsed?.t) {
      setCamError('QR missing ref/token.');
      return;
    }
    await stopScanner();
    await doLookup(parsed.ref, parsed.t);
  };

  const doLookup = async (ref, t) => {
    try {
      const r = await fetch(buildApiUrl('/api/bookings/scan-lookup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ref, token: t }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Lookup failed');
      setLookup({ ...data, _ref: ref, _token: t });
      setCamError('');
    } catch (err) {
      setCamError(err.message);
      setLookup(null);
    }
  };

  const manualLookup = async (e) => {
    e.preventDefault();
    if (!manualRef.trim() || !manualToken.trim()) return;
    await doLookup(manualRef.trim(), manualToken.trim());
  };

  const confirmScan = async () => {
    if (!lookup) return;
    setSubmitting(true);
    try {
      const r = await fetch(buildApiUrl('/api/bookings/scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          ref: lookup._ref, token: lookup._token,
          scan_type: scanType, notes: notes.trim(),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Scan failed');
      toast({
        title: 'Scan recorded',
        description: `${SCAN_TYPES.find(s => s.value === scanType)?.label} · ${data.booking?.client_name || data.booking?.ref}`,
      });
      setLookup(null);
      setNotes('');
      setManualRef('');
      setManualToken('');
    } catch (err) {
      toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const role = user?.role;
  if (user && !['admin', 'driver', 'guide'].includes(role)) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-semibold mb-1">Scanner is staff-only</h2>
        <p className="text-sm text-muted-foreground">
          Only drivers, guides, and admins can record check-in scans.
        </p>
      </div>
    );
  }

  const allowedTypes = SCAN_TYPES.filter(s => !role || s.roles.includes(role));
  const activeScanLabel = SCAN_TYPES.find(s => s.value === scanType)?.label || 'Scan';

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Ambient grid background */}
      <div className="absolute inset-0 rs-grid-dots opacity-40 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-72 rs-hero pointer-events-none" />

      <div className="relative p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* Terminal header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center rs-glow-primary">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Check-in Terminal</h1>
                <span className="rs-mono text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">v1</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Scan booking QR · pickup · park entry · lodge check-in · drop-off</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground rs-panel rs-panel-accent px-3 py-2">
            <span className={`rs-led ${scanning ? 'rs-led-live' : ''}`} />
            <span className="rs-mono uppercase tracking-[0.14em]">{scanning ? 'Live' : 'Idle'}</span>
            <span className="mx-1 text-border">|</span>
            <span className="rs-mono uppercase tracking-[0.14em]">{role || '—'}</span>
          </div>
        </div>

        {/* Scan-type selector: pill buttons */}
        <div className="rs-panel rs-panel-accent p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step</span>
            </div>
            <span className="text-[11px] rs-mono text-muted-foreground">→ {activeScanLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allowedTypes.map(s => {
              const active = s.value === scanType;
              return (
                <button
                  key={s.value}
                  onClick={() => setScanType(s.value)}
                  className={`relative text-left rounded-xl border p-3 transition-all duration-150 ${
                    active
                      ? 'border-primary/50 bg-primary/10 rs-glow-primary'
                      : 'border-border bg-card/60 hover:border-primary/30 hover:bg-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{s.label}</span>
                    {active && <span className="rs-led rs-led-live" />}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.12em] rs-mono text-muted-foreground">{s.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Camera viewport */}
        <div className="rs-panel rs-panel-accent p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Viewport</h3>
              <span className="rs-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
                {scanning ? '● recording' : '○ standby'}
              </span>
            </div>
            {scanning ? (
              <Button variant="outline" size="sm" onClick={stopScanner} className="gap-2">
                <CameraOff className="w-3.5 h-3.5" />Stop
              </Button>
            ) : (
              <Button size="sm" onClick={startScanner} className="gap-2 rs-glow-primary">
                <Camera className="w-3.5 h-3.5" />Start Scan
              </Button>
            )}
          </div>

          <div className={`rs-scan-frame ${scanning ? 'rs-scanning' : ''} rounded-xl min-h-[280px]`} style={{ '--rs-scan-h': '280px' }}>
            <div className="rs-corner rs-corner-bl" />
            <div className="rs-corner rs-corner-br" />
            <div className="rs-laser" />
            <div id={READER_ID} className="w-full min-h-[280px] flex items-center justify-center">
              {!scanning && !camError && (
                <div className="text-center space-y-1">
                  <QrCode className="w-10 h-10 mx-auto text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Press <span className="rs-mono">Start Scan</span> and point at the voucher QR.</p>
                </div>
              )}
            </div>
          </div>

          {camError && (
            <p className="text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {camError}
            </p>
          )}
        </div>

        {/* Manual entry */}
        {!lookup && (
          <details className="rs-panel p-5 group">
            <summary className="text-sm font-semibold cursor-pointer flex items-center gap-2 list-none">
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
              Enter booking manually
              <span className="rs-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em] ml-auto">fallback</span>
            </summary>
            <form onSubmit={manualLookup} className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs rs-mono uppercase tracking-[0.12em] text-muted-foreground">Booking Ref</Label>
                <Input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder="SF-XXXX"
                  className="rs-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs rs-mono uppercase tracking-[0.12em] text-muted-foreground">Scan Token</Label>
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="(from voucher)"
                  className="rs-mono"
                />
              </div>
              <div className="col-span-2">
                <Button type="submit" size="sm" disabled={!manualRef.trim() || !manualToken.trim()}>
                  Look up
                </Button>
              </div>
            </form>
          </details>
        )}

        {/* Lookup result */}
        {lookup && (
          <div className="rs-panel rs-panel-accent rs-pop-in p-5 space-y-5 border-primary/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Booking matched</h3>
                <p className="text-[11px] rs-mono uppercase tracking-[0.14em] text-muted-foreground">token verified</p>
              </div>
              <span className="rs-led rs-led-live" />
            </div>

            <div className="rounded-xl p-4 space-y-2 text-sm border border-border/60 bg-muted/30 rs-grid-dots">
              <p className="font-semibold text-base">{lookup.booking.client_name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="rs-mono text-primary">{lookup.booking.ref}</span>
                {lookup.booking.package_name && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lookup.booking.package_name}</span>
                )}
                {lookup.booking.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{formatDate(lookup.booking.start_date)} – {formatDate(lookup.booking.end_date)}
                  </span>
                )}
                {lookup.booking.num_guests && (
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-3 h-3" />{lookup.booking.num_guests} guest{lookup.booking.num_guests !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {lookup.scans?.length > 0 && (
              <div>
                <p className="text-[11px] rs-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Prior scans · {lookup.scans.length}
                </p>
                <ul className="space-y-1.5 text-xs">
                  {lookup.scans.map(s => (
                    <li key={s.id} className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                      <span className="font-medium text-foreground">{SCAN_TYPES.find(t => t.value === s.scan_type)?.label || s.scan_type}</span>
                      <span className="rs-mono">· {new Date(s.created_date).toLocaleString()}</span>
                      <span className="truncate">· {s.scanned_by_name || s.scanned_by_email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[11px] rs-mono uppercase tracking-[0.14em] text-muted-foreground">Notes (optional)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vehicle reg, unusual conditions, anything to flag…" />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setLookup(null); setNotes(''); }} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />Cancel
              </Button>
              <Button onClick={confirmScan} disabled={submitting} className="gap-2 rs-glow-primary">
                {submitting ? 'Recording…' : (<><CheckCircle className="w-3.5 h-3.5" />Confirm {activeScanLabel}</>)}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
