const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const i18n = require('./i18n');

const CONFIG_PATH = path.join(__dirname, 'email-config.json');

// ── Logo embedded as base64 ──────────────────────────────────────────────────
const LOGO_PATH = path.join(__dirname, '..', 'public', 'rs-logo-full.png');
let LOGO_B64 = '';
try { LOGO_B64 = 'data:image/png;base64,' + fs.readFileSync(LOGO_PATH).toString('base64'); } catch {}

function loadConfig() {
  try { if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
  return null;
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); }

function createTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host, port: Number(cfg.port) || 587,
    secure: Number(cfg.port) === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: false },
  });
}

async function sendEmail({ to, subject, html, config: cfgOverride }) {
  const cfg = cfgOverride || loadConfig();
  if (!cfg || !cfg.host || !cfg.user || !cfg.pass)
    throw new Error('Email not configured. Go to Settings → Email/SMTP to set up.');
  const t = createTransporter(cfg);
  await t.sendMail({ from: `"${cfg.sender_name || 'Reservation Safari'}" <${cfg.user}>`, to, subject, html });
}

// ── Formatting ────────────────────────────────────────────────────────────────
function fmt(n, currency) {
  const sym = { USD:'$',EUR:'€',GBP:'£',KES:'Ksh ',TZS:'TSh ',UGX:'USh ',ZAR:'R ',AUD:'A$',CAD:'C$' };
  const s = sym[currency] || (currency ? currency + ' ' : '$');
  return s + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }); }
  catch { return String(d); }
}
function splitList(str) {
  if (!str) return [];
  return str.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

// ── Design tokens — Apple-green palette ──────────────────────────────────────
const G      = '#16a34a';   // primary green
const G_DK   = '#14532d';   // dark green text
const G_LT   = '#dcfce7';   // light green bg
const G_XLT  = '#f0fdf4';   // near-white green
const G_BDR  = '#86efac';   // green border
const WHITE  = '#ffffff';
const GRAY1  = '#f8fafc';
const GRAY2  = '#e2e8f0';
const GRAY3  = '#64748b';
const GRAY4  = '#334155';
const INK    = '#0f172a';   // near-black

// ── Logo block — always on WHITE background so it's always visible ────────────
// Prefer the HTTP logo_url from settings (email clients block data: URIs).
// Fall back to embedded base64 only if no HTTP URL is configured, then plain text.
function logoBlock(companyName, logoUrl) {
  if (logoUrl && /^https?:\/\//.test(logoUrl)) {
    return `<img src="${logoUrl}" alt="${companyName}" style="height:44px;width:auto;display:block;max-width:200px">`;
  }
  if (LOGO_B64) {
    return `<img src="${LOGO_B64}" alt="${companyName}" style="height:44px;width:auto;display:block;max-width:200px">`;
  }
  return `<span style="font-size:20px;font-weight:800;color:${G_DK};font-family:Georgia,serif">${companyName}</span>`;
}

// ── Top header: white logo area + green band with doc type ────────────────────
function docHeader(companyName, docType, docRef, meta, logoUrl) {
  const logo = logoBlock(companyName, logoUrl);
  const metaHtml = meta ? meta.map(m => `<div style="font-size:11px;color:rgba(255,255,255,0.8);line-height:2">${m}</div>`).join('') : '';
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:3px solid ${G}">
    <tr>
      <td style="background:${WHITE};padding:18px 36px;vertical-align:middle">
        ${logo}
      </td>
      <td style="background:${G};padding:18px 36px;text-align:right;vertical-align:middle">
        <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,0.85);margin-bottom:4px">${docType}</div>
        <div style="font-size:16px;font-weight:800;color:${WHITE};font-family:monospace">${docRef || '—'}</div>
        ${metaHtml}
      </td>
    </tr>
  </table>`;
}

// ── Section heading ────────────────────────────────────────────────────────────
function sec(label) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;margin-top:4px">
    <tr><td style="padding-bottom:8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${G};border-bottom:2px solid ${G}">${label}</td></tr>
  </table>`;
}

