import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, FileText, Eye, Download, ArrowDownToLine, Trash2, RefreshCw, Upload, X as XIcon, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { downloadQuotePDF } from '@/lib/generateQuotePDF';
import { celebrate } from '@/lib/confetti';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import BookingInfoCard from '@/components/BookingInfoCard';
import { formatCurrency, formatDate, generateRef } from '@/lib/helpers';
import { safeJson } from '@/lib/safeJson';
import { buildApiUrl } from '@/api/localClient';

const RESET = { status: 'draft' };

export default function Quotes() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(RESET);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [quoteDefaults, setQuoteDefaults] = useState({});
  const [items, setItems] = useState([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [itineraryDays, setItineraryDays] = useState([]);
  const [uploadingDayImg, setUploadingDayImg] = useState({});
  const queryClient = useQueryClient();

  const normalizeActivities = (acts) => {
    if (!Array.isArray(acts)) return [{ title: '', image_url: '' }];
    return acts.map(a => typeof a === 'string' ? { title: a, image_url: '' } : { title: a.title || a.notes || '', image_url: a.image_url || '' });
  };

  const emptyDay = (n) => ({ day: n, title: '', location: '', accommodation: '', accommodation_image_url: '', activities: [{ title: '', image_url: '' }], meals: '', description: '' });

  const handleDayAccommodationImageUpload = async (dayIdx, file) => {
    if (!file) return;
    setUploadingDayImg(u => ({ ...u, [`acc_${dayIdx}`]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, accommodation_image_url: file_url } : d));
    } catch (err) { console.error('Accommodation image upload failed', err); }
    finally { setUploadingDayImg(u => ({ ...u, [`acc_${dayIdx}`]: false })); }
  };

  const handleActivityImageUpload = async (dayIdx, actIdx, file) => {
    if (!file) return;
    setUploadingDayImg(u => ({ ...u, [`act_${dayIdx}_${actIdx}`]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setItineraryDays(days => days.map((d, i) => {
        if (i !== dayIdx) return d;
        const acts = [...d.activities];
        acts[actIdx] = { ...acts[actIdx], image_url: file_url };
        return { ...d, activities: acts };
      }));
    } catch (err) { console.error('Activity image upload failed', err); }
    finally { setUploadingDayImg(u => ({ ...u, [`act_${dayIdx}_${actIdx}`]: false })); }
  };

  useEffect(() => {
    base44.auth.me().then(me => {
      if (me?.settings) {
        try {
          const saved = JSON.parse(me.settings);
          if (saved.quoteDefaults) {
            setQuoteDefaults(saved.quoteDefaults);
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const result = await base44.entities.Quote.list('-created_date', 200);
      console.log('Quotes fetched:', result);
      return result;
    },
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: () => {
      celebrate('stars');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setShowForm(false);
      setFormData(RESET);
      setSelectedBooking(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const handleGenerateAnother = (q) => {
    // Pre-fill form from an existing quote and open the dialog
    let parsedItems = [];
    try { parsedItems = JSON.parse(q.items || '[]'); } catch {}
    setItems(parsedItems.length ? parsedItems : [{ description: q.package_name || '', qty: 1, unit_price: q.total || 0, total: q.total || 0 }]);
    const booking = bookings.find(b => b.id === q.booking_id);
    setSelectedBooking(booking || null);
    let existingDays = [];
    try { const r = q.itinerary_days; existingDays = Array.isArray(r) ? r : JSON.parse(r || '[]'); } catch {}
    const reDays = existingDays.length > 0
      ? existingDays.map((d, i) => ({ ...emptyDay(i + 1), ...d, activities: normalizeActivities(d.activities) }))
      : [emptyDay(1)];
    setItineraryDays(reDays);
    setFormData({
      status: 'draft',
      booking_id: q.booking_id,
      booking_ref: q.booking_ref,
      client_id: q.client_id,
      client_name: q.client_name,
      client_email: q.client_email,
      items: q.items || '[]',
      subtotal: q.subtotal || 0,
      total: q.total || 0,
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      highlights: q.highlights || '',
      start_date: q.start_date,
      end_date: q.end_date,
      itinerary_days: q.itinerary_days || '[]',
      currency: q.currency || 'USD',
      payment_terms: q.payment_terms || '50/50',
      inclusions: q.inclusions || '',
      exclusions: q.exclusions || '',
      company_about: q.company_about || '',
      company_contact: q.company_contact || '',
      cover_image_url: q.cover_image_url || '',
      map_image_url: q.map_image_url || '',
    });
    setShowForm(true);
  };

  const handleBookingSelect = async (bookingId) => {
    const b = bookings.find(b => b.id === bookingId);
    setSelectedBooking(b || null);
    if (!b) return;
    const validityDays = quoteDefaults.validity_days || 14;
    const validUntil = new Date(Date.now() + validityDays * 86400000).toISOString().split('T')[0];

    // Resolve itinerary: booking custom itinerary → package itinerary_days
    let itineraryDays = [];
    try {
      if (b.custom_itinerary) {
        const parsed = JSON.parse(b.custom_itinerary);
        if (Array.isArray(parsed) && parsed.length > 0) itineraryDays = parsed;
      }
    } catch {}

    // Fetch package to get itinerary, includes, excludes, image
    let pkgInclusions = quoteDefaults.inclusions || '';
    let pkgExclusions = quoteDefaults.exclusions || '';
    let pkgImageUrl = '';
    if (b.package_id) {
      try {
        const pkgList = await base44.entities.Package.filter({ id: b.package_id });
        const pkg = pkgList[0];
        if (pkg) {
          if (itineraryDays.length === 0) {
            const rawDays = pkg.itinerary_days;
            if (rawDays) {
              const days = Array.isArray(rawDays) ? rawDays : JSON.parse(rawDays);
              if (Array.isArray(days) && days.length > 0) itineraryDays = days;
            }
          }
          if (pkg.includes && !pkgInclusions) pkgInclusions = pkg.includes;
          if (pkg.excludes && !pkgExclusions) pkgExclusions = pkg.excludes;
          if (pkg.image_url) pkgImageUrl = pkg.image_url;
        }
      } catch {}
    }

    const defaultItems = [{ description: b.package_name, qty: b.num_guests, unit_price: (b.total_amount || 0) / (b.num_guests || 1), total: b.total_amount || 0 }];
    setItems(defaultItems);

    const normalizedDays = itineraryDays.length > 0
      ? itineraryDays.map((d, i) => ({ ...emptyDay(i + 1), ...d, activities: normalizeActivities(d.activities) }))
      : [emptyDay(1)];
    setItineraryDays(normalizedDays);

    setFormData({
      status: 'draft',
      booking_id: b.id,
      booking_ref: b.booking_ref,
      client_id: b.client_id,
      client_name: b.client_name,
      client_email: b.client_email,
      items: JSON.stringify(defaultItems),
      subtotal: b.total_amount || 0,
      total: b.total_amount || 0,
      valid_until: validUntil,
      highlights: b.package_name,
      start_date: b.start_date,
      end_date: b.end_date,
      itinerary_days: JSON.stringify(normalizedDays),
      currency: 'USD',
      payment_terms: quoteDefaults.payment_terms || '50/50',
      inclusions: pkgInclusions,
      exclusions: pkgExclusions,
      company_about: quoteDefaults.company_about || '',
      company_contact: quoteDefaults.company_contact || '',
      cover_image_url: pkgImageUrl,
      map_image_url: '',
    });
  };

  const close = () => { setShowForm(false); setFormData(RESET); setSelectedBooking(null); setItems([]); setItineraryDays([]); setUploadingDayImg({}); };

  const [sendingEmail, setSendingEmail] = useState(null);
  const sendQuoteEmail = async (q) => {
    if (!q.client_email) { toast({ title: 'No client email', description: 'This quote has no client email address.', variant: 'destructive' }); return; }
    setSendingEmail(q.id);
    try {
      const res = await fetch(buildApiUrl('/api/email/send-quote'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
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
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast({ title: 'Quote sent!', description: `Emailed to ${q.client_email}` });
      updateMutation.mutate({ id: q.id, data: { status: 'sent' } });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(f => ({ ...f, cover_image_url: file_url }));
    } catch (err) { console.error('Cover upload failed', err); }
    finally { setUploadingCover(false); }
  };

  const handleMapUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMap(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(f => ({ ...f, map_image_url: file_url }));
    } catch (err) { console.error('Map upload failed', err); }
    finally { setUploadingMap(false); }
  };

  // downloadQuotePDF imported from @/lib/generateQuotePDF

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title={t('quotes')} description={t('manage_quotes')}>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />{t('new_quote_btn')}</Button>
      </PageHeader>

      {quotes.length === 0 ? (
        <EmptyState icon={FileText} title={t('no_quotes')} description={t('create_quote_from_booking')} actionLabel={t('new_quote_btn')} onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('quote_number')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('client')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('booking')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('valid_until')}</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">{t('total')}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{t('status')}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-mono">{q.quote_number}</td>
                  <td className="px-6 py-3.5 text-sm font-medium">{q.client_name}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{q.booking_ref}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(q.valid_until)}</td>
                  <td className="px-6 py-3.5 text-sm font-medium text-right">{formatCurrency(q.total)}</td>
                  <td className="px-6 py-3.5">
                    <Select value={q.status} onValueChange={(v) => updateMutation.mutate({ id: q.id, data: { status: v } })}>
                      <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{t('draft')}</SelectItem>
                        <SelectItem value="sent">{t('sent')}</SelectItem>
                        <SelectItem value="accepted">{t('accepted')}</SelectItem>
                        <SelectItem value="declined">{t('declined')}</SelectItem>
                        <SelectItem value="expired">{t('expired')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-3.5 flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewDoc(q)} title="View"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => downloadQuotePDF(q)} title="Download PDF"><Download className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => sendQuoteEmail(q)} disabled={sendingEmail === q.id} title={q.client_email ? `Email to ${q.client_email}` : 'No client email'} className="text-blue-600 hover:text-blue-700"><Send className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleGenerateAnother(q)} title="Generate Another Quote" className="text-primary hover:text-primary"><RefreshCw className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete this quote?')) deleteMutation.mutate(q.id); }} title="Delete Quote" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DocumentViewer open={!!viewDoc} onClose={() => setViewDoc(null)} type="quote" document={viewDoc} />

      <Dialog open={showForm} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('new_quote_btn')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
            const total = subtotal - (formData.discount || 0) + (formData.tax || 0);
            createMutation.mutate({
              ...formData,
              quote_number: generateRef('QT'),
              items: JSON.stringify(items),
              itinerary_days: JSON.stringify(itineraryDays),
              subtotal,
              total
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('booking')} *</Label>
              <Select value={formData.booking_id || ''} onValueChange={handleBookingSelect}>
                <SelectTrigger><SelectValue placeholder="Select booking — data fills automatically" /></SelectTrigger>
                <SelectContent>
                  {bookings.map(b => <SelectItem key={b.id} value={b.id}>{b.booking_ref} — {b.client_name} · {b.package_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedBooking && <BookingInfoCard booking={selectedBooking} />}

            {selectedBooking && (
              <>
                {/* Client & Trip Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('client_name_label')} *</Label>
                    <Input readOnly value={formData.client_name || ''} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('email')}</Label>
                    <Input readOnly value={formData.client_email || ''} className="bg-secondary text-xs" />
                  </div>
                </div>

                {/* Line Items */}
                <div className="border-t border-border pt-4">
                  <Label className="font-semibold mb-3 block">{t('new_quote_btn')} Items</Label>
                  <div className="space-y-3 bg-secondary/30 p-3 rounded-lg">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground mb-2">
                      <div>Description</div>
                      <div className="text-center">Qty</div>
                      <div className="text-right">Unit Price</div>
                      <div className="text-right">Total</div>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2">
                          <Input placeholder="Description" value={item.description || ''} onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].description = e.target.value;
                            setItems(newItems);
                          }} className="text-xs" />
                          <Input type="number" placeholder="Qty" value={item.qty || ''} onChange={(e) => {
                            const newItems = [...items];
                            const qty = parseFloat(e.target.value) || 0;
                            newItems[idx].qty = qty;
                            newItems[idx].total = qty * (newItems[idx].unit_price || 0);
                            setItems(newItems);
                          }} className="text-xs text-center" />
                          <Input type="number" placeholder="Price" value={item.unit_price || ''} onChange={(e) => {
                            const newItems = [...items];
                            const price = parseFloat(e.target.value) || 0;
                            newItems[idx].unit_price = price;
                            newItems[idx].total = (newItems[idx].qty || 0) * price;
                            setItems(newItems);
                          }} className="text-xs text-right" />
                          <Input type="number" placeholder="Total" value={item.total || ''} readOnly className="text-xs text-right bg-secondary" />
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: '', qty: 1, unit_price: 0, total: 0 }])} className="mt-2">
                        + Add Item
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="space-y-3 bg-accent/5 p-3 rounded-lg border border-accent/20">
                  <div className="flex justify-between text-sm">
                    <Label>{t('subtotal')}:</Label>
                    <span className="font-semibold">{formatCurrency(formData.subtotal || 0)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('discount')} (USD)</Label>
                      <Input type="number" min="0" step="0.01" value={formData.discount || ''} onChange={(e) => {
                        const disc = parseFloat(e.target.value) || 0;
                        const total = (formData.subtotal || 0) - disc + (formData.tax || 0);
                        setFormData(f => ({ ...f, discount: disc, total }));
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('tax')}/Service Fee (USD)</Label>
                      <Input type="number" min="0" step="0.01" value={formData.tax || ''} onChange={(e) => {
                        const tax = parseFloat(e.target.value) || 0;
                        const total = (formData.subtotal || 0) - (formData.discount || 0) + tax;
                        setFormData(f => ({ ...f, tax, total }));
                      }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-accent/30 pt-2">
                    <Label>{t('total')} (USD):</Label>
                    <span className="text-primary">{formatCurrency(formData.total || 0)}</span>
                  </div>
                </div>

                {/* Quote Terms */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('valid_until')} *</Label>
                    <Input type="date" required value={formData.valid_until || ''} onChange={(e) => setFormData(f => ({ ...f, valid_until: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('currency')}</Label>
                    <Select defaultValue="USD" onValueChange={(v) => setFormData(f => ({ ...f, currency: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="KES">KES (Ksh)</SelectItem>
                        <SelectItem value="TZS">TZS (TSh)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Terms & Notes */}
                <div className="space-y-2">
                  <Label>{t('payment_terms')} *</Label>
                  <Select value={formData.payment_terms || quoteDefaults.payment_terms || '50/50'} onValueChange={(v) => setFormData(f => ({ ...f, payment_terms: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50/50">50% Deposit, 50% Balance</SelectItem>
                      <SelectItem value="30/70">30% Deposit, 70% Balance</SelectItem>
                      <SelectItem value="full">Full Payment Upfront</SelectItem>
                      <SelectItem value="flexible">Flexible Payment Plan</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>

                  <div className="space-y-2">
                  <Label>{t('inclusions')}</Label>
                  <Input value={formData.inclusions || ''} onChange={(e) => setFormData(f => ({ ...f, inclusions: e.target.value }))} placeholder={quoteDefaults.inclusions || "e.g., Accommodation, meals, guide, park fees, transfers"} />
                  </div>

                  <div className="space-y-2">
                  <Label>{t('exclusions')}</Label>
                  <Input value={formData.exclusions || ''} onChange={(e) => setFormData(f => ({ ...f, exclusions: e.target.value }))} placeholder={quoteDefaults.exclusions || "e.g., International flights, travel insurance, personal expenses"} />
                  </div>

                  <div className="space-y-2">
                  <Label>Special Notes & Conditions</Label>
                  <Input value={formData.notes || ''} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Cancellation policy, visa requirements, health recommendations..." />
                  </div>

                {/* Itinerary */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="font-semibold">{t('itinerary')}</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setItineraryDays(d => [...d, emptyDay(d.length + 1)])}>+ Add Day</Button>
                      {itineraryDays.length > 1 && (
                        <Button type="button" variant="outline" size="sm" className="text-xs h-7 text-destructive" onClick={() => setItineraryDays(d => d.slice(0, -1))}>- Remove Day</Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Add destination, accommodation, activities, and images for each day</p>
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {itineraryDays.map((day, dayIdx) => (
                      <div key={dayIdx} className="bg-secondary/30 border border-border/60 p-3 rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm text-primary">Day {day.day || dayIdx + 1}</h4>

                        {/* Location & Title */}
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Location / Destination"
                            className="text-xs"
                            value={day.location || ''}
                            onChange={e => setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, location: e.target.value } : d))}
                          />
                          <Input
                            placeholder="Day title (optional)"
                            className="text-xs"
                            value={day.title || ''}
                            onChange={e => setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, title: e.target.value } : d))}
                          />
                        </div>

                        {/* Accommodation */}
                        <div className="space-y-1">
                          <Input
                            placeholder="Accommodation name & type"
                            className="text-xs"
                            value={day.accommodation || ''}
                            onChange={e => setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, accommodation: e.target.value } : d))}
                          />
                          {day.accommodation_image_url ? (
                            <div className="relative w-full h-24">
                              <img src={day.accommodation_image_url} alt="Accommodation" className="w-full h-24 object-cover rounded border border-border" />
                              <button type="button" onClick={() => setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, accommodation_image_url: '' } : d))} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 hover:bg-black">
                                <XIcon className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border/60 rounded p-2 text-xs text-muted-foreground hover:bg-secondary/50">
                              <Upload className="w-3 h-3 flex-shrink-0" />
                              <span>{uploadingDayImg[`acc_${dayIdx}`] ? 'Uploading...' : 'Upload accommodation photo'}</span>
                              <input type="file" accept="image/*" className="hidden" disabled={uploadingDayImg[`acc_${dayIdx}`]} onChange={e => handleDayAccommodationImageUpload(dayIdx, e.target.files[0])} />
                            </label>
                          )}
                        </div>

                        {/* Meals */}
                        <Input
                          placeholder="Meal plan (e.g., Breakfast, Lunch, Dinner)"
                          className="text-xs"
                          value={day.meals || ''}
                          onChange={e => setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, meals: e.target.value } : d))}
                        />

                        {/* Activities */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Activities</span>
                            <Button type="button" variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, activities: [...d.activities, { title: '', image_url: '' }] } : d))}>+ Add</Button>
                          </div>
                          {(day.activities || []).map((act, actIdx) => (
                            <div key={actIdx} className="space-y-1 bg-background/60 p-2 rounded border border-border/40">
                              <div className="flex gap-1 items-center">
                                <Input
                                  placeholder={`Activity ${actIdx + 1}`}
                                  className="text-xs flex-1"
                                  value={act.title || ''}
                                  onChange={e => setItineraryDays(days => days.map((d, i) => {
                                    if (i !== dayIdx) return d;
                                    const acts = [...d.activities];
                                    acts[actIdx] = { ...acts[actIdx], title: e.target.value };
                                    return { ...d, activities: acts };
                                  }))}
                                />
                                {day.activities.length > 1 && (
                                  <button type="button" onClick={() => setItineraryDays(days => days.map((d, i) => i === dayIdx ? { ...d, activities: d.activities.filter((_, ai) => ai !== actIdx) } : d))} className="text-destructive hover:text-destructive/80 p-1">
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {act.image_url ? (
                                <div className="relative w-full h-16">
                                  <img src={act.image_url} alt="Activity" className="w-full h-16 object-cover rounded border border-border" />
                                  <button type="button" onClick={() => setItineraryDays(days => days.map((d, i) => {
                                    if (i !== dayIdx) return d;
                                    const acts = [...d.activities];
                                    acts[actIdx] = { ...acts[actIdx], image_url: '' };
                                    return { ...d, activities: acts };
                                  }))} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 hover:bg-black">
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center gap-1.5 cursor-pointer border border-dashed border-border/50 rounded p-1.5 text-xs text-muted-foreground hover:bg-secondary/40">
                                  <Upload className="w-3 h-3 flex-shrink-0" />
                                  <span>{uploadingDayImg[`act_${dayIdx}_${actIdx}`] ? 'Uploading...' : 'Upload activity photo (optional)'}</span>
                                  <input type="file" accept="image/*" className="hidden" disabled={uploadingDayImg[`act_${dayIdx}_${actIdx}`]} onChange={e => handleActivityImageUpload(dayIdx, actIdx, e.target.files[0])} />
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image Uploads */}
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>{t('cover_image')}</Label>
                    {formData.cover_image_url ? (
                      <div className="relative">
                        <img src={formData.cover_image_url} alt="Cover" className="w-full h-32 object-cover rounded border border-border" />
                        <button type="button" onClick={() => setFormData(f => ({ ...f, cover_image_url: '' }))} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 hover:bg-black">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded p-3 text-sm text-muted-foreground hover:bg-secondary/30">
                        <Upload className="w-4 h-4 flex-shrink-0" />
                        <span>{uploadingCover ? 'Uploading...' : 'Click to upload cover image'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                      </label>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('map_image')}</Label>
                    {formData.map_image_url ? (
                      <div className="relative">
                        <img src={formData.map_image_url} alt="Map" className="w-full h-32 object-cover rounded border border-border" />
                        <button type="button" onClick={() => setFormData(f => ({ ...f, map_image_url: '' }))} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 hover:bg-black">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded p-3 text-sm text-muted-foreground hover:bg-secondary/30">
                        <Upload className="w-4 h-4 flex-shrink-0" />
                        <span>{uploadingMap ? 'Uploading...' : 'Click to upload map/route image'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleMapUpload} disabled={uploadingMap} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Company Info */}
                <div className="border-t border-border pt-4 space-y-2">
                   <Label>{t('company_about')}</Label>
                   <Input value={formData.company_about || ''} onChange={(e) => setFormData(f => ({ ...f, company_about: e.target.value }))} placeholder={quoteDefaults.company_about || "Tell clients about your company..."} />
                 </div>

                 <div className="space-y-2">
                   <Label>{t('company_contact')} (JSON)</Label>
                   <Input value={formData.company_contact || ''} onChange={(e) => setFormData(f => ({ ...f, company_contact: e.target.value }))} placeholder={quoteDefaults.company_contact || '{"email": "info@example.com", "phone": "+254..."}'} className="font-mono text-xs" />
                 </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>{t('cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.booking_id}>
                {createMutation.isPending ? t('creating') : t('new_quote_btn')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}