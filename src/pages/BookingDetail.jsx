import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, Receipt, CreditCard, Ticket, Plane,
  ClipboardList, Download, Eye, Send, Trash2, RefreshCw, Plus,
  MoreHorizontal, CheckCircle, AlertCircle, AlertTriangle, QrCode, ScanLine,
} from 'lucide-react';
import AdvancedItineraryEditor from '@/components/AdvancedItineraryEditor';
import { downloadQuotePDF } from '@/lib/generateQuotePDF';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate, generateRef } from '@/lib/helpers';

export default function BookingDetail() {
  const id = window.location.pathname.split('/').pop();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewDoc, setViewDoc] = useState(null);         // { type, doc }
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [showFlightForm, setShowFlightForm]   = useState(false);
  const [showManifestForm, setShowManifestForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [voucherData, setVoucherData] = useState({ meal_plan: 'FB', status: 'draft' });
  const [flightData, setFlightData]   = useState({ status: 'confirmed' });
  const [manifestData, setManifestData] = useState({ status: 'draft' });
  const [paymentData, setPaymentData] = useState({ method: 'bank_transfer', status: 'confirmed' });
  const [sendingEmail, setSendingEmail] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: booking } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => { const list = await base44.entities.Booking.filter({ id }); return list[0] ?? null; },
    enabled: !!id,
  });
  const { data: quotes    = [] } = useQuery({ queryKey: ['booking-quotes',    id], queryFn: () => base44.entities.Quote.filter({ booking_id: id }),       enabled: !!id });
  const { data: invoices  = [] } = useQuery({ queryKey: ['booking-invoices',  id], queryFn: () => base44.entities.Invoice.filter({ booking_id: id }),     enabled: !!id });
  const { data: payments  = [] } = useQuery({ queryKey: ['booking-payments',  id], queryFn: () => base44.entities.Payment.filter({ booking_id: id }),     enabled: !!id });
  const { data: vouchers  = [] } = useQuery({ queryKey: ['booking-vouchers',  id], queryFn: () => base44.entities.Voucher.filter({ booking_id: id }),     enabled: !!id });
  const { data: flights   = [] } = useQuery({ queryKey: ['booking-flights',   id], queryFn: () => base44.entities.FlightTicket.filter({ booking_id: id }),enabled: !!id });
  const { data: manifests = [] } = useQuery({ queryKey: ['booking-manifests', id], queryFn: () => base44.entities.Manifest.filter({ booking_id: id }),    enabled: !!id });

  const { data: packageData } = useQuery({
    queryKey: ['package', booking?.package_id],
    queryFn: async () => { const list = await base44.entities.Package.filter({ id: booking.package_id }); return list[0] ?? null; },
    enabled: !!booking?.package_id,
  });

  const inv$ = (key) => { queryClient.invalidateQueries({ queryKey: [key, id] }); };

  // ── Status update ──────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: (status) => base44.entities.Booking.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking', id] }),
  });

  // ── Generate Quote ──────────────────────────────────────────────────────────
  const createQuote = useMutation({
    mutationFn: async () => {
      let itineraryDays = [];
      try { if (booking.custom_itinerary) { const p = JSON.parse(booking.custom_itinerary); if (Array.isArray(p) && p.length > 0) itineraryDays = p; } } catch {}
      if (itineraryDays.length === 0 && packageData?.itinerary_days) {
        const raw = packageData.itinerary_days;
        itineraryDays = Array.isArray(raw) ? raw : JSON.parse(raw);
      }
      return base44.entities.Quote.create({
        quote_number: generateRef('QT'),
        booking_id: id, booking_ref: booking.booking_ref,
        client_id: booking.client_id, client_name: booking.client_name, client_email: booking.client_email,
        highlights: booking.package_name, package_name: booking.package_name,
        start_date: booking.start_date, end_date: booking.end_date, num_guests: booking.num_guests,
        items: JSON.stringify([{ description: booking.package_name, qty: booking.num_guests, unit_price: (booking.total_amount||0) / (booking.num_guests||1), total: booking.total_amount||0 }]),
        subtotal: booking.total_amount||0, total: booking.total_amount||0,
        valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        itinerary_days: JSON.stringify(itineraryDays),
        inclusions: packageData?.includes || '', exclusions: packageData?.excludes || '',
        status: 'draft',
      });
    },
    onSuccess: () => { inv$('booking-quotes'); updateStatus.mutate('quoted'); toast({ title: 'Quote generated!' }); },
  });

  // ── Generate Invoice ───────────────────────────────────────────────────────
  const createInvoice = useMutation({
    mutationFn: () => base44.entities.Invoice.create({
      invoice_number: generateRef('INV'),
      booking_id: id, booking_ref: booking.booking_ref,
      client_id: booking.client_id, client_name: booking.client_name, client_email: booking.client_email,
      items: JSON.stringify([{ description: booking.package_name, qty: booking.num_guests, unit_price: (booking.total_amount||0)/(booking.num_guests||1), total: booking.total_amount||0 }]),
      subtotal: booking.total_amount||0, total: booking.total_amount||0,
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'draft',
    }),
    onSuccess: () => { inv$('booking-invoices'); toast({ title: 'Invoice generated!' }); },
  });

  // ── Create Voucher ─────────────────────────────────────────────────────────
  const createVoucher = useMutation({
    mutationFn: () => base44.entities.Voucher.create({
      ...voucherData,
      voucher_number: generateRef('VCH'),
      booking_id: id, booking_ref: booking.booking_ref,
      client_name: booking.client_name, package_name: booking.package_name,
      num_guests: booking.num_guests,
      check_in: voucherData.check_in || booking.start_date,
      check_out: voucherData.check_out || booking.end_date,
    }),
    onSuccess: () => { inv$('booking-vouchers'); setShowVoucherForm(false); setVoucherData({ meal_plan:'FB', status:'draft' }); toast({ title: 'Voucher created!' }); },
  });

  // ── Create Flight ──────────────────────────────────────────────────────────
  const createFlight = useMutation({
    mutationFn: () => base44.entities.FlightTicket.create({
      ...flightData,
      ticket_number: generateRef('FLT'),
      booking_id: id, booking_ref: booking.booking_ref,
      client_id: booking.client_id, client_name: booking.client_name,
    }),
    onSuccess: () => { inv$('booking-flights'); setShowFlightForm(false); setFlightData({ status:'confirmed' }); toast({ title: 'Flight added!' }); },
  });

  // ── Create Manifest ────────────────────────────────────────────────────────
  const createManifest = useMutation({
    mutationFn: () => base44.entities.Manifest.create({
      ...manifestData,
      manifest_number: generateRef('MNF'),
      booking_id: id, booking_ref: booking.booking_ref,
      num_passengers: booking.num_guests,
    }),
    onSuccess: () => { inv$('booking-manifests'); setShowManifestForm(false); setManifestData({ status:'draft' }); toast({ title: 'Manifest created!' }); },
  });

  // ── Record Payment ─────────────────────────────────────────────────────────
  const createPayment = useMutation({
    mutationFn: async () => {
      const inv = invoices[0];
      const payment = await base44.entities.Payment.create({
        ...paymentData,
        payment_ref: generateRef('PAY'),
        booking_id: id, booking_ref: booking.booking_ref,
        client_id: booking.client_id, client_name: booking.client_name, client_email: booking.client_email,
        invoice_number: inv?.invoice_number, invoice_id: inv?.id,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      });
      if (inv) {
        const newPaid = (inv.amount_paid || 0) + parseFloat(paymentData.amount || 0);
        const newStatus = newPaid >= inv.total ? 'paid' : 'partially_paid';
        await base44.entities.Invoice.update(inv.id, { amount_paid: newPaid, status: newStatus });
      }
      return payment;
    },
    onSuccess: () => { inv$('booking-payments'); inv$('booking-invoices'); setShowPaymentForm(false); setPaymentData({ method:'bank_transfer', status:'confirmed' }); toast({ title: 'Payment recorded!' }); },
  });

  // ── Delete helpers ─────────────────────────────────────────────────────────
  const deleteDoc = async (entity, docId, queryKey) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(docId);
    try {
      await base44.entities[entity].delete(docId);
      inv$(queryKey);
      toast({ title: 'Deleted successfully' });
    } catch { toast({ title: 'Delete failed', variant: 'destructive' }); }
    finally { setDeletingId(null); }
  };

  // ── Update doc status ──────────────────────────────────────────────────────
  const updateDocStatus = async (entity, docId, status, queryKey) => {
    await base44.entities[entity].update(docId, { status });
    inv$(queryKey);
  };

  // ── Send Email helpers ─────────────────────────────────────────────────────
  const token = () => localStorage.getItem('rs_auth_token');

  const sendQuoteEmail = async (q) => {
    if (!q.client_email) { toast({ title: 'No client email', variant: 'destructive' }); return; }
    setSendingEmail(q.id);
    try {
      const res = await fetch('/api/email/send-quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          quote_number: q.quote_number, client_name: q.client_name, client_email: q.client_email,
          total: q.total, subtotal: q.subtotal, discount: q.discount, tax: q.tax,
          valid_until: q.valid_until, created_date: q.created_date,
          package_name: q.package_name, highlights: q.highlights,
          start_date: q.start_date, end_date: q.end_date, num_guests: q.num_guests,
          inclusions: q.inclusions, exclusions: q.exclusions,
          itinerary_days: q.itinerary_days, items: q.items,
          payment_terms: q.payment_terms,
          company_about: q.company_about, company_contact: q.company_contact,
          cover_image_url: q.cover_image_url, map_image_url: q.map_image_url,
          notes: q.notes, currency: q.currency || 'USD',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'Quote emailed!', description: `Sent to ${q.client_email}` });
      await base44.entities.Quote.update(q.id, { status: 'sent' });
      inv$('booking-quotes');
    } catch (err) { toast({ title: 'Send failed', description: err.message, variant: 'destructive' }); }
    finally { setSendingEmail(null); }
  };

  const sendInvoiceEmail = async (inv) => {
    if (!inv.client_email) { toast({ title: 'No client email', variant: 'destructive' }); return; }
    setSendingEmail(inv.id);
    try {
      let parsedItems = []; try { parsedItems = inv.items ? JSON.parse(inv.items) : []; } catch {}
      const res = await fetch('/api/email/send-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ invoice_number: inv.invoice_number, client_name: inv.client_name, client_email: inv.client_email, total: inv.total, amount_paid: inv.amount_paid||0, due_date: inv.due_date, booking_ref: inv.booking_ref, notes: inv.notes, items: parsedItems, currency: inv.currency||'USD' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'Invoice emailed!', description: `Sent to ${inv.client_email}` });
      await base44.entities.Invoice.update(inv.id, { status: 'sent' });
      inv$('booking-invoices');
    } catch (err) { toast({ title: 'Send failed', description: err.message, variant: 'destructive' }); }
    finally { setSendingEmail(null); }
  };

  const sendReceiptEmail = async (p) => {
    const clientEmail = p.client_email || invoices[0]?.client_email;
    if (!clientEmail) { toast({ title: 'No client email', variant: 'destructive' }); return; }
    setSendingEmail(p.id);
    try {
      const res = await fetch('/api/email/send-payment-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ payment_ref: p.payment_ref, client_name: p.client_name, client_email: clientEmail, amount: p.amount, currency: p.currency||'USD', payment_date: p.payment_date, method: p.method, invoice_number: p.invoice_number, booking_ref: p.booking_ref, notes: p.notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'Receipt emailed!', description: `Sent to ${clientEmail}` });
    } catch (err) { toast({ title: 'Send failed', description: err.message, variant: 'destructive' }); }
    finally { setSendingEmail(null); }
  };

  const sendConfirmationEmail = async () => {
    if (!booking.client_email) { toast({ title: 'No client email', variant: 'destructive' }); return; }
    setSendingEmail('booking');
    try {
      const res = await fetch('/api/email/send-booking-confirmation', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ booking_ref: booking.booking_ref, client_name: booking.client_name, client_email: booking.client_email, package_name: booking.package_name, start_date: booking.start_date, end_date: booking.end_date, num_guests: booking.num_guests, total_amount: booking.total_amount, currency: booking.currency||'USD', amount_paid: booking.amount_paid||0, booking_source: booking.booking_source, special_requests: booking.special_requests }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'Confirmation emailed!', description: `Sent to ${booking.client_email}` });
    } catch (err) { toast({ title: 'Send failed', description: err.message, variant: 'destructive' }); }
    finally { setSendingEmail(null); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!booking) return (
    <div className="p-8 flex items-center justify-center h-96">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount||0), 0);
  const balance   = (booking.total_amount||0) - totalPaid;

  // ── Shared action button row ───────────────────────────────────────────────
  const ActionBtn = ({ icon: Icon, label, onClick, disabled, variant = 'ghost', className = '' }) => (
    <Button variant={variant} size="sm" onClick={onClick} disabled={disabled} title={label}
      className={`h-7 w-7 p-0 ${className}`}>
      <Icon className="w-3.5 h-3.5" />
    </Button>
  );

  return (
    <div className="p-6 max-w-5xl">
      {/* Back */}
      <Link to="/bookings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Bookings
      </Link>

      {/* ── Booking Header Card ── */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-xl font-bold">{booking.booking_ref}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link to={`/clients/${booking.client_id}`} className="hover:text-foreground font-medium transition-colors">{booking.client_name}</Link>
              {' · '}{booking.package_name}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(booking.start_date)} — {formatDate(booking.end_date)} · {booking.num_guests} guest{booking.num_guests !== 1 ? 's' : ''}
            </p>
            {booking.client_email && <p className="text-xs text-muted-foreground mt-0.5">{booking.client_email}</p>}
            {booking.special_requests && <p className="text-sm text-muted-foreground mt-2 italic">"{booking.special_requests}"</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold">{formatCurrency(booking.total_amount)}</p>
            <p className="text-sm text-green-600 font-medium">Paid: {formatCurrency(totalPaid)}</p>
            {balance > 0 && <p className="text-sm text-red-600 font-medium">Balance: {formatCurrency(balance)}</p>}
            {balance <= 0 && totalPaid > 0 && <p className="text-sm text-green-600 font-medium flex items-center justify-end gap-1"><CheckCircle className="w-3.5 h-3.5" />Fully Paid</p>}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-border">
          <Select value={booking.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-38 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={() => createQuote.mutate()} disabled={createQuote.isPending} className="h-8 gap-1.5">
            <FileText className="w-3.5 h-3.5" /> New Quote
          </Button>
          <Button variant="outline" size="sm" onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending} className="h-8 gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> New Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(true)} className="h-8 gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Record Payment
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={sendConfirmationEmail} disabled={sendingEmail === 'booking'} className="h-8 gap-1.5">
            <Send className="w-3.5 h-3.5" /> Email Confirmation
          </Button>
        </div>
      </div>

      {/* ── Itinerary Editor ── */}
      <div className="mb-5">
        {booking.package_id && packageData === null && (
          <div className="mb-3 flex items-center gap-2 text-xs rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>The source package has been removed. Itinerary is still editable, but package defaults are no longer available.</span>
          </div>
        )}
        <AdvancedItineraryEditor booking={booking} packageData={packageData} />
      </div>

      {/* ── Check-in QR + Scan Trail ── */}
      <CheckInQrPanel bookingId={booking.id} />


      {/* ── Documents Grid ── */}
      <div className="space-y-4">

        {/* QUOTES */}
        <DocSection
          title="Quotes" icon={FileText} count={quotes.length}
          onAdd={() => createQuote.mutate()} addLabel="New Quote" addDisabled={createQuote.isPending}
        >
          {quotes.length === 0 && <EmptyRow message="No quotes yet — click New Quote to generate one" />}
          {quotes.map(q => (
            <DocRow key={q.id}>
              <div className="min-w-0">
                <p className="text-sm font-semibold font-mono">{q.quote_number}</p>
                <p className="text-xs text-muted-foreground">Valid until {formatDate(q.valid_until)} · {formatCurrency(q.total)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select value={q.status} onValueChange={(v) => updateDocStatus('Quote', q.id, v, 'booking-quotes')}>
                  <SelectTrigger className="h-6 w-24 text-xs px-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <ActionBtn icon={Eye}      label="View"     onClick={() => setViewDoc({ type:'quote',   doc:q })} />
                <ActionBtn icon={Download} label="Download PDF" onClick={() => downloadQuotePDF(q)} />
                <ActionBtn icon={Send}     label={`Email to ${q.client_email||'(no email)'}`} disabled={sendingEmail===q.id} onClick={() => sendQuoteEmail(q)} className="text-blue-600" />
                <ActionBtn icon={RefreshCw} label="Regenerate (new copy)" onClick={() => createQuote.mutate()} />
                <ActionBtn icon={Trash2}  label="Delete" disabled={deletingId===q.id} onClick={() => deleteDoc('Quote', q.id, 'booking-quotes')} className="text-destructive hover:text-destructive" />
              </div>
            </DocRow>
          ))}
        </DocSection>

        {/* INVOICES */}
        <DocSection
          title="Invoices" icon={Receipt} count={invoices.length}
          onAdd={() => createInvoice.mutate()} addLabel="New Invoice" addDisabled={createInvoice.isPending}
        >
          {invoices.length === 0 && <EmptyRow message="No invoices yet — click New Invoice to generate one" />}
          {invoices.map(inv => (
            <DocRow key={inv.id}>
              <div className="min-w-0">
                <p className="text-sm font-semibold font-mono">{inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground">
                  Due {formatDate(inv.due_date)} · Total {formatCurrency(inv.total)}
                  {inv.amount_paid > 0 && ` · Paid ${formatCurrency(inv.amount_paid)}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select value={inv.status} onValueChange={(v) => updateDocStatus('Invoice', inv.id, v, 'booking-invoices')}>
                  <SelectTrigger className="h-6 w-28 text-xs px-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="partially_paid">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <ActionBtn icon={Eye}      label="View"      onClick={() => setViewDoc({ type:'invoice', doc:inv })} />
                <ActionBtn icon={Send}     label={`Email to ${inv.client_email||'(no email)'}`} disabled={sendingEmail===inv.id} onClick={() => sendInvoiceEmail(inv)} className="text-blue-600" />
                <ActionBtn icon={Trash2}  label="Delete" disabled={deletingId===inv.id} onClick={() => deleteDoc('Invoice', inv.id, 'booking-invoices')} className="text-destructive hover:text-destructive" />
              </div>
            </DocRow>
          ))}
        </DocSection>

        {/* PAYMENTS */}
        <DocSection
          title="Payments" icon={CreditCard} count={payments.length}
          onAdd={() => setShowPaymentForm(true)} addLabel="Record Payment"
        >
          {payments.length === 0 && <EmptyRow message="No payments recorded yet" />}
          {payments.map(p => (
            <DocRow key={p.id}>
              <div className="min-w-0">
                <p className="text-sm font-semibold font-mono">{p.payment_ref}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {formatCurrency(p.amount)} · {(p.method||'').replace('_',' ')} · {formatDate(p.payment_date)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StatusBadge status={p.status} />
                <ActionBtn icon={Send}   label="Email Receipt" disabled={sendingEmail===p.id} onClick={() => sendReceiptEmail(p)} className="text-blue-600" />
                <ActionBtn icon={Trash2} label="Delete" disabled={deletingId===p.id} onClick={() => deleteDoc('Payment', p.id, 'booking-payments')} className="text-destructive hover:text-destructive" />
              </div>
            </DocRow>
          ))}
        </DocSection>

        {/* VOUCHERS */}
        <DocSection
          title="Vouchers" icon={Ticket} count={vouchers.length}
          onAdd={() => setShowVoucherForm(true)} addLabel="New Voucher"
        >
          {vouchers.length === 0 && <EmptyRow message="No vouchers yet" />}
          {vouchers.map(v => (
            <DocRow key={v.id}>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{v.hotel_name || v.voucher_number || 'Voucher'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(v.check_in)} — {formatDate(v.check_out)}
                  {v.room_type ? ` · ${v.room_type}` : ''}
                  {v.meal_plan ? ` · ${v.meal_plan}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select value={v.status} onValueChange={(val) => updateDocStatus('Voucher', v.id, val, 'booking-vouchers')}>
                  <SelectTrigger className="h-6 w-24 text-xs px-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <ActionBtn icon={Eye}    label="View"   onClick={() => setViewDoc({ type:'voucher', doc:v })} />
                <ActionBtn icon={Trash2} label="Delete" disabled={deletingId===v.id} onClick={() => deleteDoc('Voucher', v.id, 'booking-vouchers')} className="text-destructive hover:text-destructive" />
              </div>
            </DocRow>
          ))}
        </DocSection>

        {/* FLIGHTS */}
        <DocSection
          title="Flights" icon={Plane} count={flights.length}
          onAdd={() => setShowFlightForm(true)} addLabel="Add Flight"
        >
          {flights.length === 0 && <EmptyRow message="No flights added yet" />}
          {flights.map(f => (
            <DocRow key={f.id}>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{f.airline} {f.flight_number}</p>
                <p className="text-xs text-muted-foreground">
                  {f.departure_city} → {f.arrival_city} · {formatDate(f.departure_date)}
                  {f.departure_time ? ` ${f.departure_time}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select value={f.status} onValueChange={(val) => updateDocStatus('FlightTicket', f.id, val, 'booking-flights')}>
                  <SelectTrigger className="h-6 w-24 text-xs px-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <ActionBtn icon={Trash2} label="Delete" disabled={deletingId===f.id} onClick={() => deleteDoc('FlightTicket', f.id, 'booking-flights')} className="text-destructive hover:text-destructive" />
              </div>
            </DocRow>
          ))}
        </DocSection>

        {/* MANIFESTS */}
        <DocSection
          title="Manifests" icon={ClipboardList} count={manifests.length}
          onAdd={() => setShowManifestForm(true)} addLabel="New Manifest"
        >
          {manifests.length === 0 && <EmptyRow message="No manifests yet" />}
          {manifests.map(m => (
            <DocRow key={m.id}>
              <div className="min-w-0">
                <p className="text-sm font-semibold font-mono">{m.manifest_number || 'Manifest'}</p>
                <p className="text-xs text-muted-foreground">
                  {m.destination} · {formatDate(m.trip_date)} · {m.num_passengers} pax
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select value={m.status} onValueChange={(val) => updateDocStatus('Manifest', m.id, val, 'booking-manifests')}>
                  <SelectTrigger className="h-6 w-24 text-xs px-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <ActionBtn icon={Eye}    label="View"   onClick={() => setViewDoc({ type:'manifest', doc:m })} />
                <ActionBtn icon={Trash2} label="Delete" disabled={deletingId===m.id} onClick={() => deleteDoc('Manifest', m.id, 'booking-manifests')} className="text-destructive hover:text-destructive" />
              </div>
            </DocRow>
          ))}
        </DocSection>
      </div>

      {/* ── Document Viewer ── */}
      <DocumentViewer
        open={!!viewDoc}
        onClose={() => setViewDoc(null)}
        type={viewDoc?.type}
        document={viewDoc?.doc}
      />

      {/* ── Voucher Form ── */}
      <Dialog open={showVoucherForm} onOpenChange={setShowVoucherForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Voucher</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Hotel / Lodge</Label>
                <Input value={voucherData.hotel_name||''} onChange={e => setVoucherData(d=>({...d,hotel_name:e.target.value}))} placeholder="Serena Safari Lodge" /></div>
              <div className="space-y-1"><Label>Room Type</Label>
                <Input value={voucherData.room_type||''} onChange={e => setVoucherData(d=>({...d,room_type:e.target.value}))} placeholder="Deluxe / Standard" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Check-in</Label>
                <Input type="date" value={voucherData.check_in||booking.start_date||''} onChange={e => setVoucherData(d=>({...d,check_in:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Check-out</Label>
                <Input type="date" value={voucherData.check_out||booking.end_date||''} onChange={e => setVoucherData(d=>({...d,check_out:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Meal Plan</Label>
                <Select value={voucherData.meal_plan||'FB'} onValueChange={v => setVoucherData(d=>({...d,meal_plan:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FB">Full Board (FB)</SelectItem>
                    <SelectItem value="HB">Half Board (HB)</SelectItem>
                    <SelectItem value="BB">Bed & Breakfast</SelectItem>
                    <SelectItem value="AI">All Inclusive</SelectItem>
                    <SelectItem value="RO">Room Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Confirmation #</Label>
                <Input value={voucherData.confirmation_number||''} onChange={e => setVoucherData(d=>({...d,confirmation_number:e.target.value}))} placeholder="Hotel ref" /></div>
            </div>
            <div className="space-y-1"><Label>Special Instructions</Label>
              <Input value={voucherData.special_instructions||''} onChange={e => setVoucherData(d=>({...d,special_instructions:e.target.value}))} placeholder="Early check-in, dietary, etc." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowVoucherForm(false)}>Cancel</Button>
              <Button onClick={() => createVoucher.mutate()} disabled={createVoucher.isPending}>
                {createVoucher.isPending ? 'Creating…' : 'Create Voucher'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Flight Form ── */}
      <Dialog open={showFlightForm} onOpenChange={setShowFlightForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Flight</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Airline</Label>
                <Input value={flightData.airline||''} onChange={e => setFlightData(d=>({...d,airline:e.target.value}))} placeholder="Kenya Airways" /></div>
              <div className="space-y-1"><Label>Flight Number</Label>
                <Input value={flightData.flight_number||''} onChange={e => setFlightData(d=>({...d,flight_number:e.target.value}))} placeholder="KQ101" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>From</Label>
                <Input value={flightData.departure_city||''} onChange={e => setFlightData(d=>({...d,departure_city:e.target.value}))} placeholder="Nairobi (NBO)" /></div>
              <div className="space-y-1"><Label>To</Label>
                <Input value={flightData.arrival_city||''} onChange={e => setFlightData(d=>({...d,arrival_city:e.target.value}))} placeholder="Mombasa (MBA)" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Departure Date</Label>
                <Input type="date" value={flightData.departure_date||''} onChange={e => setFlightData(d=>({...d,departure_date:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Departure Time</Label>
                <Input type="time" value={flightData.departure_time||''} onChange={e => setFlightData(d=>({...d,departure_time:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Class</Label>
                <Select value={flightData.class_of_service||'economy'} onValueChange={v => setFlightData(d=>({...d,class_of_service:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>PNR / Ticket #</Label>
                <Input value={flightData.pnr||''} onChange={e => setFlightData(d=>({...d,pnr:e.target.value}))} placeholder="ABC123" /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label>
              <Input value={flightData.notes||''} onChange={e => setFlightData(d=>({...d,notes:e.target.value}))} placeholder="Baggage allowance, seat info..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowFlightForm(false)}>Cancel</Button>
              <Button onClick={() => createFlight.mutate()} disabled={createFlight.isPending}>
                {createFlight.isPending ? 'Adding…' : 'Add Flight'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Manifest Form ── */}
      <Dialog open={showManifestForm} onOpenChange={setShowManifestForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Manifest</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Destination</Label>
                <Input value={manifestData.destination||booking.package_name||''} onChange={e => setManifestData(d=>({...d,destination:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Trip Date</Label>
                <Input type="date" value={manifestData.trip_date||booking.start_date||''} onChange={e => setManifestData(d=>({...d,trip_date:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Vehicle / Registration</Label>
                <Input value={manifestData.vehicle||''} onChange={e => setManifestData(d=>({...d,vehicle:e.target.value}))} placeholder="KBZ 123A" /></div>
              <div className="space-y-1"><Label>Driver / Guide</Label>
                <Input value={manifestData.driver_guide||''} onChange={e => setManifestData(d=>({...d,driver_guide:e.target.value}))} /></div>
            </div>
            <div className="space-y-1"><Label>Emergency Contact</Label>
              <Input value={manifestData.emergency_contact||''} onChange={e => setManifestData(d=>({...d,emergency_contact:e.target.value}))} placeholder="+254 700 000 000" /></div>
            <div className="space-y-1"><Label>Notes</Label>
              <Input value={manifestData.notes||''} onChange={e => setManifestData(d=>({...d,notes:e.target.value}))} placeholder="Route, stops, special instructions..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowManifestForm(false)}>Cancel</Button>
              <Button onClick={() => createManifest.mutate()} disabled={createManifest.isPending}>
                {createManifest.isPending ? 'Creating…' : 'Create Manifest'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payment Form ── */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {invoices.length > 0 && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Invoice</p>
                <p className="font-medium">{invoices[0].invoice_number} · Balance {formatCurrency((invoices[0].total||0)-(invoices[0].amount_paid||0))}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Amount *</Label>
                <Input type="number" step="0.01" value={paymentData.amount||''} onChange={e => setPaymentData(d=>({...d,amount:e.target.value}))} placeholder="0.00" /></div>
              <div className="space-y-1"><Label>Date *</Label>
                <Input type="date" value={paymentData.payment_date||new Date().toISOString().split('T')[0]} onChange={e => setPaymentData(d=>({...d,payment_date:e.target.value}))} /></div>
            </div>
            <div className="space-y-1"><Label>Method</Label>
              <Select value={paymentData.method||'bank_transfer'} onValueChange={v => setPaymentData(d=>({...d,method:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Notes</Label>
              <Input value={paymentData.notes||''} onChange={e => setPaymentData(d=>({...d,notes:e.target.value}))} placeholder="Reference, bank name..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
              <Button onClick={() => createPayment.mutate()} disabled={createPayment.isPending || !paymentData.amount}>
                {createPayment.isPending ? 'Saving…' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper layout components ────────────────────────────────────────────────
function DocSection({ title, icon: Icon, count, onAdd, addLabel, addDisabled, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd} disabled={addDisabled} className="h-7 gap-1 text-xs">
          <Plus className="w-3 h-3" />{addLabel}
        </Button>
      </div>
      <div className="divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function DocRow({ children }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
      {children}
    </div>
  );
}

function EmptyRow({ message }) {
  return (
    <p className="px-5 py-4 text-xs text-muted-foreground text-center">{message}</p>
  );
}

const SCAN_LABELS = {
  pickup:        { label: 'Pickup',          dot: 'bg-blue-500' },
  park_entry:    { label: 'Park entry',      dot: 'bg-green-500' },
  lodge_checkin: { label: 'Lodge check-in',  dot: 'bg-amber-500' },
  dropoff:       { label: 'Drop-off',        dot: 'bg-purple-500' },
};

function CheckInQrPanel({ bookingId }) {
  const { data: qr } = useQuery({
    queryKey: ['booking-qr', bookingId],
    queryFn: async () => {
      const r = await fetch(`/api/bookings/${bookingId}/qr`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
      });
      if (!r.ok) throw new Error('Failed to load QR');
      return r.json();
    },
    enabled: !!bookingId,
  });

  const { data: scans = [] } = useQuery({
    queryKey: ['booking-scans', bookingId],
    queryFn: async () => {
      const r = await fetch(`/api/bookings/${bookingId}/scans`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
      });
      if (!r.ok) throw new Error('Failed to load scans');
      return r.json();
    },
    enabled: !!bookingId,
    refetchInterval: 30000,
  });

  return (
    <div className="mb-5 bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Check-in QR & Scan Trail</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{scans.length}</span>
        </div>
        <Link to="/scanner" className="text-xs text-primary hover:underline flex items-center gap-1">
          <ScanLine className="w-3 h-3" /> Open Scanner
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-5 p-5">
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          {qr?.qr_data_url ? (
            <img src={qr.qr_data_url} alt="Booking QR code" className="w-40 h-40 border border-border rounded-lg bg-white p-1.5" />
          ) : (
            <div className="w-40 h-40 flex items-center justify-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
              Generating…
            </div>
          )}
          <p className="text-[10px] text-muted-foreground font-mono">{qr?.booking_ref || ''}</p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-3">
            The driver scans at pickup, the guide scans at park entry and lodge check-in, and the driver scans again at drop-off. Every scan is timestamped.
          </p>
          {scans.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No scans yet.</p>
          ) : (
            <ol className="space-y-2">
              {scans.map(s => {
                const meta = SCAN_LABELS[s.scan_type] || { label: s.scan_type, dot: 'bg-gray-400' };
                return (
                  <li key={s.id} className="flex items-start gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${meta.dot}`} />
                    <div className="min-w-0">
                      <p className="font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_date).toLocaleString()} · by {s.scanned_by_name || s.scanned_by_email} ({s.scanned_by_role})
                      </p>
                      {s.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{s.notes}"</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
