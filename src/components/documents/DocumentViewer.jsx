import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Printer, X, MapPin, Calendar, User, Mail, Phone, Globe,
  CheckCircle, XCircle, Clock, Hash, FileText, CreditCard,
  Utensils, Hotel, ChevronRight, Minus, Plus, AlertCircle
} from 'lucide-react';
import DocumentHeader from './DocumentHeader';
import { getSiteConfig } from '@/lib/siteConfig';
import { formatDate, formatCurrency as formatCurrencyBase } from '@/lib/helpers';

function formatCurrency(amount, currency = 'USD') {
  if (!amount && amount !== 0) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency || 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return formatCurrencyBase(amount);
  }
}

function PrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="w-4 h-4" /> Print
    </Button>
  );
}

/* ── INVOICE ── */
function InvoiceDocument({ invoice }) {
  const config = getSiteConfig();
  let items = [];
  try { items = JSON.parse(invoice.items || '[]'); } catch {}

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="mb-8 pb-6 border-b border-gray-200 flex justify-between items-end">
        <img src={config.logoUrl || '/rs-logo-full.svg'} alt="Logo" className="h-14 w-auto" />
        <div className="text-right text-xs text-gray-500 space-y-1">
          <p>Ref: {invoice.invoice_number}</p>
          <p>Date: {formatDate(invoice.created_date)}</p>
          <p>Due: {formatDate(invoice.due_date)}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</p>
          <p className="font-semibold text-gray-800">{invoice.client_name}</p>
          <p className="text-sm text-gray-600">{invoice.client_email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Booking Ref</p>
          <p className="font-mono text-gray-800">{invoice.booking_ref || '—'}</p>
          <p className="text-xs font-semibold text-gray-400 uppercase mt-3 mb-1">Status</p>
          <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full capitalize">{invoice.status}</span>
        </div>
      </div>

      {/* Line Items */}
      <table className="w-full mb-6 text-sm">
        <thead>
          <tr className="border-y border-gray-200 bg-gray-50">
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Description</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-600">Qty</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600">Unit Price</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="px-3 py-2.5">{item.description}</td>
              <td className="px-3 py-2.5 text-center">{item.qty}</td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(item.unit_price)}</td>
              <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(invoice.discount)}</span></div>}
          {invoice.tax > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(invoice.tax)}</span></div>}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
          <div className="flex justify-between text-green-700"><span>Amount Paid</span><span>{formatCurrency(invoice.amount_paid)}</span></div>
          <div className="flex justify-between font-bold text-red-600 border-t border-gray-200 pt-2"><span>Balance Due</span><span>{formatCurrency((invoice.total || 0) - (invoice.amount_paid || 0))}</span></div>
        </div>
      </div>

      {invoice.notes && <p className="mt-8 text-sm text-gray-500 border-t border-gray-200 pt-4">Notes: {invoice.notes}</p>}
      <DocumentFooter config={config} />
    </div>
  );
}

