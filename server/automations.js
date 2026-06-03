/**
 * Automation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   • Event-based email triggers (booking created/confirmed, invoice, payment,
 *     quote sent)
 *   • Scheduled checks (overdue invoices, expired quotes, weekly admin report)
 *   • Automation config persistence
 *   • Activity log (stored as AutomationLog entity)
 */

const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./emailService');
const smsService   = require('./smsService');
const i18n         = require('./i18n');
const { entity, users } = require('./db');

// Resolve a language code from a Booking / Invoice / Payment record.
// Order: record.lang → linked Client.language → default 'en'.
function resolveLang(record) {
  if (!record) return 'en';
  if (record.lang)     return i18n.normaliseLang(record.lang);
  if (record.language) return i18n.normaliseLang(record.language);
  if (record.client_id) {
    try {
      const c = entity.findById('Client', record.client_id);
      if (c?.language) return i18n.normaliseLang(c.language);
    } catch {}
  }
  return 'en';
}

const CONFIG_FILE = path.join(__dirname, 'automation-config.json');

// ── Config ────────────────────────────────────────────────────────────────────

function defaultConfig() {
  return {
    booking_confirmation_auto : true,
    booking_cancellation_auto : true,
    upcoming_trip_reminder    : true,
    invoice_auto              : true,
    payment_receipt_auto      : true,
    quote_auto                : true,
    overdue_reminder          : true,
    quote_expiry_check        : true,
    weekly_report             : false,

    // SMS channel — off by default, enable per event
    booking_confirmation_sms  : false,
    payment_receipt_sms       : false,
    upcoming_trip_reminder_sms: false,
    overdue_reminder_sms      : false,

    // WhatsApp channel — off by default
    booking_confirmation_whatsapp  : false,
    payment_receipt_whatsapp       : false,
    upcoming_trip_reminder_whatsapp: false,
  };
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE))
      return { ...defaultConfig(), ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch {}
  return defaultConfig();
}

