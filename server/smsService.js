/**
 * SMS / WhatsApp Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports two providers:
 *   • Twilio          — SMS + WhatsApp (worldwide)
 *   • Africa's Talking — SMS (Kenya / East Africa, popular for safari ops)
 *
 * Config is persisted to sms-config.json. Uses Node's built-in https so no
 * extra dependency is required.
 */

const path  = require('path');
const fs    = require('fs');
const https = require('https');
const { URL } = require('url');
const i18n  = require('./i18n');

const CONFIG_PATH = path.join(__dirname, 'sms-config.json');

// ── Config ────────────────────────────────────────────────────────────────────

function defaultConfig() {
  return {
    provider: 'twilio',          // 'twilio' | 'africastalking'
    // Twilio
    twilio_account_sid : '',
    twilio_auth_token  : '',
    twilio_from        : '',     // SMS sender number (+1234567890)
    twilio_whatsapp_from: '',    // WhatsApp sender (+1234567890 — use sandbox or approved number)
    // Africa's Talking
    at_username  : '',
    at_api_key   : '',
    at_sender_id : '',           // optional alphanumeric short code
    // Toggles for which channels are enabled at all
    sms_enabled     : false,
    whatsapp_enabled: false,
    // WhatsApp Approved Templates (Twilio Content API).
    // For each event, store the Twilio Content SID (HXxxxxxxxx…). When set,
    // outbound WhatsApp uses the approved template instead of freeform body —
    // required for cold-sends (>24h after last user reply) in production.
    // Variable order per template — tell users what each {{n}} must hold:
    //   booking_received : {{1}}=client, {{2}}=ref, {{3}}=package, {{4}}=date,  {{5}}=guests
    //   booking_confirmed: {{1}}=client, {{2}}=ref, {{3}}=package, {{4}}=start, {{5}}=end
    //   payment_receipt  : {{1}}=client, {{2}}=amount, {{3}}=ref
    //   upcoming_reminder: {{1}}=client, {{2}}=package, {{3}}=start
    wa_templates: {
      booking_received  : '',
      booking_confirmed : '',
      payment_receipt   : '',
      upcoming_reminder : '',
    },
  };
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH))
      return { ...defaultConfig(), ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {}
  return defaultConfig();
}

// Auto-trim every string value (including nested wa_templates) to avoid
// copy-paste whitespace corrupting credentials like Auth Tokens.
function trimStrings(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string')               out[k] = v.trim();
    else if (v && typeof v === 'object')     out[k] = trimStrings(v);
    else                                     out[k] = v;
  }
  return out;
}