// ── Key-value info strip ───────────────────────────────────────────────────────
function infoStrip(cells) {
  // cells = [{label, value}, ...]
  const tds = cells.filter(c => c.value).map((c, i) => `
    <td style="padding:14px 20px;vertical-align:top;${i > 0 ? `border-left:1px solid ${G_BDR}` : ''}">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${G};margin-bottom:4px">${c.label}</div>
      <div style="font-size:13px;font-weight:700;color:${INK}">${c.value}</div>
      ${c.sub ? `<div style="font-size:11px;color:${GRAY3};margin-top:2px">${c.sub}</div>` : ''}
    </td>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${G_LT};border-bottom:1px solid ${G_BDR}"><tr>${tds}</tr></table>`;
}

// ── Green info bar (dark green, white text — for quote tour details) ───────────
function infoBar(items) {
  const tds = items.map((it, i) => `
    <td style="padding:10px 14px;vertical-align:top;${i < items.length-1 ? `border-right:1px solid rgba(255,255,255,0.2)` : ''}">
      <div style="font-size:9px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">${it.label}</div>
      <div style="font-size:12px;font-weight:700;color:${WHITE}">${it.value || '—'}</div>
    </td>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#15803d"><tr>${tds}</tr></table>`;
}

// ── Outer wrapper ─────────────────────────────────────────────────────────────
function wrap(body, companyName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e8f5e9;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f5e9;padding:28px 0">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${WHITE};border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(22,163,74,0.15)">
  <tr><td>${body}</td></tr>
  <tr><td style="background:${G_XLT};border-top:2px solid ${G_BDR};padding:14px 36px;text-align:center">
    <p style="margin:0;font-size:11px;color:${GRAY3}">${companyName || 'Reservation Safari'} &nbsp;&bull;&nbsp; ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE EMAIL
// ═══════════════════════════════════════════════════════════════════════════════
function invoiceEmailHtml(data) {
  const { invoice_number, client_name, client_email, total, amount_paid=0,
    subtotal, discount, tax, due_date, created_date, booking_ref,
    notes, items=[], currency='USD', status, payment_link, company } = data;
  const balance = Number(total||0) - Number(amount_paid||0);
  const co = (company && company.companyName) || 'Reservation Safari';

  let itemRows = '';
  (items||[]).forEach((it,i) => {
    itemRows += `<tr style="background:${i%2===0?WHITE:G_XLT}">
      <td style="padding:10px 14px;border-bottom:1px solid ${GRAY2};font-size:13px;color:${GRAY4}">${it.description||'—'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid ${GRAY2};font-size:13px;text-align:center;color:${GRAY3}">${it.qty||1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid ${GRAY2};font-size:13px;text-align:right;color:${GRAY3}">${fmt(it.unit_price,currency)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid ${GRAY2};font-size:13px;text-align:right;font-weight:700;color:${G_DK}">${fmt(it.total,currency)}</td>
    </tr>`;
  });

  const payBtn = (payment_link && balance > 0) ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr><td align="center">
        <a href="${payment_link}" style="display:inline-block;background:${G};color:${WHITE};text-decoration:none;padding:15px 48px;font-size:15px;font-weight:700;border-radius:6px">
          Pay Now &mdash; ${fmt(balance,currency)}
        </a>
      </td></tr>
    </table>` : '';

  const body = `
    ${docHeader(co, 'Invoice', invoice_number, [`Date: ${fmtDate(created_date)}`, `Due: ${fmtDate(due_date)}`], company && company.logoUrl)}
    ${infoStrip([
      {label:'Bill To', value:client_name||'—', sub:client_email||''},
      {label:'Booking Ref', value:booking_ref||'—'},
      {label:'Status', value:status||''},
    ])}
    <div style="padding:28px 36px">
      ${items&&items.length ? `
      ${sec('Services & Items')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY2};border-radius:6px;overflow:hidden;margin-bottom:24px">
        <thead><tr style="background:${G}">
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:${WHITE};text-align:left;letter-spacing:.5px">DESCRIPTION</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:${WHITE};text-align:center;width:50px">QTY</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:${WHITE};text-align:right;width:120px">UNIT PRICE</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:${WHITE};text-align:right;width:120px">TOTAL</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td></td><td style="width:260px">
          ${subtotal>0?`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:${GRAY3};border-bottom:1px solid ${GRAY2}"><span>Subtotal</span><span>${fmt(subtotal,currency)}</span></div>`:''}
          ${discount>0?`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#dc2626;border-bottom:1px solid ${GRAY2}"><span>Discount</span><span>&minus;${fmt(discount,currency)}</span></div>`:''}
          ${tax>0?`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:${GRAY3};border-bottom:1px solid ${GRAY2}"><span>Tax/Fees</span><span>${fmt(tax,currency)}</span></div>`:''}
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${G};margin-top:4px">
            <tr><td style="padding:10px 0;font-size:16px;font-weight:800;color:${INK}">Total</td>
                <td style="padding:10px 0;font-size:16px;font-weight:800;color:${INK};text-align:right">${fmt(total,currency)}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:${G}">Amount Paid</td>
                <td style="padding:4px 0;font-size:13px;color:${G};text-align:right">${fmt(amount_paid,currency)}</td></tr>
            <tr style="border-top:1px solid ${GRAY2}">
                <td style="padding:8px 0;font-size:15px;font-weight:800;color:#dc2626">Balance Due</td>
                <td style="padding:8px 0;font-size:15px;font-weight:800;color:#dc2626;text-align:right">${fmt(balance,currency)}</td></tr>
          </table>
        </td></tr>
      </table>
      ${payBtn}
      ${notes?`<div style="margin-top:20px;background:${G_XLT};border-left:4px solid ${G};padding:14px 16px;border-radius:0 6px 6px 0"><div style="font-size:10px;font-weight:700;color:${G};text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Notes</div><p style="font-size:13px;color:${GRAY4};margin:0;line-height:1.6">${notes}</p></div>`:''}
    </div>`;
  return wrap(body, co);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTE EMAIL  —  mirrors DocumentViewer QuoteDocument exactly
// ═══════════════════════════════════════════════════════════════════════════════
function quoteEmailHtml(data) {
  const {
    quote_number, client_name, client_email, total,
    valid_until, created_date, package_name, highlights,
    start_date, end_date, num_guests,
    inclusions, exclusions, items=[],
    itinerary_days, currency='USD',
    payment_terms, subtotal, discount, tax,
    notes, company_about, company_contact,
    cover_image_url, map_image_url,
    payment_link, company,
  } = data;

  const co = (company && company.companyName) || 'Reservation Safari';

  // Parse arrays
  let days = [];
  try { days = Array.isArray(itinerary_days) ? itinerary_days : JSON.parse(itinerary_days||'[]'); } catch {}
  let parsedItems = [];
  try { parsedItems = Array.isArray(items) ? items : JSON.parse(items||'[]'); } catch { parsedItems = items||[]; }
  const inclList = splitList(inclusions);
  const exclList = splitList(exclusions);
  let contact = {};
  try { contact = typeof company_contact==='string' ? JSON.parse(company_contact||'{}') : (company_contact||{}); } catch {}

  const guests = parsedItems.reduce((s,i)=>s+(Number(i.qty)||0),0) || num_guests || 1;
  const durDays = days.length;
  const durNights = Math.max(0, durDays-1);

  const ptLabel = {
    '50/50':'50% deposit on booking confirmation, 50% balance 7 days prior to departure',
    '30/70':'30% deposit on booking confirmation, 70% balance 14 days prior to departure',
    'full':'Full payment required at time of booking',
    'flexible':'Flexible payment plan — contact us to discuss options',
  }[payment_terms] || payment_terms || '';

  // ── Accept button ──
  const acceptBtn = payment_link ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
      <tr><td align="center">
        <a href="${payment_link}" style="display:inline-block;background:${G};color:${WHITE};text-decoration:none;padding:16px 52px;font-size:15px;font-weight:700;border-radius:6px">
          Accept Quote &amp; Pay Deposit
        </a>
        <div style="font-size:12px;color:${GRAY3};margin-top:8px">Valid until ${fmtDate(valid_until)}</div>
      </td></tr>
    </table>` : '';

  // ── Cover image ──
  const cover = cover_image_url ? `
    <div style="position:relative;height:200px;overflow:hidden;background:#000">
      <img src="${cover_image_url}" alt="Safari" style="width:100%;height:200px;object-fit:cover;display:block;opacity:0.75">
    </div>` : '';

  // ── Header ──
  const header = docHeader(co, 'Safari Quotation', quote_number, [
    `Issued: ${fmtDate(created_date)}`,
    `Valid until: ${fmtDate(valid_until)}`,
  ], company && company.logoUrl);

  // ── Info bar (tour stats) ──
  const bar = (durDays>0 || guests) ? infoBar([
    {label:'Tour Type',  value:'Private Tour'},
    {label:'Duration',   value: durDays>0 ? `${durDays} Days / ${durNights} Nights` : '—'},
    {label:'Travelers',  value: `${guests} Adult${guests!==1?'s':''}`},
    {label:'Departure',  value: fmtDate(start_date)},
    {label:'Return',     value: fmtDate(end_date)},
  ]) : '';

  // ── Client / trip strip ──
  const clientStrip = infoStrip([
    {label:'Prepared For', value:client_name||'—', sub:client_email||''},
    ...(package_name ? [{label:'Package', value:package_name, sub:highlights||''}] : []),
    ...(start_date   ? [{label:'Travel Dates', value:fmtDate(start_date), sub:`to ${fmtDate(end_date)}`}] : []),
  ]);

  // ── Company intro ──
  const aboutSection = company_about ? `
    <div style="margin-bottom:28px;border-left:4px solid ${G};padding-left:16px">
      <p style="font-size:13px;color:${GRAY4};line-height:1.9;margin:0">${company_about}</p>
    </div>` : '';

  // ── Highlights ──
  const highlightsSection = highlights ? `
    <div style="margin-bottom:28px">
      ${sec('Tour Highlights')}
      <div style="background:${G_XLT};border:1px solid ${G_BDR};border-radius:6px;padding:14px 18px">
        <p style="font-size:13px;color:${GRAY4};margin:0;line-height:1.8">${highlights}</p>
      </div>
    </div>` : '';

  // ── Map image ──
  const mapSection = map_image_url ? `
    <div style="margin-bottom:28px">
      ${sec('Route Map')}
      <img src="${map_image_url}" alt="Route Map" style="width:100%;max-height:240px;object-fit:cover;display:block;border:1px solid ${GRAY2};border-radius:6px">
    </div>` : '';

  // ── Itinerary overview table ──
  let itinOverview = '';
  if (days.length>0) {
    const rows = days.map((day,i) => `<tr style="background:${i%2===0?WHITE:G_XLT}">
      <td style="padding:9px 12px;border-bottom:1px solid ${GRAY2};font-weight:700;font-size:12px;color:${G_DK};white-space:nowrap">Day ${day.day||i+1}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${GRAY2};font-size:13px;font-weight:600;color:${INK}">${day.title||day.location||'—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${GRAY2};font-size:12px;color:${GRAY3}">${day.location||'—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${GRAY2};font-size:12px;color:${GRAY3}">${day.accommodation||'—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${GRAY2};font-size:12px;color:${GRAY3}">${day.meals||'—'}</td>
    </tr>`).join('');
    itinOverview = `
      <div style="margin-bottom:28px">
        ${sec('Itinerary Overview')}
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY2};border-radius:6px;overflow:hidden">
          <thead><tr style="background:${G}">
            <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:${WHITE};letter-spacing:.5px;white-space:nowrap">DAY</th>
            <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:${WHITE};letter-spacing:.5px">TITLE</th>
            <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:${WHITE};letter-spacing:.5px">DESTINATION</th>
            <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:${WHITE};letter-spacing:.5px">ACCOMMODATION</th>
            <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:${WHITE};letter-spacing:.5px">MEALS</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ── Day-by-day programme (full detail) ──
  let dayByDay = '';
  if (days.length>0) {
    const progRows = days.map((day,i) => {
      const acts = Array.isArray(day.activities) ? day.activities : [];
      const actRows = acts.map(a => {
        const txt = typeof a==='string' ? a : (a.title||a.name||a.description||a.notes||'');
        if (!txt) return '';
        return `<tr>
          <td style="width:14px;padding:3px 0;vertical-align:top">
            <div style="width:7px;height:7px;background:${G};border-radius:50%;margin-top:4px"></div>
          </td>
          <td style="padding:3px 0 3px 8px;font-size:12px;color:${GRAY4};line-height:1.5">${txt}</td>
        </tr>`;
      }).filter(Boolean).join('');

      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:3px;border-radius:4px;overflow:hidden">
        <tr>
          <td style="width:44px;min-width:44px;background:${G};color:${WHITE};text-align:center;vertical-align:top;padding:14px 4px">
            <div style="font-size:9px;opacity:0.8;text-transform:uppercase;letter-spacing:1px">Day</div>
            <div style="font-size:18px;font-weight:800;line-height:1.2">${day.day||i+1}</div>
          </td>
          <td style="border:1px solid ${GRAY2};border-left:none;padding:12px 16px;vertical-align:top;background:${WHITE}">
            <div style="font-weight:800;font-size:14px;color:${INK};margin-bottom:2px">${day.title||`Day ${i+1}`}</div>
            ${day.location?`<div style="font-size:12px;color:${G};font-weight:600;margin-bottom:6px">&bull; ${day.location}</div>`:''}
            ${day.description?`<p style="font-size:13px;color:${GRAY4};line-height:1.7;margin:0 0 8px">${day.description}</p>`:''}
            ${actRows?`<div style="margin-bottom:8px">
              <div style="font-size:10px;font-weight:700;color:${G};text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Activities</div>
              <table cellpadding="0" cellspacing="0">${actRows}</table>
            </div>`:''}
            ${day.notes?`<p style="font-size:12px;color:${GRAY3};margin:0 0 8px;line-height:1.6;border-left:3px solid ${G_BDR};padding-left:8px">${day.notes}</p>`:''}
            <div style="margin-top:8px">
              ${day.accommodation?`<span style="display:inline-block;background:${G_LT};border:1px solid ${G_BDR};padding:3px 10px;font-size:11px;color:${G_DK};border-radius:20px;margin-right:6px;font-weight:600">&#127968; ${day.accommodation}</span>`:''}
              ${day.meals?`<span style="display:inline-block;background:${G_LT};border:1px solid ${G_BDR};padding:3px 10px;font-size:11px;color:${G_DK};border-radius:20px;font-weight:600">&#127869; ${day.meals}</span>`:''}
            </div>
          </td>
        </tr>
      </table>`;
    }).join('');
    dayByDay = `
      <div style="margin-bottom:28px">
        ${sec('Day-by-Day Programme')}
        ${progRows}
      </div>`;
  }

  // ── Inclusions & Exclusions ──
  let inclExcl = '';
  if (inclList.length>0 || exclList.length>0) {
    const iRows = inclList.map(item=>`<tr>
      <td style="width:20px;padding:4px 0;vertical-align:top">
        <div style="width:16px;height:16px;background:${G};border-radius:50%;text-align:center;line-height:16px;font-size:10px;color:${WHITE};font-weight:700">&#10003;</div>
      </td>
      <td style="padding:4px 0 4px 8px;font-size:12px;color:${GRAY4};line-height:1.5">${item}</td>
    </tr>`).join('');
    const eRows = exclList.map(item=>`<tr>
      <td style="width:20px;padding:4px 0;vertical-align:top">
        <div style="width:16px;height:16px;background:#fee2e2;border:1px solid #fca5a5;border-radius:50%;text-align:center;line-height:14px;font-size:13px;color:#dc2626;font-weight:700">&times;</div>
      </td>
      <td style="padding:4px 0 4px 8px;font-size:12px;color:${GRAY4};line-height:1.5">${item}</td>
    </tr>`).join('');

    inclExcl = `
      <div style="margin-bottom:28px">
        ${sec('Inclusions &amp; Exclusions')}
        <table width="100%" cellpadding="0" cellspacing="0"><tr valign="top">
          ${inclList.length>0?`<td style="width:50%;padding-right:8px;vertical-align:top">
            <div style="border:1px solid ${G_BDR};border-radius:6px;overflow:hidden">
              <div style="background:${G};color:${WHITE};padding:9px 14px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase">&#10003; Included</div>
              <div style="padding:12px 14px;background:${WHITE}"><table cellpadding="0" cellspacing="0">${iRows}</table></div>
            </div>
          </td>`:''}
          ${exclList.length>0?`<td style="width:50%;padding-left:8px;vertical-align:top">
            <div style="border:1px solid #fca5a5;border-radius:6px;overflow:hidden">
              <div style="background:#fee2e2;color:#991b1b;padding:9px 14px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase">&times; Not Included</div>
              <div style="padding:12px 14px;background:${WHITE}"><table cellpadding="0" cellspacing="0">${eRows}</table></div>
            </div>
          </td>`:''}
        </tr></table>
      </div>`;
  }

  // ── Pricing ──
  let priceRows = '';
  parsedItems.forEach((it,i) => {
    priceRows += `<tr style="background:${i%2===0?WHITE:G_XLT}">
      <td style="padding:10px 12px;border-bottom:1px solid ${GRAY2};font-size:13px;color:${GRAY4}">${it.description||'—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${GRAY2};font-size:13px;text-align:center;color:${GRAY3}">${it.qty||1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${GRAY2};font-size:13px;text-align:right;color:${GRAY3}">${fmt(it.unit_price,currency)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${GRAY2};font-size:13px;text-align:right;font-weight:700;color:${G_DK}">${fmt(it.total,currency)}</td>
    </tr>`;
  });

  const pricing = `
    <div style="margin-bottom:28px">
      ${sec('Pricing')}
      ${parsedItems.length>0?`
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY2};border-radius:6px;overflow:hidden;margin-bottom:12px">
        <thead><tr style="background:${G}">
          <th style="padding:9px 12px;font-size:10px;font-weight:600;color:${WHITE};text-align:left;letter-spacing:.5px">DESCRIPTION</th>
          <th style="padding:9px 12px;font-size:10px;font-weight:600;color:${WHITE};text-align:center;width:50px">QTY</th>
          <th style="padding:9px 12px;font-size:10px;font-weight:600;color:${WHITE};text-align:right;width:110px">UNIT PRICE</th>
          <th style="padding:9px 12px;font-size:10px;font-weight:600;color:${WHITE};text-align:right;width:110px">TOTAL</th>
        </tr></thead>
        <tbody>${priceRows}</tbody>
      </table>`:''}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td></td><td style="width:260px">
          ${subtotal>0?`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:${GRAY3};border-bottom:1px solid ${GRAY2}"><span>Subtotal</span><span>${fmt(subtotal,currency)}</span></div>`:''}
          ${discount>0?`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#dc2626;border-bottom:1px solid ${GRAY2}"><span>Discount</span><span>&minus;${fmt(discount,currency)}</span></div>`:''}
          ${tax>0?`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:${GRAY3};border-bottom:1px solid ${GRAY2}"><span>Tax/Fees</span><span>${fmt(tax,currency)}</span></div>`:''}
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${G};margin-top:4px">
            <tr><td style="padding:10px 0;font-size:16px;font-weight:800;color:${INK}">Total ${currency}</td>
                <td style="padding:10px 0;font-size:16px;font-weight:800;color:${INK};text-align:right">${fmt(total,currency)}</td></tr>
            ${parsedItems[0]?.unit_price?`<tr><td style="padding:3px 0;font-size:12px;color:${GRAY3}">Per person</td>
                <td style="padding:3px 0;font-size:12px;color:${GRAY3};text-align:right">${fmt(parsedItems[0].unit_price,currency)}</td></tr>`:''}
          </table>
          ${ptLabel?`<div style="margin-top:12px;background:${G_XLT};border-left:4px solid ${G};padding:10px 12px;border-radius:0 6px 6px 0;font-size:12px;color:${G_DK}"><strong>Payment Terms:</strong> ${ptLabel}</div>`:''}
        </td></tr>
      </table>
    </div>`;

  // ── Notes ──
  const notesSection = notes ? `
    <div style="margin-bottom:28px;background:${G_XLT};border:1px solid ${G_BDR};border-radius:6px;padding:16px 18px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;color:${G}">Terms &amp; Conditions</div>
      <p style="font-size:13px;color:${GRAY4};line-height:1.8;margin:0">${notes}</p>
    </div>` : '';

  // ── Contact footer ──
  const anyContact = contact.email||contact.phone||contact.website||company?.companyEmail||company?.companyPhone;
  const contactSection = anyContact ? `
    <div style="border-top:2px solid ${G_BDR};padding-top:16px;margin-top:8px">
      <div style="font-size:9px;font-weight:700;color:${G};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Contact Us</div>
      <table cellpadding="0" cellspacing="0">
        ${(contact.email||company?.companyEmail)?`<tr><td style="padding:3px 12px 3px 0;font-size:13px;color:${GRAY3}">Email:</td><td style="font-size:13px;color:${GRAY4}">${contact.email||company.companyEmail}</td></tr>`:''}
        ${(contact.phone||company?.companyPhone)?`<tr><td style="padding:3px 12px 3px 0;font-size:13px;color:${GRAY3}">Phone:</td><td style="font-size:13px;color:${GRAY4}">${contact.phone||company.companyPhone}</td></tr>`:''}
        ${contact.website?`<tr><td style="padding:3px 12px 3px 0;font-size:13px;color:${GRAY3}">Web:</td><td style="font-size:13px;color:${GRAY4}">${contact.website}</td></tr>`:''}
        ${company?.companyAddress?`<tr><td style="padding:3px 12px 3px 0;font-size:13px;color:${GRAY3}">Address:</td><td style="font-size:13px;color:${GRAY4}">${company.companyAddress}</td></tr>`:''}
      </table>
    </div>` : '';

  const body = `
    ${cover}
    ${header}
    ${bar}
    ${clientStrip}
    <div style="padding:28px 36px">
      ${aboutSection}
      ${highlightsSection}
      ${mapSection}
      ${itinOverview}
      ${dayByDay}
      ${acceptBtn}
      ${inclExcl}
      ${pricing}
      ${notesSection}
      ${contactSection}
    </div>`;

  return wrap(body, co);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════
function bookingConfirmationEmailHtml(data) {
  const { booking_ref, client_name, client_email, package_name,
    start_date, end_date, num_guests, total_amount,
    currency='USD', amount_paid=0, booking_source,
    special_requests, payment_link, company,
    lang = 'en', variant = 'confirmed' } = data;
  const balance = Number(total_amount||0) - Number(amount_paid||0);
  const co = (company&&company.companyName)||'Reservation Safari';
  const L = (k, vars) => i18n.t(k, lang, vars);
  const fmtD = (d) => i18n.fmtDate(d, lang);

  const heroTitle = variant === 'received'
    ? L('email.booking_received.title')
    : L('email.booking_confirmed.title');
  const heroSub = variant === 'received' ? '' : L('email.booking_confirmed.sub');
  const docTypeLabel = variant === 'received' ? L('email.booking_received.title') : L('email.booking_confirmed.title');

  const payBtn = (payment_link&&balance>0) ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr><td align="center">
        <a href="${payment_link}" style="display:inline-block;background:${G};color:${WHITE};text-decoration:none;padding:15px 48px;font-size:15px;font-weight:700;border-radius:6px">
          ${L('email.cta.pay_balance')} &mdash; ${fmt(balance,currency)}
        </a>
      </td></tr>
    </table>` : '';

  const body = `
    ${docHeader(co, docTypeLabel, booking_ref, [], company && company.logoUrl)}
    <div style="background:${G_LT};border-bottom:2px solid ${G_BDR};padding:24px 36px;text-align:center">
      <div style="width:52px;height:52px;background:${G};border-radius:50%;margin:0 auto 10px;display:table-cell;vertical-align:middle;text-align:center;font-size:24px;color:${WHITE};line-height:52px">&#10003;</div>
      <div style="font-size:20px;font-weight:800;color:${G_DK}">${heroTitle}</div>
      ${heroSub ? `<div style="font-size:13px;color:${GRAY3};margin-top:6px">${heroSub}</div>` : ''}
    </div>
    <div style="padding:28px 36px">
      <p style="font-size:15px;color:${GRAY4};margin:0 0 24px">${client_name ? L('email.greeting', { name: client_name }) : L('email.greeting_fallback')},</p>
      ${sec(L('email.label.booking_summary'))}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY2};border-radius:6px;overflow:hidden;margin-bottom:24px">
        <tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2};width:38%">${L('email.label.booking_ref')}</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:800;color:${G_DK};font-family:monospace;border-bottom:1px solid ${GRAY2}">${booking_ref||'—'}</td></tr>
        <tr><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.package')}</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:600;color:${INK};border-bottom:1px solid ${GRAY2}">${package_name||'—'}</td></tr>
        <tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.departure')}</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK};border-bottom:1px solid ${GRAY2}">${fmtD(start_date)}</td></tr>
        <tr><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.return')}</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK};border-bottom:1px solid ${GRAY2}">${fmtD(end_date)}</td></tr>
        <tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.guests')}</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK};border-bottom:1px solid ${GRAY2}">${num_guests||1}</td></tr>
        ${booking_source?`<tr><td style="padding:10px 16px;font-size:12px;color:${GRAY3}">Booking Source</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK}">${booking_source}</td></tr>`:''}
      </table>
      ${sec(L('email.label.payment_summary'))}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY2};border-radius:6px;overflow:hidden;margin-bottom:24px">
        <tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2};width:38%">${L('email.label.total_amount')}</td>
            <td style="padding:10px 16px;font-size:14px;font-weight:700;color:${INK};border-bottom:1px solid ${GRAY2}">${fmt(total_amount,currency)}</td></tr>
        ${amount_paid>0?`<tr><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.amount_paid')}</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:600;color:${G};border-bottom:1px solid ${GRAY2}">${fmt(amount_paid,currency)}</td></tr>`:''}
        <tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3}">${L('email.label.balance_due')}</td>
            <td style="padding:10px 16px;font-size:15px;font-weight:800;color:${balance>0?'#dc2626':G}">${balance>0?fmt(balance,currency):L('email.label.fully_paid')}</td></tr>
      </table>
      ${payBtn}
      ${special_requests?`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;font-size:13px;color:#92400e;margin-bottom:20px"><strong>${L('email.label.special_requests')}:</strong> ${special_requests}</div>`:''}
      <div style="background:${G_XLT};border:1px solid ${G_BDR};border-radius:6px;padding:16px;font-size:13px;color:${G_DK}">
        <strong>${L('email.next_steps_title')}</strong><br>
        <span style="color:${GRAY3}">${L('email.next_steps_body')}</span>
      </div>
    </div>`;
  return wrap(body, co);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT RECEIPT
// ═══════════════════════════════════════════════════════════════════════════════
function paymentReceiptEmailHtml(data) {
  const { payment_ref, client_name, client_email, amount, currency='USD',
    payment_date, method, invoice_number, booking_ref, notes, company,
    lang = 'en' } = data;
  const co = (company&&company.companyName)||'Reservation Safari';
  const mLabel = {bank_transfer:'Bank Transfer',credit_card:'Credit / Debit Card',cash:'Cash',mobile_money:'Mobile Money',paypal:'PayPal',other:'Other'};
  const L = (k, vars) => i18n.t(k, lang, vars);
  const fmtD = (d) => i18n.fmtDate(d, lang);

  const body = `
    ${docHeader(co, L('email.payment_receipt.subject', { ref: '' }).replace(/—\s*$/, '').trim(), payment_ref, [`${L('email.label.payment_date')}: ${fmtD(payment_date)}`], company && company.logoUrl)}
    <div style="background:${G_LT};border-bottom:2px solid ${G_BDR};padding:28px 36px;text-align:center">
      <div style="font-size:11px;color:${G};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${L('email.payment_received.title')}</div>
      <div style="font-size:44px;font-weight:800;color:${G_DK};line-height:1">${fmt(amount,currency)}</div>
      <div style="font-size:12px;color:${GRAY3};margin-top:8px">${fmtD(payment_date)}</div>
    </div>
    <div style="padding:28px 36px">
      <p style="font-size:15px;color:${GRAY4};margin:0 0 24px">${client_name ? L('email.greeting', { name: client_name }) : L('email.greeting_fallback')}, ${L('email.payment_thanks')}</p>
      ${sec(L('email.label.receipt_details'))}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY2};border-radius:6px;overflow:hidden">
        <tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2};width:38%">${L('email.label.payment_ref')}</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:700;font-family:monospace;color:${INK};border-bottom:1px solid ${GRAY2}">${payment_ref||'—'}</td></tr>
        ${invoice_number?`<tr><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.invoice_number')}</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK};border-bottom:1px solid ${GRAY2}">${invoice_number}</td></tr>`:''}
        ${booking_ref?`<tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.booking_ref')}</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK};border-bottom:1px solid ${GRAY2}">${booking_ref}</td></tr>`:''}
        <tr><td style="padding:10px 16px;font-size:12px;color:${GRAY3};border-bottom:1px solid ${GRAY2}">${L('email.label.payment_date')}</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK};border-bottom:1px solid ${GRAY2}">${fmtD(payment_date)}</td></tr>
        <tr style="background:${G_XLT}"><td style="padding:10px 16px;font-size:12px;color:${GRAY3}">${L('email.label.method')}</td>
            <td style="padding:10px 16px;font-size:13px;color:${INK}">${mLabel[method]||method||'—'}</td></tr>
      </table>
      ${notes?`<div style="margin-top:16px;background:${G_XLT};border-left:4px solid ${G};padding:12px 14px;border-radius:0 6px 6px 0;font-size:13px;color:${GRAY4}"><strong>${L('email.label.notes')}:</strong> ${notes}</div>`:''}
    </div>`;
  return wrap(body, co);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVITE EMAIL
// ═══════════════════════════════════════════════════════════════════════════════
function inviteEmailHtml(data) {
  const { email, full_name, role, temp_password, company } = data;
  const co = (company&&company.companyName)||'Reservation Safari';
  const rColors = {admin:'#dc2626',agent:'#7c3aed',guide:'#0891b2',driver:'#d97706',user:G,client:G};
  const rc = rColors[role]||GRAY4;

  const body = `
    ${docHeader(co, 'You\'re Invited', '', [], company && company.logoUrl)}
    <div style="padding:36px 36px">
      <p style="font-size:16px;color:${GRAY4};margin:0 0 8px">Hello <strong style="color:${INK}">${full_name||email}</strong>,</p>
      <p style="font-size:14px;color:${GRAY3};margin:0 0 28px;line-height:1.7">You have been invited to join <strong style="color:${G_DK}">${co}</strong>. Your account is ready.</p>
      <div style="background:${G_XLT};border:2px solid ${G_BDR};border-radius:8px;padding:24px 28px;margin-bottom:24px">
        <div style="font-size:10px;font-weight:700;color:${G};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:18px">Your Login Credentials</div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:${GRAY3};margin-bottom:4px">Email Address</div>
          <div style="font-size:15px;font-weight:600;color:${INK}">${email}</div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:${GRAY3};margin-bottom:6px">Temporary Password</div>
          <div style="font-family:monospace;font-size:22px;font-weight:700;background:${WHITE};border:2px solid ${G_BDR};padding:10px 20px;display:inline-block;letter-spacing:4px;color:${INK};border-radius:6px">${temp_password}</div>
        </div>
        <div>
          <div style="font-size:11px;color:${GRAY3};margin-bottom:6px">Role</div>
          <span style="background:${rc}18;color:${rc};border:1px solid ${rc}40;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase">${role}</span>
        </div>
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:14px 18px;font-size:13px;color:#9a3412">
        <strong>Important:</strong> Please log in and change your password immediately for security.
      </div>
    </div>`;
  return wrap(body, co);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST EMAIL
// ═══════════════════════════════════════════════════════════════════════════════
function testEmailHtml({ to, company }) {
  const co = (company&&company.companyName)||'Reservation Safari';
  const body = `
    ${docHeader(co, 'Email Test', '', [], company && company.logoUrl)}
    <div style="padding:48px 36px;text-align:center">
      <div style="width:64px;height:64px;background:${G};border-radius:50%;margin:0 auto 16px;line-height:64px;text-align:center;font-size:28px;color:${WHITE}">&#10003;</div>
      <div style="font-size:24px;font-weight:800;color:${G_DK};margin-bottom:8px">Email is Working!</div>
      <div style="font-size:14px;color:${GRAY3};margin-bottom:24px">Your SMTP configuration is set up correctly.</div>
      <div style="background:${G_LT};border:1px solid ${G_BDR};border-radius:6px;padding:16px 24px;font-size:14px;color:${G_DK};margin-bottom:20px;display:inline-block">
        Delivered to <strong>${to}</strong>
      </div>
      <p style="font-size:13px;color:${GRAY3}">You can now send invoices, quotes, booking confirmations, payment receipts, and user invitations.</p>
    </div>`;
  return wrap(body, co);
}

module.exports = {
  loadConfig, saveConfig, sendEmail,
  invoiceEmailHtml, quoteEmailHtml, bookingConfirmationEmailHtml,
  paymentReceiptEmailHtml, inviteEmailHtml, testEmailHtml,
};