function saveConfig(patch) {
  const merged = { ...loadConfig(), ...patch, last_updated: new Date().toISOString() };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

// ── In-app message mirror ─────────────────────────────────────────────────────
// Every time an email is sent to a client, we also store a Message entity so
// the conversation shows up in the admin Messages page without opening an email app.

function logMessageInSystem({ client_id = '', client_name = '', client_email, booking_id = '', booking_ref = '', subject, body }) {
  if (!client_email) return;
  const now = new Date().toISOString();
  // Group by booking when possible, otherwise by email address
  const conversationId = booking_id
    ? `booking_${booking_id}`
    : `client_${client_email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  try {
    entity.create('Message', {
      id           : uuidv4(),
      conversation_id: conversationId,
      booking_id,
      booking_ref,
      client_id,
      client_name,
      client_email,
      sender_type  : 'system',
      sender_name  : 'System Email',
      sender_email : 'system',
      subject      : subject || '',
      body         : body || '',
      message_type : 'email',   // distinguishes automated emails from manual chat messages
      is_read      : true,
      status       : 'open',
      created_date : now,
      updated_date : now,
      created_by   : 'system',
    });
  } catch (e) {
    console.warn('[AutoMsg] Could not log message:', e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isEmailConfigured() {
  const cfg = emailService.loadConfig();
  return !!(cfg && cfg.host && cfg.user && cfg.pass);
}

function getCompany() {
  const cfg = emailService.loadConfig() || {};
  return {
    companyName   : cfg.sender_name     || 'Reservation Safari',
    companyEmail  : cfg.company_email   || cfg.user || '',
    companyPhone  : cfg.company_phone   || '',
    companyAddress: cfg.company_address || '',
    logoUrl       : cfg.logo_url        || '',
    accentColor   : cfg.accent_color    || '#16a34a',
  };
}

function paymentLink() {
  return emailService.loadConfig()?.payment_link || '';
}

// Look up a client's phone from the Client entity if the source record doesn't carry one.
function resolveClientPhone(record) {
  if (record?.client_phone) return record.client_phone;
  if (!record?.client_id)   return '';
  try {
    const client = entity.findById('Client', record.client_id);
    return client?.phone || '';
  } catch { return ''; }
}

// Send via channel and log result. Never throws — always logs.
// For WhatsApp, if `templateEvent` is set and a ContentSid is configured for that
// event, the approved template is used (required for cold/>24h sends in production).
async function sendChannelAndLog({ channel, type, to, body, entityRef, templateEvent, templateCtx }) {
  if (!to) {
    logAction(type, 'skipped', { ...entityRef, recipient_email: to, message: `No phone number on file` });
    return;
  }
  try {
    if (channel === 'whatsapp') {
      const cfg = smsService.loadConfig();
      const contentSid = templateEvent && cfg.wa_templates ? cfg.wa_templates[templateEvent] : '';
      if (contentSid) {
        const contentVariables = smsService.buildWaTemplateVars(templateEvent, templateCtx || {});
        await smsService.sendWhatsApp({ to, contentSid, contentVariables });
      } else {
        await smsService.sendWhatsApp({ to, body });
      }
    } else {
      await smsService.sendSms({ to, body });
    }
    logAction(type, 'sent', { ...entityRef, recipient_email: to, message: `${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} sent to ${to}` });
  } catch (err) {
    logAction(type, 'failed', { ...entityRef, recipient_email: to, message: `Failed: ${err.message}` });
  }
}

function logAction(type, status, data = {}) {
  const now = new Date().toISOString();
  const record = {
    id            : uuidv4(),
    type,
    status,                                    // 'sent' | 'failed' | 'skipped'
    entity_type   : data.entity_type   || '',
    entity_id     : data.entity_id     || '',
    entity_ref    : data.entity_ref    || '',
    recipient_email: data.recipient_email || '',
    message       : data.message       || '',
    created_date  : now,
    updated_date  : now,
    created_by    : 'system',
  };
  entity.create('AutomationLog', record);
  console.log(`[Automation][${status.toUpperCase()}] ${type}: ${data.message || ''}`);
}

// ── Event Triggers ────────────────────────────────────────────────────────────

async function onBookingCreated(booking) {
  const cfg = loadConfig();
  const company = getCompany();
  const lang = resolveLang(booking);
  const entityRef = { entity_type: 'Booking', entity_id: booking.id, entity_ref: booking.booking_ref };
  const phone = resolveClientPhone(booking);

  // SMS
  if (cfg.booking_confirmation_sms && smsService.isSmsConfigured()) {
    await sendChannelAndLog({
      channel: 'sms',
      type: 'booking_received_sms',
      to: phone,
      body: smsService.templates.bookingReceivedSms({ booking, company, lang }),
      entityRef,
    });
  }
  // WhatsApp
  if (cfg.booking_confirmation_whatsapp && smsService.isWhatsAppConfigured()) {
    await sendChannelAndLog({
      channel: 'whatsapp',
      type: 'booking_received_whatsapp',
      to: phone,
      body: smsService.templates.bookingReceivedWa({ booking, company, paymentLink: paymentLink(), lang }),
      entityRef,
      templateEvent: 'booking_received',
      templateCtx: { booking, company },
    });
  }

  if (!cfg.booking_confirmation_auto) return;
  if (!isEmailConfigured())           return;
  if (!booking.client_email)          return;

  try {
    const company = getCompany();
    await emailService.sendEmail({
      to     : booking.client_email,
      subject: i18n.t('email.booking_received.subject', lang, { ref: booking.booking_ref }) + ` | ${company.companyName}`,
      html   : emailService.bookingConfirmationEmailHtml({
        booking_ref    : booking.booking_ref,
        client_name    : booking.client_name,
        client_email   : booking.client_email,
        package_name   : booking.package_name,
        start_date     : booking.start_date,
        end_date       : booking.end_date,
        num_guests     : booking.num_guests,
        total_amount   : booking.total_amount,
        currency       : booking.currency || 'USD',
        amount_paid    : booking.amount_paid || 0,
        booking_source : booking.booking_source,
        special_requests: booking.special_requests,
        payment_link   : paymentLink(),
        company,
        lang,
        variant        : 'received',
      }),
    });
    logAction('booking_created', 'sent', {
      entity_type    : 'Booking',
      entity_id      : booking.id,
      entity_ref     : booking.booking_ref,
      recipient_email: booking.client_email,
      message        : `Booking acknowledgement sent to ${booking.client_email}`,
    });
    logMessageInSystem({
      client_name : booking.client_name,
      client_email: booking.client_email,
      booking_id  : booking.id,
      booking_ref : booking.booking_ref,
      subject     : `Booking Received — ${booking.booking_ref}`,
      body        : `Your booking ${booking.booking_ref} for "${booking.package_name}" has been received.\n\nDeparture: ${booking.start_date || '—'}  |  Guests: ${booking.num_guests || 1}  |  Total: ${booking.currency || 'USD'} ${Number(booking.total_amount || 0).toLocaleString()}\n\nWe will confirm your booking shortly.`,
    });
  } catch (err) {
    logAction('booking_created', 'failed', {
      entity_type    : 'Booking',
      entity_id      : booking.id,
      entity_ref     : booking.booking_ref,
      recipient_email: booking.client_email,
      message        : `Failed: ${err.message}`,
    });
  }
}

async function onBookingCancelled(booking) {
  const cfg = loadConfig();
  if (!cfg.booking_cancellation_auto) return;
  if (!isEmailConfigured())           return;
  if (!booking.client_email)          return;

  try {
    const company = getCompany();
    const lang = resolveLang(booking);
    await emailService.sendEmail({
      to     : booking.client_email,
      subject: i18n.t('email.booking_cancelled.subject', lang, { ref: booking.booking_ref }) + ` | ${company.companyName}`,
      html   : cancellationEmailHtml({ booking, company, lang }),
    });
    logAction('booking_cancelled', 'sent', {
      entity_type    : 'Booking',
      entity_id      : booking.id,
      entity_ref     : booking.booking_ref,
      recipient_email: booking.client_email,
      message        : `Cancellation notice sent to ${booking.client_email}`,
    });
    logMessageInSystem({
      client_name : booking.client_name,
      client_email: booking.client_email,
      booking_id  : booking.id,
      booking_ref : booking.booking_ref,
      subject     : `Booking Cancellation — ${booking.booking_ref}`,
      body        : `Your booking ${booking.booking_ref} for "${booking.package_name || '—'}" has been cancelled.\n\nIf you believe this is an error or wish to rebook, please reply to this message or contact us directly.`,
    });
  } catch (err) {
    logAction('booking_cancelled', 'failed', {
      entity_type    : 'Booking',
      entity_id      : booking.id,
      entity_ref     : booking.booking_ref,
      recipient_email: booking.client_email,
      message        : `Failed: ${err.message}`,
    });
  }
}

async function onBookingUpdated(updatedBooking, previousBooking) {
  const cfg = loadConfig();

  // Cancellation notification (uses its own handler — has email-only path)
  if (updatedBooking.status === 'cancelled' && previousBooking?.status !== 'cancelled') {
    await onBookingCancelled(updatedBooking);
    return;
  }

  // Status just transitioned to confirmed → fire SMS/WhatsApp/email confirmations
  if (updatedBooking.status !== 'confirmed')   return;
  if (previousBooking?.status === 'confirmed') return; // already confirmed

  const company = getCompany();
  const lang = resolveLang(updatedBooking);
  const entityRef = { entity_type: 'Booking', entity_id: updatedBooking.id, entity_ref: updatedBooking.booking_ref };
  const phone = resolveClientPhone(updatedBooking);

  if (cfg.booking_confirmation_sms && smsService.isSmsConfigured()) {
    await sendChannelAndLog({
      channel: 'sms',
      type: 'booking_confirmed_sms',
      to: phone,
      body: smsService.templates.bookingConfirmedSms({ booking: updatedBooking, company, lang }),
      entityRef,
    });
  }
  if (cfg.booking_confirmation_whatsapp && smsService.isWhatsAppConfigured()) {
    await sendChannelAndLog({
      channel: 'whatsapp',
      type: 'booking_confirmed_whatsapp',
      to: phone,
      body: smsService.templates.bookingConfirmedWa({ booking: updatedBooking, company, paymentLink: paymentLink(), lang }),
      entityRef,
      templateEvent: 'booking_confirmed',
      templateCtx: { booking: updatedBooking, company },
    });
  }

  if (!cfg.booking_confirmation_auto) return;
  if (!isEmailConfigured())           return;
  if (!updatedBooking.client_email)   return;

  try {
    const company = getCompany();
    await emailService.sendEmail({
      to     : updatedBooking.client_email,
      subject: i18n.t('email.booking_confirmed.subject', lang, { ref: updatedBooking.booking_ref }) + ` | ${company.companyName}`,
      html   : emailService.bookingConfirmationEmailHtml({
        booking_ref    : updatedBooking.booking_ref,
        client_name    : updatedBooking.client_name,
        client_email   : updatedBooking.client_email,
        package_name   : updatedBooking.package_name,
        start_date     : updatedBooking.start_date,
        end_date       : updatedBooking.end_date,
        num_guests     : updatedBooking.num_guests,
        total_amount   : updatedBooking.total_amount,
        currency       : updatedBooking.currency || 'USD',
        amount_paid    : updatedBooking.amount_paid || 0,
        booking_source : updatedBooking.booking_source,
        special_requests: updatedBooking.special_requests,
        payment_link   : paymentLink(),
        company,
        lang,
        variant        : 'confirmed',
      }),
    });
    logAction('booking_confirmed', 'sent', {
      entity_type    : 'Booking',
      entity_id      : updatedBooking.id,
      entity_ref     : updatedBooking.booking_ref,
      recipient_email: updatedBooking.client_email,
      message        : `Booking confirmation sent to ${updatedBooking.client_email}`,
    });
    logMessageInSystem({
      client_name : updatedBooking.client_name,
      client_email: updatedBooking.client_email,
      booking_id  : updatedBooking.id,
      booking_ref : updatedBooking.booking_ref,
      subject     : `Booking Confirmed ✅ — ${updatedBooking.booking_ref}`,
      body        : `Great news! Your booking ${updatedBooking.booking_ref} for "${updatedBooking.package_name}" is confirmed.\n\nDeparture: ${updatedBooking.start_date || '—'}  →  Return: ${updatedBooking.end_date || '—'}\nGuests: ${updatedBooking.num_guests || 1}  |  Total: ${updatedBooking.currency || 'USD'} ${Number(updatedBooking.total_amount || 0).toLocaleString()}${updatedBooking.amount_paid > 0 ? `\nAmount Paid: ${updatedBooking.currency || 'USD'} ${Number(updatedBooking.amount_paid).toLocaleString()}` : ''}\n\nOur team will be in touch with your full itinerary and pre-departure details.`,
    });
  } catch (err) {
    logAction('booking_confirmed', 'failed', {
      entity_type    : 'Booking',
      entity_id      : updatedBooking.id,
      entity_ref     : updatedBooking.booking_ref,
      recipient_email: updatedBooking.client_email,
      message        : `Failed: ${err.message}`,
    });
  }
}

async function onInvoiceCreated(invoice) {
  const cfg = loadConfig();
  if (!cfg.invoice_auto)     return;
  if (!isEmailConfigured())  return;
  if (!invoice.client_email) return;

  try {
    const company = getCompany();
    let items = [];
    try { items = invoice.items
      ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items)
      : [];
    } catch {}

    await emailService.sendEmail({
      to     : invoice.client_email,
      subject: `Invoice ${invoice.invoice_number} — ${company.companyName}`,
      html   : emailService.invoiceEmailHtml({
        invoice_number: invoice.invoice_number,
        client_name   : invoice.client_name,
        client_email  : invoice.client_email,
        total         : invoice.total,
        amount_paid   : invoice.amount_paid || 0,
        due_date      : invoice.due_date,
        booking_ref   : invoice.booking_ref,
        notes         : invoice.notes,
        items,
        currency      : invoice.currency || 'USD',
        payment_link  : paymentLink(),
        company,
      }),
    });
    logAction('invoice_sent', 'sent', {
      entity_type    : 'Invoice',
      entity_id      : invoice.id,
      entity_ref     : invoice.invoice_number,
      recipient_email: invoice.client_email,
      message        : `Invoice ${invoice.invoice_number} auto-sent to ${invoice.client_email}`,
    });
    const invBalance = Number(invoice.total || 0) - Number(invoice.amount_paid || 0);
    logMessageInSystem({
      client_name : invoice.client_name,
      client_email: invoice.client_email,
      booking_id  : invoice.booking_id || '',
      booking_ref : invoice.booking_ref || '',
      subject     : `Invoice ${invoice.invoice_number}`,
      body        : `Invoice ${invoice.invoice_number} has been issued.\n\nTotal: ${invoice.currency || 'USD'} ${Number(invoice.total || 0).toLocaleString()}${invoice.amount_paid > 0 ? `\nPaid: ${invoice.currency || 'USD'} ${Number(invoice.amount_paid).toLocaleString()}` : ''}\nBalance Due: ${invoice.currency || 'USD'} ${invBalance.toLocaleString()}${invoice.due_date ? `\nDue Date: ${invoice.due_date}` : ''}\n\nPlease use the payment link in your email to settle this invoice.`,
    });
  } catch (err) {
    logAction('invoice_sent', 'failed', {
      entity_type    : 'Invoice',
      entity_id      : invoice.id,
      entity_ref     : invoice.invoice_number,
      recipient_email: invoice.client_email,
      message        : `Failed: ${err.message}`,
    });
  }
}

async function onInvoiceUpdated(updated, previous) {
  // Re-send if status just changed to 'sent'
  if (updated.status !== 'sent' || previous?.status === 'sent') return;
  await onInvoiceCreated(updated);
}

async function onPaymentCreated(payment) {
  const cfg = loadConfig();
  if (!['confirmed', 'paid'].includes(payment.status)) return;

  const company = getCompany();
  const lang = resolveLang(payment);
  const entityRef = { entity_type: 'Payment', entity_id: payment.id, entity_ref: payment.payment_ref };
  const phone = resolveClientPhone(payment);

  if (cfg.payment_receipt_sms && smsService.isSmsConfigured()) {
    await sendChannelAndLog({
      channel: 'sms',
      type: 'payment_receipt_sms',
      to: phone,
      body: smsService.templates.paymentReceiptSms({ payment, company, lang }),
      entityRef,
    });
  }
  if (cfg.payment_receipt_whatsapp && smsService.isWhatsAppConfigured()) {
    await sendChannelAndLog({
      channel: 'whatsapp',
      type: 'payment_receipt_whatsapp',
      to: phone,
      body: smsService.templates.paymentReceiptWa({ payment, company, lang }),
      entityRef,
      templateEvent: 'payment_receipt',
      templateCtx: { payment, company },
    });
  }

  if (!cfg.payment_receipt_auto) return;
  if (!isEmailConfigured())      return;
  if (!payment.client_email)     return;

  try {
    const company = getCompany();
    await emailService.sendEmail({
      to     : payment.client_email,
      subject: i18n.t('email.payment_receipt.subject', lang, { ref: payment.payment_ref }) + ` | ${company.companyName}`,
      html   : emailService.paymentReceiptEmailHtml({
        payment_ref   : payment.payment_ref,
        client_name   : payment.client_name,
        client_email  : payment.client_email,
        amount        : payment.amount,
        currency      : payment.currency || 'USD',
        payment_date  : payment.payment_date,
        method        : payment.method,
        invoice_number: payment.invoice_number,
        booking_ref   : payment.booking_ref,
        notes         : payment.notes,
        company,
        lang,
      }),
    });
    logAction('payment_receipt', 'sent', {
      entity_type    : 'Payment',
      entity_id      : payment.id,
      entity_ref     : payment.payment_ref,
      recipient_email: payment.client_email,
      message        : `Payment receipt sent to ${payment.client_email} (${payment.payment_ref})`,
    });
    logMessageInSystem({
      client_name : payment.client_name,
      client_email: payment.client_email,
      booking_id  : payment.booking_id || '',
      booking_ref : payment.booking_ref || '',
      subject     : `Payment Receipt — ${payment.payment_ref}`,
      body        : `Payment received. Thank you!\n\nReference: ${payment.payment_ref}\nAmount: ${payment.currency || 'USD'} ${Number(payment.amount || 0).toLocaleString()}${payment.method ? `\nMethod: ${payment.method}` : ''}${payment.payment_date ? `\nDate: ${payment.payment_date}` : ''}${payment.invoice_number ? `\nInvoice: ${payment.invoice_number}` : ''}`,
    });
  } catch (err) {
    logAction('payment_receipt', 'failed', {
      entity_type    : 'Payment',
      entity_id      : payment.id,
      entity_ref     : payment.payment_ref,
      recipient_email: payment.client_email,
      message        : `Failed: ${err.message}`,
    });
  }
}

async function onPaymentUpdated(updated, previous) {
  // Send receipt when status becomes confirmed/paid
  if (['confirmed', 'paid'].includes(updated.status) &&
      !['confirmed', 'paid'].includes(previous?.status)) {
    await onPaymentCreated(updated);
  }
}

async function onQuoteUpdated(updated, previous) {
  const cfg = loadConfig();
  if (!cfg.quote_auto)                         return;
  if (!isEmailConfigured())                    return;
  if (!updated.client_email)                   return;
  if (updated.status !== 'sent')               return;
  if (previous?.status === 'sent')             return;

  try {
    const company = getCompany();
    await emailService.sendEmail({
      to     : updated.client_email,
      subject: `Your Safari Quote ${updated.quote_number} — ${company.companyName}`,
      html   : emailService.quoteEmailHtml({
        quote_number: updated.quote_number,
        client_name : updated.client_name,
        client_email: updated.client_email,
        total       : updated.total,
        valid_until : updated.valid_until,
        package_name: updated.package_name,
        start_date  : updated.start_date,
        end_date    : updated.end_date,
        num_guests  : updated.num_guests,
        inclusions  : updated.inclusions,
        exclusions  : updated.exclusions,
        highlights  : updated.highlights,
        notes       : updated.notes,
        currency    : updated.currency || 'USD',
        payment_link: paymentLink(),
        company,
      }),
    });
    logAction('quote_sent', 'sent', {
      entity_type    : 'Quote',
      entity_id      : updated.id,
      entity_ref     : updated.quote_number,
      recipient_email: updated.client_email,
      message        : `Quote ${updated.quote_number} auto-sent to ${updated.client_email}`,
    });
    logMessageInSystem({
      client_name : updated.client_name,
      client_email: updated.client_email,
      booking_ref : updated.booking_ref || '',
      subject     : `Your Safari Quote ${updated.quote_number}`,
      body        : `Your personalised safari quote ${updated.quote_number} has been sent.\n\nPackage: ${updated.package_name || '—'}\nDeparture: ${updated.start_date || '—'}  →  Return: ${updated.end_date || '—'}\nGuests: ${updated.num_guests || 1}\nTotal: ${updated.currency || 'USD'} ${Number(updated.total || 0).toLocaleString()}${updated.valid_until ? `\nValid Until: ${updated.valid_until}` : ''}\n\nTo accept this quote, please reply or use the link provided in your email.`,
    });
  } catch (err) {
    logAction('quote_sent', 'failed', {
      entity_type    : 'Quote',
      entity_id      : updated.id,
      entity_ref     : updated.quote_number,
      recipient_email: updated.client_email,
      message        : `Failed: ${err.message}`,
    });
  }
}

// ── Upcoming Trip Reminder ────────────────────────────────────────────────────

async function runUpcomingTripReminder() {
  const cfg = loadConfig();
  const emailOn    = cfg.upcoming_trip_reminder       && isEmailConfigured();
  const smsOn      = cfg.upcoming_trip_reminder_sms   && smsService.isSmsConfigured();
  const whatsappOn = cfg.upcoming_trip_reminder_whatsapp && smsService.isWhatsAppConfigured();
  if (!emailOn && !smsOn && !whatsappOn) return { checked: 0, actioned: 0 };

  const todayStr = new Date().toISOString().slice(0, 10);
  // Find confirmed bookings starting in exactly 7 days
  const targetDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const bookings = entity.list('Booking').filter(b =>
    b.status === 'confirmed' &&
    b.start_date?.slice(0, 10) === targetDate
  );

  let actioned = 0;
  for (const booking of bookings) {
    const company = getCompany();
    const lang = resolveLang(booking);
    const entityRef = { entity_type: 'Booking', entity_id: booking.id, entity_ref: booking.booking_ref };
    const phone = resolveClientPhone(booking);

    // SMS — dedupe per day
    if (smsOn && phone) {
      const alreadySms = entity.list('AutomationLog').some(l =>
        l.type === 'upcoming_reminder_sms' &&
        l.entity_id === booking.id &&
        l.created_date?.startsWith(todayStr)
      );
      if (!alreadySms) {
        await sendChannelAndLog({
          channel: 'sms',
          type: 'upcoming_reminder_sms',
          to: phone,
          body: smsService.templates.upcomingTripSms({ booking, company, lang }),
          entityRef,
        });
      }
    }
    // WhatsApp — dedupe per day
    if (whatsappOn && phone) {
      const alreadyWa = entity.list('AutomationLog').some(l =>
        l.type === 'upcoming_reminder_whatsapp' &&
        l.entity_id === booking.id &&
        l.created_date?.startsWith(todayStr)
      );
      if (!alreadyWa) {
        await sendChannelAndLog({
          channel: 'whatsapp',
          type: 'upcoming_reminder_whatsapp',
          to: phone,
          body: smsService.templates.upcomingTripWa({ booking, company, lang }),
          entityRef,
          templateEvent: 'upcoming_reminder',
          templateCtx: { booking, company },
        });
      }
    }

    // Email path — only if email is enabled and address is on file
    if (!emailOn || !booking.client_email) { actioned++; continue; }
    // Deduplicate — only one reminder per booking per day
    const alreadySent = entity.list('AutomationLog').some(l =>
      l.type === 'upcoming_reminder' &&
      l.entity_id === booking.id &&
      l.created_date?.startsWith(todayStr)
    );
    if (alreadySent) continue;

    try {
      await emailService.sendEmail({
        to     : booking.client_email,
        subject: i18n.t('email.upcoming_trip.subject', lang, { ref: booking.booking_ref }) + ` | ${company.companyName}`,
        html   : upcomingTripHtml({ booking, company, lang }),
      });
      logAction('upcoming_reminder', 'sent', {
        entity_type    : 'Booking',
        entity_id      : booking.id,
        entity_ref     : booking.booking_ref,
        recipient_email: booking.client_email,
        message        : `7-day trip reminder sent to ${booking.client_email} (trip on ${targetDate})`,
      });
      logMessageInSystem({
        client_name : booking.client_name,
        client_email: booking.client_email,
        booking_id  : booking.id,
        booking_ref : booking.booking_ref,
        subject     : `Your Safari Starts in 7 Days! — ${booking.booking_ref}`,
        body        : `Reminder: Your safari "${booking.package_name || '—'}" (${booking.booking_ref}) starts in 7 days on ${targetDate}.\n\nRemember to pack neutral-coloured clothing, binoculars, sunscreen, and insect repellent. Ensure your passport is valid and visa is in order.\n\nWe look forward to welcoming you!`,
      });
      actioned++;
    } catch (err) {
      logAction('upcoming_reminder', 'failed', {
        entity_type    : 'Booking',
        entity_id      : booking.id,
        entity_ref     : booking.booking_ref,
        recipient_email: booking.client_email,
        message        : `Failed: ${err.message}`,
      });
    }
  }

  console.log(`[Automation] Upcoming trip check done — ${actioned} reminders sent`);
  return { checked: bookings.length, actioned };
}

// ── Scheduled Tasks ───────────────────────────────────────────────────────────

async function runOverdueCheck() {
  const cfg = loadConfig();
  const emailOn = cfg.overdue_reminder     && isEmailConfigured();
  const smsOn   = cfg.overdue_reminder_sms && smsService.isSmsConfigured();
  if (!emailOn && !smsOn) return { checked: 0, actioned: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const invoices = entity.list('Invoice');
  let actioned = 0;

  for (const inv of invoices) {
    if (!inv.due_date)         continue;
    if (inv.status === 'paid') continue;

    const due = String(inv.due_date).slice(0, 10);
    if (due >= today) continue;

    // Mark overdue if not already
    if (inv.status !== 'overdue') {
      entity.update('Invoice', inv.id, {
        status      : 'overdue',
        updated_date: new Date().toISOString(),
      });
    }

    const balance = (inv.total || 0) - (inv.amount_paid || 0);
    const company = getCompany();
    const lang = resolveLang(inv);
    const entityRef = { entity_type: 'Invoice', entity_id: inv.id, entity_ref: inv.invoice_number };

    // SMS reminder — dedupe per day per invoice
    if (smsOn) {
      const phone = resolveClientPhone(inv);
      const alreadySms = entity.list('AutomationLog').some(l =>
        l.type === 'overdue_reminder_sms' &&
        l.entity_id === inv.id &&
        l.created_date?.startsWith(today)
      );
      if (phone && !alreadySms) {
        await sendChannelAndLog({
          channel: 'sms',
          type: 'overdue_reminder_sms',
          to: phone,
          body: smsService.templates.overdueSms({ invoice: inv, balance, company, lang }),
          entityRef,
        });
        actioned++;
      }
    }

    // Email path
    if (!emailOn || !inv.client_email) continue;

    // Only one reminder per invoice per day
    const logs = entity.list('AutomationLog').filter(l =>
      l.type === 'overdue_reminder' &&
      l.entity_id === inv.id &&
      l.created_date?.startsWith(today)
    );
    if (logs.length > 0) continue;

    try {
      let items = [];
      try { items = inv.items ? (typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items) : []; } catch {}
      await emailService.sendEmail({
        to     : inv.client_email,
        subject: i18n.t('email.overdue.subject', lang, { ref: inv.invoice_number }) + ` | ${company.companyName}`,
        html   : emailService.invoiceEmailHtml({
          invoice_number: inv.invoice_number,
          client_name   : inv.client_name,
          client_email  : inv.client_email,
          total         : inv.total,
          amount_paid   : inv.amount_paid || 0,
          due_date      : inv.due_date,
          booking_ref   : inv.booking_ref,
          notes         : `⚠️ This invoice is OVERDUE. Outstanding balance: ${inv.currency || 'USD'} ${balance.toLocaleString()}. Please settle at your earliest convenience.`,
          items,
          currency      : inv.currency || 'USD',
          payment_link  : paymentLink(),
          company,
        }),
      });
      logAction('overdue_reminder', 'sent', {
        entity_type    : 'Invoice',
        entity_id      : inv.id,
        entity_ref     : inv.invoice_number,
        recipient_email: inv.client_email,
        message        : `Overdue reminder sent for invoice ${inv.invoice_number} (due ${due})`,
      });
      logMessageInSystem({
        client_name : inv.client_name,
        client_email: inv.client_email,
        booking_id  : inv.booking_id || '',
        booking_ref : inv.booking_ref || '',
        subject     : `Overdue Payment — Invoice ${inv.invoice_number}`,
        body        : `Invoice ${inv.invoice_number} is overdue.\n\nTotal: ${inv.currency || 'USD'} ${Number(inv.total || 0).toLocaleString()}\nOutstanding Balance: ${inv.currency || 'USD'} ${balance.toLocaleString()}\nOriginal Due Date: ${due}\n\nPlease settle this invoice as soon as possible using the payment link in your email.`,
      });
      actioned++;
    } catch (err) {
      logAction('overdue_reminder', 'failed', {
        entity_type    : 'Invoice',
        entity_id      : inv.id,
        entity_ref     : inv.invoice_number,
        recipient_email: inv.client_email,
        message        : `Failed: ${err.message}`,
      });
    }
  }

  console.log(`[Automation] Overdue check done — ${actioned} reminders sent`);
  return { checked: invoices.length, actioned };
}

async function runQuoteExpiryCheck() {
  const cfg = loadConfig();
  if (!cfg.quote_expiry_check) return { checked: 0, actioned: 0 };

  const today  = new Date().toISOString().slice(0, 10);
  const quotes = entity.list('Quote');
  let actioned = 0;

  for (const q of quotes) {
    if (!q.valid_until) continue;
    const exp = String(q.valid_until).slice(0, 10);
    if (exp >= today)                                    continue;
    if (['accepted', 'expired'].includes(q.status))     continue;

    entity.update('Quote', q.id, {
      status      : 'expired',
      updated_date: new Date().toISOString(),
    });
    logAction('quote_expired', 'sent', {
      entity_type    : 'Quote',
      entity_id      : q.id,
      entity_ref     : q.quote_number,
      recipient_email: q.client_email || '',
      message        : `Quote ${q.quote_number} auto-marked as expired (was due ${exp})`,
    });
    actioned++;
  }

  console.log(`[Automation] Quote expiry check done — ${actioned} quotes expired`);
  return { checked: quotes.length, actioned };
}

async function runWeeklyReport() {
  const cfg = loadConfig();
  if (!cfg.weekly_report)   return { sent: 0 };
  if (!isEmailConfigured()) return { sent: 0 };

  const adminUsers = users.all().filter(u => u.role === 'admin');
  if (adminUsers.length === 0) return { sent: 0 };

  const now     = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekISO = weekAgo.toISOString().slice(0, 10);

  const newBookings = entity.list('Booking').filter(b => b.created_date >= weekISO);
  const newPayments = entity.list('Payment').filter(p => p.created_date >= weekISO);
  const revenue     = newPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const company     = getCompany();

  let sent = 0;
  for (const admin of adminUsers) {
    try {
      await emailService.sendEmail({
        to     : admin.email,
        subject: `📊 Weekly Report — ${company.companyName}`,
        html   : weeklyReportHtml({
          admin_name     : admin.full_name || 'Admin',
          bookings_count : newBookings.length,
          payments_count : newPayments.length,
          total_revenue  : revenue,
          week_start     : weekISO,
          week_end       : now.toISOString().slice(0, 10),
          company,
        }),
      });
      logAction('weekly_report', 'sent', {
        entity_type    : 'System',
        entity_ref     : 'weekly',
        recipient_email: admin.email,
        message        : `Weekly report sent to ${admin.email}`,
      });
      sent++;
    } catch (err) {
      logAction('weekly_report', 'failed', {
        recipient_email: admin.email,
        message        : `Failed: ${err.message}`,
      });
    }
  }
  return { sent };
}

// ── Dispatch helper called by entity routes ───────────────────────────────────

/**
 * Called after a successful entity CREATE.
 * Run asynchronously so it never blocks the HTTP response.
 */
function dispatchCreate(entityName, record) {
  setImmediate(async () => {
    try {
      switch (entityName) {
        case 'Booking': await onBookingCreated(record);  break;
        case 'Invoice': await onInvoiceCreated(record);  break;
        case 'Payment': await onPaymentCreated(record);  break;
      }
    } catch (e) {
      console.error('[Automation] dispatchCreate error:', e.message);
    }
  });
}

/**
 * Called after a successful entity UPDATE.
 * `previous` is the record BEFORE the update.
 */
function dispatchUpdate(entityName, updated, previous) {
  setImmediate(async () => {
    try {
      switch (entityName) {
        case 'Booking': await onBookingUpdated(updated, previous); break;
        case 'Invoice': await onInvoiceUpdated(updated, previous); break;
        case 'Payment': await onPaymentUpdated(updated, previous); break;
        case 'Quote'  : await onQuoteUpdated(updated, previous);   break;
      }
    } catch (e) {
      console.error('[Automation] dispatchUpdate error:', e.message);
    }
  });
}

// ── Stats helper ──────────────────────────────────────────────────────────────

function getStats() {
  const logs  = entity.list('AutomationLog');
  const today = new Date().toISOString().slice(0, 10);
  const week  = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const total    = logs.length;
  const sent     = logs.filter(l => l.status === 'sent').length;
  const failed   = logs.filter(l => l.status === 'failed').length;
  const today_sent = logs.filter(l => l.status === 'sent' && l.created_date?.startsWith(today)).length;
  const week_sent  = logs.filter(l => l.status === 'sent' && l.created_date >= week).length;

  return { total, sent, failed, today_sent, week_sent };
}

// ── Schedulers ────────────────────────────────────────────────────────────────

function startSchedulers() {
  // Hourly: overdue invoices + expired quotes + upcoming trip reminders
  setInterval(() => {
    runOverdueCheck().catch(e => console.error('[Auto] overdue:', e.message));
    runQuoteExpiryCheck().catch(e => console.error('[Auto] expiry:', e.message));
    runUpcomingTripReminder().catch(e => console.error('[Auto] upcoming:', e.message));
  }, 60 * 60 * 1000);

  // Every 6 hours on Monday: weekly report
  setInterval(() => {
    if (new Date().getDay() === 1) {
      runWeeklyReport().catch(e => console.error('[Auto] weekly:', e.message));
    }
  }, 6 * 60 * 60 * 1000);

  // Boot-time check (30 s delay to let server finish starting)
  setTimeout(() => {
    runOverdueCheck().catch(() => {});
    runQuoteExpiryCheck().catch(() => {});
    runUpcomingTripReminder().catch(() => {});
  }, 30000);

  console.log('   ✅ Automation engine started');
}

// ── Cancellation email HTML ───────────────────────────────────────────────────

function cancellationEmailHtml({ booking, company, lang = 'en' }) {
  const fmt = (d) => i18n.fmtDate(d, lang);
  const L = (k, vars) => i18n.t(k, lang, vars);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fef2f2;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hdr{background:linear-gradient(135deg,#dc2626,#b91c1c);padding:40px 32px;text-align:center;color:#fff}
  .hdr h1{margin:0 0 4px;font-size:24px;font-weight:700}
  .hdr p{margin:0;opacity:.85;font-size:13px}
  .body{padding:32px}
  .ref{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px}
  .ref strong{font-size:18px;font-family:monospace;color:#111}
  .detail{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
  .detail:last-child{border-bottom:none}
  .dl{color:#6b7280}
  .dr{font-weight:500;color:#111}
  .note{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:20px 0;font-size:13px;color:#991b1b}
  .ftr{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    ${company.logoUrl ? `<img src="${company.logoUrl}" alt="${company.companyName}" style="height:40px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto">` : ''}
    <h1>${L('email.booking_cancelled.subject', { ref: '' }).replace(/—\s*$/, '').trim() || 'Booking Cancelled'}</h1>
    <p>${company.companyName}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#374151">${booking.client_name ? L('email.greeting', { name: booking.client_name }) : L('email.greeting_fallback')},</p>
    <div class="ref">
      <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${L('email.label.booking_ref')}</div>
      <strong>${booking.booking_ref}</strong>
    </div>
    <div>
      <div class="detail"><span class="dl">${L('email.label.package')}</span><span class="dr">${booking.package_name || '—'}</span></div>
      <div class="detail"><span class="dl">${L('email.label.departure')}</span><span class="dr">${fmt(booking.start_date)}</span></div>
      <div class="detail"><span class="dl">${L('email.label.return')}</span><span class="dr">${fmt(booking.end_date)}</span></div>
      <div class="detail"><span class="dl">${L('email.label.guests')}</span><span class="dr">${booking.num_guests || 1}</span></div>
      <div class="detail"><span class="dl">${L('email.label.total_amount')}</span><span class="dr">${booking.currency || 'USD'} ${Number(booking.total_amount || 0).toLocaleString()}</span></div>
    </div>
    <p style="font-size:14px;color:#374151">— <strong>${company.companyName}</strong></p>
  </div>
  <div class="ftr">${company.companyName} &middot; ${company.companyEmail} &middot; ${company.companyPhone}</div>
</div>
</body></html>`;
}

// ── Upcoming trip reminder HTML ────────────────────────────────────────────────

function upcomingTripHtml({ booking, company, lang = 'en' }) {
  const green = company.accentColor || '#16a34a';
  const fmt = (d) => i18n.fmtDate(d, lang);
  const L = (k, vars) => i18n.t(k, lang, vars);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0fdf4;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hdr{background:linear-gradient(135deg,${green},${green}cc);padding:40px 32px;text-align:center;color:#fff}
  .hdr h1{margin:0 0 4px;font-size:26px;font-weight:700}
  .hdr p{margin:0;opacity:.85;font-size:13px}
  .countdown{font-size:52px;font-weight:800;margin:8px 0;letter-spacing:-1px}
  .body{padding:32px}
  .ref{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px}
  .ref strong{font-size:18px;font-family:monospace;color:#111}
  .detail{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
  .detail:last-child{border-bottom:none}
  .dl{color:#6b7280} .dr{font-weight:500;color:#111}
  .tip{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:20px 0}
  .tip h3{margin:0 0 8px;font-size:13px;color:${green};text-transform:uppercase;letter-spacing:.5px}
  .tip ul{margin:0;padding-left:16px;font-size:13px;color:#374151;line-height:1.8}
  .ftr{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    ${company.logoUrl ? `<img src="${company.logoUrl}" alt="${company.companyName}" style="height:40px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto">` : ''}
    <h1>${L('wa.upcoming.header', { company: company.companyName }).replace(/^\*|\*$/g, '').replace(/\*.*?\*\s*—\s*/, '')}</h1>
    <div class="countdown">7</div>
    <p>${L('wa.upcoming.body', { name: '' }).replace(/^[^,]*,\s*/, '').replace(/\*/g, '')}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#374151">${booking.client_name ? L('email.greeting', { name: booking.client_name }) : L('email.greeting_fallback')},</p>
    <div class="ref">
      <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${L('email.label.booking_ref')}</div>
      <strong>${booking.booking_ref}</strong>
    </div>
    <div>
      <div class="detail"><span class="dl">${L('email.label.package')}</span><span class="dr">${booking.package_name || '—'}</span></div>
      <div class="detail"><span class="dl">${L('email.label.departure')}</span><span class="dr">${fmt(booking.start_date)}</span></div>
      <div class="detail"><span class="dl">${L('email.label.return')}</span><span class="dr">${fmt(booking.end_date)}</span></div>
      <div class="detail"><span class="dl">${L('email.label.guests')}</span><span class="dr">${booking.num_guests || 1}</span></div>
    </div>
    <div class="tip">
      <h3>${L('wa.upcoming.checklist_title').replace(/\*/g, '')}</h3>
      <ul>
        <li>${L('wa.upcoming.chk1')}</li>
        <li>${L('wa.upcoming.chk2')}</li>
        <li>${L('wa.upcoming.chk3')}</li>
        <li>${L('wa.upcoming.chk4')}</li>
        <li>${L('wa.upcoming.chk5')}</li>
      </ul>
    </div>
    <p style="font-size:14px;color:#374151">${L('wa.upcoming.outro')}<br><strong>${company.companyName}</strong></p>
  </div>
  <div class="ftr">${company.companyName} &middot; ${company.companyEmail} &middot; ${company.companyPhone}</div>
</div>
</body></html>`;
}

// ── Weekly report HTML ────────────────────────────────────────────────────────

function weeklyReportHtml({ admin_name, bookings_count, payments_count, total_revenue, week_start, week_end, company }) {
  const green = company.accentColor || '#16a34a';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0fdf4;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hdr{background:linear-gradient(135deg,${green},${green}cc);padding:40px 32px;text-align:center;color:#fff}
  .hdr h1{margin:0 0 4px;font-size:26px;font-weight:700}
  .hdr p{margin:0;opacity:.85;font-size:13px}
  .body{padding:32px}
  .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:24px 0}
  .stat{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center}
  .sv{font-size:28px;font-weight:700;color:${green}}
  .sl{font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
  .ftr{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    ${company.logoUrl ? `<img src="${company.logoUrl}" alt="${company.companyName}" style="height:44px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto">` : ''}
    <h1>📊 Weekly Report</h1>
    <p>${company.companyName} &middot; ${week_start} &rarr; ${week_end}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#374151">Hi ${admin_name},</p>
    <p style="font-size:14px;color:#6b7280">Here&rsquo;s your weekly activity summary for <strong>${company.companyName}</strong>.</p>
    <div class="grid">
      <div class="stat"><div class="sv">${bookings_count}</div><div class="sl">New Bookings</div></div>
      <div class="stat"><div class="sv">${payments_count}</div><div class="sl">Payments</div></div>
      <div class="stat"><div class="sv">$${Number(total_revenue).toLocaleString()}</div><div class="sl">Revenue</div></div>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin-top:24px">
      Log in to your dashboard for full details and analytics.
    </p>
  </div>
  <div class="ftr">${company.companyName} &middot; ${company.companyEmail} &middot; ${company.companyPhone}</div>
</div>
</body></html>`;
}

module.exports = {
  loadConfig,
  saveConfig,
  defaultConfig,
  logAction,
  getStats,
  dispatchCreate,
  dispatchUpdate,
  startSchedulers,
  runOverdueCheck,
  runQuoteExpiryCheck,
  runUpcomingTripReminder,
  runWeeklyReport,
};