function saveConfig(patch) {
  const cleaned = trimStrings(patch);
  const merged = { ...loadConfig(), ...cleaned, last_updated: new Date().toISOString() };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

function isSmsConfigured() {
  const cfg = loadConfig();
  if (!cfg.sms_enabled) return false;
  if (cfg.provider === 'twilio') return !!(cfg.twilio_account_sid && cfg.twilio_auth_token && cfg.twilio_from);
  if (cfg.provider === 'africastalking') return !!(cfg.at_username && cfg.at_api_key);
  return false;
}

function isWhatsAppConfigured() {
  const cfg = loadConfig();
  if (!cfg.whatsapp_enabled) return false;
  // Only Twilio supports WhatsApp here
  return !!(cfg.twilio_account_sid && cfg.twilio_auth_token && cfg.twilio_whatsapp_from);
}

// ── Phone normalisation ──────────────────────────────────────────────────────
// Normalise to E.164 format (+254712345678). Strips spaces, dashes, parens.
function normalisePhone(raw, defaultCountryCode = '254') {
  if (!raw) return '';
  let s = String(raw).trim().replace(/[\s\-()]/g, '');
  if (s.startsWith('+')) return s;
  if (s.startsWith('00')) return '+' + s.slice(2);
  if (s.startsWith('0'))  return '+' + defaultCountryCode + s.slice(1);
  if (/^\d+$/.test(s))    return '+' + s;
  return s;
}

// ── HTTPS helpers ────────────────────────────────────────────────────────────

function httpsRequest({ method, urlStr, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      port    : u.port || 443,
      path    : u.pathname + u.search,
      method  : method,
      headers : {
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Twilio sender ────────────────────────────────────────────────────────────

async function sendViaTwilio({ cfg, to, body, channel, contentSid, contentVariables }) {
  const from = channel === 'whatsapp'
    ? `whatsapp:${cfg.twilio_whatsapp_from}`
    : cfg.twilio_from;
  const dest = channel === 'whatsapp' ? `whatsapp:${to}` : to;

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilio_account_sid}/Messages.json`;
  const auth = Buffer.from(`${cfg.twilio_account_sid}:${cfg.twilio_auth_token}`).toString('base64');

  const params = { To: dest, From: from };
  if (contentSid) {
    // Approved WhatsApp template path — required for outbound first-contact / >24h
    params.ContentSid = contentSid;
    if (contentVariables && Object.keys(contentVariables).length) {
      params.ContentVariables = JSON.stringify(contentVariables);
    }
  } else {
    params.Body = body;
  }
  const form = new URLSearchParams(params).toString();

  const res = await httpsRequest({
    method : 'POST',
    urlStr : url,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type' : 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  if (res.status >= 200 && res.status < 300) {
    return { sid: res.body?.sid, status: res.body?.status, provider: 'twilio' };
  }
  const msg = res.body?.message || JSON.stringify(res.body);
  throw new Error(`Twilio ${res.status}: ${msg}`);
}

// ── Africa's Talking sender ──────────────────────────────────────────────────

async function sendViaAfricasTalking({ cfg, to, body }) {
  const url  = 'https://api.africastalking.com/version1/messaging';
  const params = { username: cfg.at_username, to, message: body };
  if (cfg.at_sender_id) params.from = cfg.at_sender_id;
  const form = new URLSearchParams(params).toString();

  const res = await httpsRequest({
    method : 'POST',
    urlStr : url,
    headers: {
      'apiKey'      : cfg.at_api_key,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept'      : 'application/json',
    },
    body: form,
  });

  if (res.status >= 200 && res.status < 300) {
    const recipients = res.body?.SMSMessageData?.Recipients || [];
    const failed = recipients.find(r => r.status !== 'Success' && r.statusCode !== 101 && r.statusCode !== 102);
    if (failed) throw new Error(`Africa's Talking: ${failed.status}`);
    return { sid: recipients[0]?.messageId, status: 'sent', provider: 'africastalking' };
  }
  throw new Error(`Africa's Talking ${res.status}: ${res.body?.message || JSON.stringify(res.body)}`);
}

// ── Public sender ────────────────────────────────────────────────────────────

async function sendSms({ to, body, config: cfgOverride }) {
  const cfg = cfgOverride || loadConfig();
  const dest = normalisePhone(to);
  if (!dest)  throw new Error('No phone number provided');
  if (!body)  throw new Error('Empty SMS body');

  if (cfg.provider === 'africastalking') {
    if (!cfg.at_username || !cfg.at_api_key) throw new Error('Africa\'s Talking credentials missing');
    return sendViaAfricasTalking({ cfg, to: dest, body });
  }
  // default: twilio
  if (!cfg.twilio_account_sid || !cfg.twilio_auth_token || !cfg.twilio_from)
    throw new Error('Twilio credentials missing');
  return sendViaTwilio({ cfg, to: dest, body, channel: 'sms' });
}

// Hit Twilio's Accounts endpoint to prove the SID+Token are valid without
// actually sending a message. Returns { ok, friendlyName, status } or throws.
async function verifyTwilioCredentials({ accountSid, authToken }) {
  if (!accountSid || !authToken) throw new Error('Account SID and Auth Token are both required');
  const sid   = String(accountSid).trim();
  const token = String(authToken).trim();
  if (!/^AC[a-f0-9]{32}$/i.test(sid)) throw new Error('Account SID should start with "AC" followed by 32 hex chars');
  if (token.length < 20)              throw new Error('Auth Token looks too short (expected 32 hex chars)');

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res  = await httpsRequest({
    method : 'GET',
    urlStr : url,
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
  });
  if (res.status === 200) {
    return { ok: true, friendlyName: res.body?.friendly_name || '', status: res.body?.status || 'active' };
  }
  if (res.status === 401) throw new Error('Twilio rejected the credentials (401). Auth Token is wrong or does not match the SID.');
  if (res.status === 404) throw new Error('Twilio returned 404 for that Account SID — check it was copied completely.');
  if (res.status === 403 && /test account/i.test(JSON.stringify(res.body))) {
    throw new Error('These are Twilio Test Credentials (can only hit magic test numbers). Use your Live Auth Token from Console → API keys & tokens → Live Credentials.');
  }
  throw new Error(`Twilio ${res.status}: ${res.body?.message || JSON.stringify(res.body)}`);
}

async function sendWhatsApp({ to, body, contentSid, contentVariables, config: cfgOverride }) {
  const cfg = cfgOverride || loadConfig();
  const dest = normalisePhone(to);
  if (!dest) throw new Error('No phone number provided');
  if (!contentSid && !body) throw new Error('Empty WhatsApp body (and no template ContentSid)');
  if (!cfg.twilio_account_sid || !cfg.twilio_auth_token || !cfg.twilio_whatsapp_from)
    throw new Error('Twilio WhatsApp credentials missing');
  return sendViaTwilio({ cfg, to: dest, body, channel: 'whatsapp', contentSid, contentVariables });
}

// Build numbered ContentVariables ({"1":"...","2":"..."}) for an event.
// Variable order MUST match what the user defined in their Twilio Content Template.
function buildWaTemplateVars(eventKey, ctx = {}) {
  const fmt = (d) => fmtDateShort(d);
  const money = (n, c) => fmtMoney(n, c);
  const b = ctx.booking  || {};
  const p = ctx.payment  || {};
  switch (eventKey) {
    case 'booking_received': return {
      1: b.client_name || 'Guest',
      2: b.booking_ref || '',
      3: b.package_name || 'your safari',
      4: fmt(b.start_date),
      5: String(b.num_guests || 1),
    };
    case 'booking_confirmed': return {
      1: b.client_name || 'Guest',
      2: b.booking_ref || '',
      3: b.package_name || 'your safari',
      4: fmt(b.start_date),
      5: fmt(b.end_date),
    };
    case 'payment_receipt': return {
      1: p.client_name || b.client_name || 'Guest',
      2: money(p.amount, p.currency || b.currency),
      3: p.payment_ref || '',
    };
    case 'upcoming_reminder': return {
      1: b.client_name || 'Guest',
      2: b.package_name || 'your safari',
      3: fmt(b.start_date),
    };
    default: return {};
  }
}

// ── Message templates ────────────────────────────────────────────────────────
// SMS messages must stay short (single segment ≤ 160 chars). WhatsApp can
// be longer with line breaks.

function fmtMoney(n, currency) {
  const sym = { USD:'$', EUR:'€', GBP:'£', KES:'Ksh', TZS:'TSh', UGX:'USh' };
  const s = sym[currency] || currency || '$';
  const n2 = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${s}${s.endsWith(' ') ? '' : (sym[currency] === '$' || sym[currency] === '€' || sym[currency] === '£') ? '' : ' '}${n2}`;
}

function fmtDateShort(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
  catch { return String(d).slice(0, 10); }
}

const T = {
  bookingReceivedSms({ booking, company, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    return i18n.t('sms.booking_received', lang, {
      company: co,
      ref    : booking.booking_ref,
      pkg    : booking.package_name || 'your safari',
      date   : i18n.fmtDateShort(booking.start_date, lang),
    }).slice(0, 320);
  },
  bookingConfirmedSms({ booking, company, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    return i18n.t('sms.booking_confirmed', lang, {
      company: co,
      ref    : booking.booking_ref,
      start  : i18n.fmtDateShort(booking.start_date, lang),
      end    : i18n.fmtDateShort(booking.end_date, lang),
      guests : booking.num_guests || 1,
    }).slice(0, 320);
  },
  bookingReceivedWa({ booking, company, paymentLink, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    const lines = [
      i18n.t('wa.booking_received.header', lang, { company: co }),
      ``,
      i18n.t('wa.booking_received.body', lang, { name: booking.client_name || 'there' }),
      ``,
      `📋 Ref: *${booking.booking_ref}*`,
      `🗺️ ${booking.package_name || '—'}`,
      `📅 ${i18n.fmtDateShort(booking.start_date, lang)} → ${i18n.fmtDateShort(booking.end_date, lang)}`,
      `👥 ${booking.num_guests || 1} guest(s)`,
      `💵 Total: ${fmtMoney(booking.total_amount, booking.currency)}`,
    ];
    if (paymentLink) lines.push(``, i18n.t('wa.booking_received.pay', lang, { link: paymentLink }));
    lines.push(``, i18n.t('wa.booking_received.outro', lang));
    return lines.join('\n');
  },
  bookingConfirmedWa({ booking, company, paymentLink, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    const balance = Number(booking.total_amount || 0) - Number(booking.amount_paid || 0);
    const lines = [
      i18n.t('wa.booking_confirmed.header', lang, { company: co }),
      ``,
      i18n.t('wa.booking_confirmed.body', lang, { name: booking.client_name || '' }),
      ``,
      `📋 Ref: *${booking.booking_ref}*`,
      `🗺️ ${booking.package_name || '—'}`,
      `📅 ${i18n.fmtDateShort(booking.start_date, lang)} → ${i18n.fmtDateShort(booking.end_date, lang)}`,
      `👥 ${booking.num_guests || 1} guest(s)`,
    ];
    if (balance > 0 && paymentLink) {
      lines.push(``, i18n.t('wa.booking_confirmed.balance', lang, { balance: fmtMoney(balance, booking.currency) }),
        `Pay: ${paymentLink}`);
    }
    lines.push(``, i18n.t('wa.booking_confirmed.outro', lang));
    return lines.join('\n');
  },
  paymentReceiptSms({ payment, company, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    return i18n.t('sms.payment_receipt', lang, {
      company: co,
      amount : fmtMoney(payment.amount, payment.currency),
      ref    : payment.payment_ref,
    }).slice(0, 320);
  },
  paymentReceiptWa({ payment, company, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    const lines = [
      i18n.t('wa.payment_receipt.header', lang, { company: co }),
      ``,
      i18n.t('wa.payment_receipt.body', lang, { name: payment.client_name || '' }),
      ``,
      `💵 Amount: *${fmtMoney(payment.amount, payment.currency)}*`,
      `📋 Ref: ${payment.payment_ref}`,
    ];
    if (payment.booking_ref)    lines.push(`🎟️ Booking: ${payment.booking_ref}`);
    if (payment.invoice_number) lines.push(`📄 Invoice: ${payment.invoice_number}`);
    if (payment.method)         lines.push(`💳 Method: ${payment.method}`);
    return lines.join('\n');
  },
  upcomingTripSms({ booking, company, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    return i18n.t('sms.upcoming_reminder', lang, {
      company: co,
      pkg    : booking.package_name || 'your safari',
      ref    : booking.booking_ref,
      date   : i18n.fmtDateShort(booking.start_date, lang),
    }).slice(0, 320);
  },
  upcomingTripWa({ booking, company, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    return [
      i18n.t('wa.upcoming.header', lang, { company: co }),
      ``,
      i18n.t('wa.upcoming.body', lang, { name: booking.client_name || '' }),
      ``,
      `📋 Ref: ${booking.booking_ref}`,
      `🗺️ ${booking.package_name || '—'}`,
      `📅 ${i18n.t('email.label.departure', lang)}: ${i18n.fmtDateShort(booking.start_date, lang)}`,
      ``,
      i18n.t('wa.upcoming.checklist_title', lang),
      `• ${i18n.t('wa.upcoming.chk1', lang)}`,
      `• ${i18n.t('wa.upcoming.chk2', lang)}`,
      `• ${i18n.t('wa.upcoming.chk3', lang)}`,
      `• ${i18n.t('wa.upcoming.chk4', lang)}`,
      `• ${i18n.t('wa.upcoming.chk5', lang)}`,
      ``,
      i18n.t('wa.upcoming.outro', lang),
    ].join('\n');
  },
  overdueSms({ invoice, balance, company, lang = 'en' }) {
    const co = company.companyName || 'Reservation Safari';
    return i18n.t('sms.overdue', lang, {
      company: co,
      ref    : invoice.invoice_number,
      balance: fmtMoney(balance, invoice.currency),
    }).slice(0, 320);
  },
};

module.exports = {
  loadConfig, saveConfig, defaultConfig,
  sendSms, sendWhatsApp,
  isSmsConfigured, isWhatsAppConfigured,
  normalisePhone,
  templates: T,
  buildWaTemplateVars,
  verifyTwilioCredentials,
};