/* ── QUOTE ── */
function QuoteDocument({ quote }) {
  const config = getSiteConfig();
  let items = [];
  try { items = JSON.parse(quote.items || '[]'); } catch {}
  let itineraryDays = [];
  try { itineraryDays = JSON.parse(quote.itinerary_days || '[]'); } catch {}
  const inclusions = quote.inclusions ? quote.inclusions.split(',').map(s => s.trim()).filter(Boolean) : [];
  const exclusions = quote.exclusions ? quote.exclusions.split(',').map(s => s.trim()).filter(Boolean) : [];
  let contact = {};
  try { contact = JSON.parse(quote.company_contact || '{}'); } catch {}
  const currency = quote.currency || 'USD';
  const companyName = config.appName || 'Reservation Safari';

  const paymentTermsLabel = {
    '50/50': '50% deposit on booking confirmation, 50% balance 7 days prior to departure',
    '30/70': '30% deposit on booking confirmation, 70% balance 14 days prior to departure',
    'full':  'Full payment required at time of booking',
    'flexible': 'Flexible payment plan — contact us to discuss options',
  }[quote.payment_terms] || quote.payment_terms;

  // Shared style tokens
  const font = "'Inter', 'Helvetica Neue', Arial, sans-serif";
  const black = '#000';
  const white = '#fff';
  const gray1 = '#f7f7f7';   // lightest bg
  const gray2 = '#e8e8e8';   // border
  const gray3 = '#888';      // secondary text
  const gray4 = '#444';      // body text

  return (
    <div style={{ fontFamily: font, background: white, color: black, fontSize: '13px', lineHeight: '1.5' }}>

      {/* ═══ COVER IMAGE (if any) ═══ */}
      {quote.cover_image_url && (
        <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
          <img src={quote.cover_image_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', bottom: '20px', left: '40px', right: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <img src={config.logoUrl || '/rs-logo-full.svg'} alt="Logo" style={{ height: '32px', width: 'auto', filter: 'brightness(0) invert(1)', display: 'block', marginBottom: '6px' }} />
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' }}>Safari Quotation</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: white, fontFamily: 'monospace', fontSize: '15px', fontWeight: '700' }}>{quote.quote_number}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '4px', lineHeight: '1.9' }}>
                <div>Issued: {formatDate(quote.created_date)}</div>
                <div>Valid until: {formatDate(quote.valid_until)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div style={{ background: black, padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <img src={config.logoUrl || '/rs-logo-full.svg'} alt="Logo" style={{ height: '36px', width: 'auto', filter: 'brightness(0) invert(1)', display: 'block', marginBottom: '8px' }} />
          <div style={{ color: '#999', fontSize: '10px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' }}>Safari Quotation</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: white, fontFamily: 'monospace', fontSize: '15px', fontWeight: '700' }}>{quote.quote_number}</div>
          <div style={{ color: '#888', fontSize: '11px', marginTop: '6px', lineHeight: '1.9' }}>
            <div>Issued: {formatDate(quote.created_date)}</div>
            <div>Valid until: {formatDate(quote.valid_until)}</div>
          </div>
        </div>
      </div>

      {/* ═══ CLIENT & TRIP STRIP ═══ */}
      <div style={{ borderBottom: `1px solid ${gray2}`, padding: '16px 40px', display: 'flex', gap: '48px', flexWrap: 'wrap', background: gray1 }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: gray3, marginBottom: '3px' }}>Prepared For</div>
          <div style={{ fontWeight: '700', fontSize: '14px' }}>{quote.client_name || '—'}</div>
          {quote.client_email && <div style={{ fontSize: '11px', color: gray3, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Mail size={10} />{quote.client_email}</div>}
        </div>
        {quote.highlights && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: gray3, marginBottom: '3px' }}>Package</div>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>{quote.highlights}</div>
          </div>
        )}
        {quote.start_date && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: gray3, marginBottom: '3px' }}>Travel Dates</div>
            <div style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={11} />{formatDate(quote.start_date)} — {formatDate(quote.end_date)}</div>
          </div>
        )}
        {quote.booking_ref && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: gray3, marginBottom: '3px' }}>Booking Ref</div>
            <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px' }}>{quote.booking_ref}</div>
          </div>
        )}
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{ padding: '32px 40px' }}>

        {/* Company Introduction */}
        {quote.company_about && (
          <div style={{ marginBottom: '28px', borderLeft: '3px solid ' + black, paddingLeft: '14px' }}>
            <p style={{ fontSize: '13px', color: gray4, lineHeight: '1.8', margin: 0 }}>{quote.company_about}</p>
          </div>
        )}

        {/* ── Map Image ── */}
        {quote.map_image_url && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `2px solid ${black}`, paddingBottom: '7px', marginBottom: '12px' }}>
              <MapPin size={13} />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Route Map</span>
            </div>
            <img src={quote.map_image_url} alt="Route Map" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block', border: `1px solid ${gray2}` }} />
          </div>
        )}

        {/* ── Itinerary Overview Table ── */}
        {itineraryDays.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `2px solid ${black}`, paddingBottom: '7px', marginBottom: '12px' }}>
              <Calendar size={13} />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Itinerary Overview</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: black, color: white }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px', width: '60px' }}>Day</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Destination</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Accommodation</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Meals</th>
                </tr>
              </thead>
              <tbody>
                {itineraryDays.map((day, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? white : gray1 }}>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${gray2}`, fontWeight: '700', fontSize: '11px' }}>Day {day.day || i + 1}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${gray2}` }}>{day.location || day.title || '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${gray2}`, color: gray4 }}>{day.accommodation || '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${gray2}`, color: gray4 }}>{day.meals || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Day-by-Day Programme ── */}
        {itineraryDays.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `2px solid ${black}`, paddingBottom: '7px', marginBottom: '12px' }}>
              <MapPin size={13} />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Day-by-Day Programme</span>
            </div>
            {itineraryDays.map((day, i) => {
              const activities = Array.isArray(day.activities) ? day.activities : [];
              const hasAccImg = !!day.accommodation_image_url;
              const actsWithImages = activities.filter(a => typeof a === 'object' && a.image_url);
              return (
                <div key={i} style={{ display: 'flex', marginBottom: '2px' }}>
                  <div style={{ width: '40px', minWidth: '40px', background: black, color: white, fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', flexShrink: 0 }}>
                    {day.day || i + 1}
                  </div>
                  <div style={{ flex: 1, border: `1px solid ${gray2}`, borderLeft: 'none', padding: '10px 14px' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '3px' }}>{day.title || `Day ${i + 1}`}</div>
                    {day.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: gray3, marginBottom: '5px' }}>
                        <MapPin size={10} /><span>{day.location}</span>
                      </div>
                    )}
                    {day.description && (
                      <div style={{ fontSize: '12px', color: gray4, lineHeight: '1.6', marginBottom: '7px' }}>{day.description}</div>
                    )}

                    {/* Two-column layout when accommodation image exists */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        {/* Activities */}
                        {activities.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            {activities.map((act, j) => {
                              const text = typeof act === 'string' ? act : (act.title || act.notes || '');
                              const imgUrl = typeof act === 'object' ? act.image_url : null;
                              return (text || imgUrl) ? (
                                <div key={j} style={{ marginBottom: imgUrl ? '6px' : '2px' }}>
                                  {text && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: gray4 }}>
                                      <span style={{ width: '4px', height: '4px', background: black, borderRadius: '50%', marginTop: '5px', flexShrink: 0, display: 'inline-block' }} />
                                      <span>{text}</span>
                                    </div>
                                  )}
                                  {imgUrl && (
                                    <img
                                      src={imgUrl}
                                      alt={text || 'Activity'}
                                      style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', display: 'block', marginTop: '4px', border: `1px solid ${gray2}`, borderRadius: '2px' }}
                                    />
                                  )}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Meals + Accommodation badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {day.meals && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: `1px solid ${gray2}`, padding: '2px 8px', fontSize: '11px', color: gray4 }}>
                              <Utensils size={10} />{day.meals}
                            </span>
                          )}
                          {day.accommodation && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: `1px solid ${gray2}`, padding: '2px 8px', fontSize: '11px', color: gray4 }}>
                              <Hotel size={10} />{day.accommodation}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Accommodation image (right column) */}
                      {hasAccImg && (
                        <div style={{ width: '160px', flexShrink: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: gray3, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Hotel size={9} /> Accommodation
                          </div>
                          <img
                            src={day.accommodation_image_url}
                            alt={day.accommodation || 'Accommodation'}
                            style={{ width: '160px', height: '110px', objectFit: 'cover', display: 'block', border: `1px solid ${gray2}`, borderRadius: '2px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Inclusions & Exclusions ── */}
        {(inclusions.length > 0 || exclusions.length > 0) && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `2px solid ${black}`, paddingBottom: '7px', marginBottom: '12px' }}>
              <CheckCircle size={13} />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Inclusions & Exclusions</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {inclusions.length > 0 && (
                <div style={{ border: `1px solid ${gray2}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: black, color: white, fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>
                    <CheckCircle size={11} /><span>Included</span>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    {inclusions.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12px', color: gray4, marginBottom: '5px' }}>
                        <CheckCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {exclusions.length > 0 && (
                <div style={{ border: `1px solid ${gray2}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: gray1, borderBottom: `1px solid ${gray2}`, fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', color: black }}>
                    <XCircle size={11} /><span>Not Included</span>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    {exclusions.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12px', color: gray4, marginBottom: '5px' }}>
                        <XCircle size={11} style={{ flexShrink: 0, marginTop: '1px', color: gray3 }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Pricing ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `2px solid ${black}`, paddingBottom: '7px', marginBottom: '12px' }}>
            <CreditCard size={13} />
            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Pricing</span>
          </div>
          {items.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '10px' }}>
              <thead>
                <tr style={{ background: black, color: white }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Description</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px', width: '50px' }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px', width: '110px' }}>Unit Price</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px', width: '110px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? white : gray1 }}>
                    <td style={{ padding: '9px 12px', borderBottom: `1px solid ${gray2}` }}>{item.description}</td>
                    <td style={{ padding: '9px 12px', borderBottom: `1px solid ${gray2}`, textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ padding: '9px 12px', borderBottom: `1px solid ${gray2}`, textAlign: 'right' }}>{formatCurrency(item.unit_price, currency)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: `1px solid ${gray2}`, textAlign: 'right', fontWeight: '700' }}>{formatCurrency(item.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '230px' }}>
              {quote.subtotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', color: gray3, borderBottom: `1px solid ${gray2}` }}>
                  <span>Subtotal</span><span>{formatCurrency(quote.subtotal, currency)}</span>
                </div>
              )}
              {quote.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', color: '#c00', borderBottom: `1px solid ${gray2}` }}>
                  <span>Discount</span><span>−{formatCurrency(quote.discount, currency)}</span>
                </div>
              )}
              {quote.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', color: gray3, borderBottom: `1px solid ${gray2}` }}>
                  <span>Tax / Fees</span><span>{formatCurrency(quote.tax, currency)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '15px', fontWeight: '800', color: black, borderTop: `2px solid ${black}`, marginTop: '2px' }}>
                <span>Total {currency}</span>
                <span>{formatCurrency(quote.total, currency)}</span>
              </div>
            </div>
          </div>
          {/* Payment Terms */}
          {paymentTermsLabel && (
            <div style={{ marginTop: '12px', borderLeft: `3px solid ${black}`, paddingLeft: '12px', fontSize: '12px', color: gray4 }}>
              <span style={{ fontWeight: '700' }}>Payment Terms: </span>{paymentTermsLabel}
            </div>
          )}
        </div>

        {/* ── Notes / Terms ── */}
        {quote.notes && (
          <div style={{ marginBottom: '28px', border: `1px solid ${gray2}`, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
              <FileText size={12} /><span>Terms & Conditions</span>
            </div>
            <p style={{ fontSize: '12px', color: gray4, lineHeight: '1.7', margin: 0 }}>{quote.notes}</p>
          </div>
        )}

        {/* ── Contact ── */}
        {(contact.email || contact.phone || contact.website) && (
          <div style={{ borderTop: `1px solid ${gray2}`, paddingTop: '14px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {contact.email && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: gray4 }}><Mail size={12} />{contact.email}</span>}
            {contact.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: gray4 }}><Phone size={12} />{contact.phone}</span>}
            {contact.website && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: gray4 }}><Globe size={12} />{contact.website}</span>}
          </div>
        )}
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ borderTop: `1px solid ${gray2}`, padding: '10px 40px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#bbb' }}>
        <span>{companyName}</span>
        <span>Generated {new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ── VOUCHER ── */
function VoucherDocument({ voucher, qrDataUrl }) {
  const config = getSiteConfig();
  return (
    <div className="p-8 bg-white min-h-full">
      <div className="mb-8 pb-6 border-b border-gray-200 flex justify-between items-end">
        <img src={config.logoUrl || '/rs-logo-full.svg'} alt="Logo" className="h-14 w-auto" />
        <div className="text-right text-xs text-gray-500 space-y-0.5">
          <p className="font-mono">{voucher.voucher_number}</p>
          {voucher.booking_ref && <p className="font-mono text-gray-400">Booking: {voucher.booking_ref}</p>}
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Guest Name</p><p className="font-semibold text-gray-800">{voucher.client_name}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Package</p><p className="font-semibold text-gray-800">{voucher.package_name}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Hotel / Lodge</p><p className="font-semibold text-gray-800">{voucher.hotel_name}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Room Type</p><p className="font-semibold text-gray-800">{voucher.room_type || '—'}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Check-in</p><p className="font-semibold text-gray-800">{formatDate(voucher.check_in)}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Check-out</p><p className="font-semibold text-gray-800">{formatDate(voucher.check_out)}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Meal Plan</p><p className="font-semibold text-gray-800">{voucher.meal_plan}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Guests</p><p className="font-semibold text-gray-800">{voucher.num_guests}</p></div>
        </div>
      </div>

      {voucher.special_instructions && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Special Instructions</p>
          <p className="text-sm text-gray-700">{voucher.special_instructions}</p>
        </div>
      )}

      {qrDataUrl && (
        <div className="mt-6 border-t border-gray-200 pt-6 flex items-start gap-5 bg-gray-50 rounded-xl p-5">
          <img src={qrDataUrl} alt="Booking QR code" className="w-32 h-32 flex-shrink-0 border border-gray-200 rounded-lg bg-white p-1" />
          <div className="text-sm text-gray-600 space-y-1.5">
            <p className="font-semibold text-gray-800 text-base">Check-in QR</p>
            <p>Your driver will scan this on pickup. Your guide will scan at park entry and lodge check-in.</p>
            <p className="text-xs text-gray-400 font-mono">{voucher.booking_ref || '—'}</p>
          </div>
        </div>
      )}
      <DocumentFooter config={config} />
    </div>
  );
}

/* ── MANIFEST ── */
function ManifestDocument({ manifest }) {
  const config = getSiteConfig();
  let passengers = [];
  try { passengers = JSON.parse(manifest.passengers || '[]'); } catch {}

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="mb-8 pb-6 border-b border-gray-200 flex justify-between items-end">
        {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-16 w-auto" />}
        <p className="text-xs text-gray-500">Ref: {manifest.manifest_number} | Trip Date: {formatDate(manifest.trip_date)}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Destination</p><p className="font-semibold">{manifest.destination}</p></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Vehicle</p><p className="font-semibold">{manifest.vehicle || '—'}</p></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Driver / Guide</p><p className="font-semibold">{manifest.driver_guide || '—'}</p></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Passengers</p><p className="font-semibold">{manifest.num_passengers}</p></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Booking Ref</p><p className="font-mono font-semibold">{manifest.booking_ref}</p></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Emergency Contact</p><p className="font-semibold">{manifest.emergency_contact || '—'}</p></div>
      </div>

      {passengers.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Passenger List</p>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">#</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Passport</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map((p, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{p.name || '—'}</td>
                  <td className="px-3 py-2 font-mono">{p.passport || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {manifest.notes && <p className="text-sm text-gray-500 border-t border-gray-200 pt-4">Notes: {manifest.notes}</p>}
      <DocumentFooter config={config} />
    </div>
  );
}

function DocumentFooter({ config }) {
  return (
    <div className="mt-12 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
      <span>{config.appName || 'Reservation Safari'}</span>
      <span>Generated {new Date().toLocaleDateString()}</span>
    </div>
  );
}

/* ── Main Viewer ── */
export default function DocumentViewer({ open, onClose, type, document: doc, qrDataUrl }) {
  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 border-b border-border bg-background print:hidden">
          <span className="font-semibold text-sm capitalize">{type} Preview</span>
          <div className="flex gap-2">
            <PrintButton />
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {type === 'invoice' && <InvoiceDocument invoice={doc} />}
        {type === 'quote' && <QuoteDocument quote={doc} />}
        {type === 'voucher' && <VoucherDocument voucher={doc} qrDataUrl={qrDataUrl} />}
        {type === 'manifest' && <ManifestDocument manifest={doc} />}
      </DialogContent>
    </Dialog>
  );
}