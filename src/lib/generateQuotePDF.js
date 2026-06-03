import { jsPDF } from 'jspdf';

// ── Palette ───────────────────────────────────────────────────────────────────
const BLACK     = [0, 0, 0];
const WHITE     = [255, 255, 255];
const DARK_BG   = [0, 0, 0];      // pure black for cover
const DARK_MID  = [20, 20, 20];   // near-black for cover strip
const GRAY      = [110, 110, 110];
const LT_GRAY   = [245, 245, 245];
const MID_GRAY  = [200, 200, 200];

const PW = 210;   // A4 width mm
const PH = 297;   // A4 height mm
const ML = 15;    // margin left/right
const CW = PW - ML * 2;  // content width

// ── Helpers ──────────────────────────────────────────────────────────────────

function rgb(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
function fill(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
function draw(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

// Replace any Unicode symbols that Helvetica cannot render with ASCII equivalents
function clean(str) {
  if (!str) return str;
  return String(str)
    .replace(/→/g, ' - ')
    .replace(/←/g, ' - ')
    .replace(/⊙/g, '')
    .replace(/⊕/g, '+')
    .replace(/⊖/g, '-')
    .replace(/☆/g, '*')
    .replace(/★/g, '*')
    .replace(/✓/g, '+')
    .replace(/✗/g, 'x')
    .replace(/✘/g, 'x')
    .replace(/•/g, '-')
    .replace(/·/g, '-')
    .replace(/…/g, '...')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/[^\x00-\xFF]/g, '?');  // catch-all for remaining non-latin chars
}

function fmtDate(d, long = false) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    if (long) return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return String(d); }
}

function dayDate(startISO, offset) {
  if (!startISO) return '';
  try {
    const dt = new Date(startISO);
    dt.setDate(dt.getDate() + offset);
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function fmtMoney(n, cur = 'USD') {
  if (n == null || n === '') return '-';
  const sym = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', KES: 'Ksh ', TZS: 'TSh ' };
  return (sym[cur] || cur + ' ') + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

function pageFooter(doc, pageNum, ref, client, company) {
  fill(doc, LT_GRAY); doc.rect(0, PH - 10, PW, 10, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); rgb(doc, GRAY);
  doc.text(`Page ${pageNum}     Ref. Number: ${ref} — ${client}`, ML, PH - 3.5);
  doc.setFont('helvetica', 'bold');
  doc.text(company, PW - ML, PH - 3.5, { align: 'right' });
}

// ── Load image as base64 for jsPDF ───────────────────────────────────────────
async function loadImageBase64(url) {
  try {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    const res = await fetch(fullUrl);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ── Main PDF builder ─────────────────────────────────────────────────────────

export async function generateQuotePDF(quote) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let pg = 1;

  // ── Pre-load images
  const [coverImgData, mapImgData] = await Promise.all([
    quote.cover_image_url ? loadImageBase64(quote.cover_image_url) : Promise.resolve(null),
    quote.map_image_url   ? loadImageBase64(quote.map_image_url)   : Promise.resolve(null),
  ]);

  // Pre-load per-day images after days are parsed (re-parse here for image loading)
  let daysForImg = [];
  try { const r = quote.itinerary_days; daysForImg = Array.isArray(r) ? r : JSON.parse(r || '[]'); } catch {}

  const dayAccImgs = await Promise.all(
    daysForImg.map(d => d.accommodation_image_url ? loadImageBase64(d.accommodation_image_url) : Promise.resolve(null))
  );
  const dayActImgs = await Promise.all(
    daysForImg.map(d =>
      Promise.all(
        (Array.isArray(d.activities) ? d.activities : []).map(a =>
          (typeof a === 'object' && a.image_url) ? loadImageBase64(a.image_url) : Promise.resolve(null)
        )
      )
    )
  );

  // ── Parse quote data
  let days = [];
  try { const r = quote.itinerary_days; days = Array.isArray(r) ? r : JSON.parse(r || '[]'); } catch {}

  let items = [];
  try { items = JSON.parse(quote.items || '[]'); } catch {}

  let inclusions = quote.inclusions ? quote.inclusions.split(',').map(s => s.trim()).filter(Boolean) : [];
  let exclusions = quote.exclusions ? quote.exclusions.split(',').map(s => s.trim()).filter(Boolean) : [];

  let contact = {};
  try { contact = JSON.parse(quote.company_contact || '{}'); } catch {}

  const cur       = quote.currency || 'USD';
  const company   = quote.company_name || 'Reservation Safari';
  const ref       = quote.quote_number || '—';
  const client    = quote.client_name || 'Valued Guest';
  const numGuests = items.reduce((s, i) => s + (Number(i.qty) || 0), 0) || 1;
  const durDays   = days.length || 0;
  const durNights = Math.max(0, durDays - 1);
  const perPerson = items[0]?.unit_price;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════════════════════

  // Full dark background
  fill(doc, DARK_BG); doc.rect(0, 0, PW, PH, 'F');
  // Cover image if available — full page, darkened overlay
  if (coverImgData) {
    try {
      doc.addImage(coverImgData, 'JPEG', 0, 0, PW, PH, undefined, 'FAST');
      // dark overlay so text stays legible
      doc.setGState(new doc.GState({ opacity: 0.55 }));
      fill(doc, BLACK); doc.rect(0, 0, PW, PH, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch {}
  } else {
    // Subtle lighter strip upper half
    fill(doc, DARK_MID); doc.rect(0, 0, PW, 140, 'F');
  }

  // ── Top header bar ────────────────────────────────────────────────────────
  fill(doc, [0, 0, 0]); doc.rect(0, 0, PW, 12, 'F');

  // "Proposal" white badge
  fill(doc, WHITE); doc.rect(0, 0, 26, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  rgb(doc, BLACK); doc.text('Proposal', 4, 8);

  // Ref
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  rgb(doc, [180, 180, 180]); doc.text(`Ref. Number: ${ref}`, 33, 8);

  // Client name right
  doc.setFont('helvetica', 'bold'); rgb(doc, WHITE);
  doc.text(client, PW - ML, 8, { align: 'right' });

  // ── Tour info bar ─────────────────────────────────────────────────────────
  const infoY = 15;
  const infoH = 18;
  fill(doc, BLACK); doc.rect(ML, infoY, CW, infoH, 'F');
  draw(doc, [55, 55, 55]); doc.setLineWidth(0.2);
  doc.rect(ML, infoY, CW, infoH, 'S');

  const infoItems = [
    { label: 'Tour Type',   value: 'Private Tour' },
    { label: 'Tour Length', value: durDays > 0 ? `${durDays} Days / ${durNights} Nights` : '—' },
    { label: 'Travelers',   value: numGuests > 0 ? `${numGuests} Adult${numGuests !== 1 ? 's' : ''}` : '—' },
    { label: 'Start Tour',  value: fmtDate(quote.start_date) },
    { label: 'End Tour',    value: fmtDate(quote.end_date) },
  ];

  infoItems.forEach((item, i) => {
    const cx = ML + i * (CW / infoItems.length);
    if (i > 0) { draw(doc, [55, 55, 55]); doc.line(cx, infoY, cx, infoY + infoH); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); rgb(doc, [150, 150, 150]);
    doc.text(item.label, cx + 4, infoY + 7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); rgb(doc, WHITE);
    doc.text(item.value, cx + 4, infoY + 14);
  });

  // ── Package title ─────────────────────────────────────────────────────────
  const titleY = 46;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(30); rgb(doc, WHITE);
  const titleLines = doc.splitTextToSize(clean(quote.highlights || 'Safari Quotation'), CW);
  doc.text(titleLines.slice(0, 2), ML, titleY);
  const titleEndY = titleY + Math.min(titleLines.length, 2) * 11;

  // ── Intro letter box ──────────────────────────────────────────────────────
  const boxY = titleEndY + 6;
  const boxH = PH - boxY - 18;
  fill(doc, BLACK); doc.rect(ML, boxY, CW, boxH, 'F');

  let ly = boxY + 12;

  // "Dear [client],"
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); rgb(doc, WHITE);
  doc.text(`Dear ${client},`, ML + 8, ly); ly += 9;

  // Body
  const defaultIntro =
    `We are pleased to present this carefully designed safari experience for you. This journey combines adventure, comfort, and professionally guided game drives through Africa's most renowned wildlife destinations.\n\nThe investment for this safari is as follows:\n\n` +
    (perPerson ? `${fmtMoney(perPerson, cur)} per person\n${fmtMoney(quote.total, cur)} total for ${numGuests} guest${numGuests !== 1 ? 's' : ''}\n\n` : '') +
    `This package ensures a seamless and enriching safari experience delivered with professionalism and attention to detail, creating unforgettable memories of Africa's extraordinary wilderness.`;

  const introBody = clean(quote.company_about || defaultIntro);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); rgb(doc, [215, 215, 215]);
  const introLines = doc.splitTextToSize(introBody, CW - 16);
  const maxLines = Math.min(introLines.length, Math.floor((boxH - 40) / 4.5));
  doc.text(introLines.slice(0, maxLines), ML + 8, ly);

  // Signature
  const sigY = boxY + boxH - 18;
  draw(doc, [70, 70, 70]); doc.setLineWidth(0.3);
  doc.line(ML + 8, sigY, ML + 55, sigY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); rgb(doc, [200, 200, 200]);
  doc.text(company, ML + 8, sigY + 5.5);
  if (contact.email) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); rgb(doc, [160, 160, 160]);
    doc.text(`Email   ${contact.email}`, ML + 8, sigY + 11);
  }

  // Cover footer
  fill(doc, [0, 0, 0]); doc.rect(0, PH - 10, PW, 10, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); rgb(doc, WHITE);
  doc.text(company, ML, PH - 3.5);
  if (contact.website) {
    doc.setFont('helvetica', 'normal'); rgb(doc, [150, 150, 150]);
    doc.text(contact.website, PW - ML, PH - 3.5, { align: 'right' });
  }

  pg++;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  if (days.length > 0) {
    doc.addPage();
    pageFooter(doc, pg, ref, client, company);
    let y = 14;

    // "Summary" badge
    fill(doc, BLACK); doc.rect(ML, y, 22, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); rgb(doc, WHITE);
    doc.text('Summary', ML + 3, y + 5); y += 13;

    // Package title
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24); rgb(doc, BLACK);
    doc.text(clean(quote.highlights || 'Safari Itinerary'), ML, y); y += 6;

    draw(doc, MID_GRAY); doc.setLineWidth(0.3);
    doc.line(ML, y, PW - ML, y); y += 8;

    // Start/End date row
    fill(doc, LT_GRAY); doc.rect(ML, y, CW, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); rgb(doc, GRAY);
    doc.text('Start Tour', ML + 20, y + 5);
    doc.text('End Tour', ML + CW / 2 + 10, y + 5);
    doc.setFontSize(8); rgb(doc, BLACK);
    doc.text(fmtDate(quote.start_date, true), ML + 20, y + 10);
    doc.text(fmtDate(quote.end_date, true), ML + CW / 2 + 10, y + 10);
    y += 18;

    // Map image (if available) — placed above day-by-day table
    if (mapImgData && y + 50 < PH - 30) {
      try {
        doc.addImage(mapImgData, 'JPEG', ML, y, CW, 48, undefined, 'FAST');
        y += 52;
      } catch {}
    }

    // "Day by Day" heading
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); rgb(doc, BLACK);
    doc.text('Day by Day', ML, y); y += 6;

    // Start destination
    const firstDay = days[0];
    const lastDay  = days[days.length - 1];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); rgb(doc, GRAY);
    doc.text(`Start Destination:  ${clean(firstDay?.location || firstDay?.title || '-')}`, ML, y);
    y += 7;

    // Table header
    const tCols = [ML, ML + 20, ML + 74, ML + 138];
    const tHdrs = ['Days', 'Main Destination', 'Accommodation', 'Meal Plan'];
    const rowH  = 14;

    draw(doc, MID_GRAY); doc.setLineWidth(0.25);
    doc.rect(ML, y, CW, rowH, 'S');
    tHdrs.forEach((h, i) => {
      if (i > 0) doc.line(tCols[i], y, tCols[i], y + rowH);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
      doc.text(h, tCols[i] + 3, y + 9);
    });
    y += rowH;

    days.forEach((day, idx) => {
      if (y + rowH > PH - 20) {
        pageFooter(doc, pg, ref, client, company);
        doc.addPage(); pg++;
        y = 18;
      }
      draw(doc, MID_GRAY);
      doc.rect(ML, y, CW, rowH, 'S');
      tHdrs.forEach((_, i) => { if (i > 0) doc.line(tCols[i], y, tCols[i], y + rowH); });

      // Dot + Day
      fill(doc, BLACK); doc.circle(tCols[0] + 3.5, y + rowH / 2, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
      doc.text(`Day ${day.day || idx + 1}`, tCols[0] + 7, y + rowH / 2 + 1.5);

      // Destination
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); rgb(doc, BLACK);
      doc.text(doc.splitTextToSize(clean(day.location || day.title || '-'), 50)[0], tCols[1] + 3, y + 5.5);

      // Accommodation (two lines allowed)
      const accLines = doc.splitTextToSize(clean(day.accommodation || '-'), 60);
      doc.text(accLines[0], tCols[2] + 3, y + 5.5);
      if (accLines[1]) { doc.setFontSize(7); doc.text(accLines[1], tCols[2] + 3, y + 10); }

      // Meals
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(clean(day.meals || '-'), 40)[0], tCols[3] + 3, y + 5.5);
      y += rowH;
    });

    // End destination
    y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); rgb(doc, GRAY);
    doc.text(`End Destination:  ${clean(lastDay?.location || lastDay?.title || '-')}`, ML, y);
    y += 10;

    // Highlights
    const locs = [...new Set(days.map(d => d.location || d.title).filter(Boolean))].slice(0, 6);
    if (locs.length) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); rgb(doc, BLACK);
      doc.text('Highlights', ML, y); y += 5;
      draw(doc, MID_GRAY); doc.setLineWidth(0.25);
      doc.line(ML, y, PW - ML, y); y += 8;
      let hx = ML;
      locs.forEach(loc => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
        const label = `*  ${clean(loc)}`;
        const lw = doc.getStringUnitWidth(label) * 8 / doc.internal.scaleFactor + 10;
        doc.text(label, hx, y);
        hx += lw;
        if (hx > PW - ML - 30) { hx = ML; y += 7; }
      });
    }

    pg++;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGES — ONE PER DAY
  // ════════════════════════════════════════════════════════════════════════════
  days.forEach((day, idx) => {
    doc.addPage();

    const dayNum  = day.day || idx + 1;
    const dateStr = dayDate(quote.start_date, idx);
    const loc     = day.location || day.title || `Day ${dayNum}`;
    const acts    = Array.isArray(day.activities) ? day.activities : [];

    // ── Day header bar ────────────────────────────────────────────────────
    fill(doc, BLACK); doc.rect(0, 0, PW, 10, 'F');

    // "Day X" white badge
    fill(doc, WHITE); doc.rect(0, 0, 20, 10, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); rgb(doc, BLACK);
    doc.text('Day', 3, 5.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(String(dayNum), 10, 8);

    // Date
    if (dateStr) {
      const [weekday, ...rest] = dateStr.split(', ');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); rgb(doc, WHITE);
      doc.text(weekday + ',', 25, 6.5);
      doc.setFont('helvetica', 'normal'); rgb(doc, [180, 180, 180]);
      const afterWeekday = 25 + doc.getStringUnitWidth(weekday + ', ') * 7.5 / doc.internal.scaleFactor + 1;
      doc.text(rest.join(', '), afterWeekday, 6.5);
    }

    // Location right
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); rgb(doc, [180, 180, 180]);
    doc.text(clean(loc), PW - ML, 6.5, { align: 'right' });

    // ── Location heading ─────────────────────────────────────────────────
    let y = 20;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(21); rgb(doc, BLACK);
    doc.text(clean(day.title || loc), ML, y); y += 11;

    // ── Two-column layout ─────────────────────────────────────────────────
    const leftW  = CW * 0.53;
    const rightX = ML + leftW + 5;
    const rightW = CW - leftW - 5;
    let leftY  = y;
    let rightY = y;

    // LEFT: description
    if (day.description) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); rgb(doc, BLACK);
      const dl = doc.splitTextToSize(clean(day.description), leftW);
      doc.text(dl, ML, leftY);
      leftY += dl.length * 4.5 + 6;
    }

    // LEFT: accommodation
    if (day.accommodation) {
      draw(doc, MID_GRAY); doc.setLineWidth(0.2);
      doc.line(ML, leftY, ML + leftW, leftY); leftY += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); rgb(doc, GRAY);
      doc.text(`Accommodation  |  Day ${dayNum}`, ML, leftY); leftY += 4.5;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); rgb(doc, BLACK);
      doc.text(clean(day.accommodation), ML, leftY); leftY += 6;
    }

    // LEFT: accommodation image
    const accImg = dayAccImgs[idx];
    if (accImg && leftY + 34 < PH - 20) {
      try {
        doc.addImage(accImg, 'JPEG', ML, leftY, leftW, 32, undefined, 'FAST');
        leftY += 35;
      } catch {}
    }

    // RIGHT: Activities box
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); rgb(doc, BLACK);
    doc.text(`Activities   Day ${dayNum}`, rightX, rightY); rightY += 8;

    const actImgsForDay = dayActImgs[idx] || [];

    if (acts.length > 0) {
      acts.forEach((act, actI) => {
        const text = typeof act === 'string' ? act : (act.title || act.notes || '');
        if (!text && !actImgsForDay[actI]) return;
        if (rightY > PH - 30) return;

        // Activity image thumbnail (right-aligned, small)
        const actImg = actImgsForDay[actI];
        const thumbW = actImg ? 22 : 0;
        const textW  = rightW - thumbW - (actImg ? 3 : 0);

        if (text) {
          const al = doc.splitTextToSize(`-  ${clean(text)}`, textW);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8); rgb(doc, BLACK);
          doc.text(al[0], rightX, rightY);
        }
        if (actImg && rightY + 16 < PH - 20) {
          try {
            doc.addImage(actImg, 'JPEG', rightX + textW + 3, rightY - 5, thumbW, 16, undefined, 'FAST');
          } catch {}
        }
        rightY += text ? 7 : 0;
        if (actImg) rightY = Math.max(rightY, rightY);
      });
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); rgb(doc, GRAY);
      doc.text('Game drives and guided activities', rightX, rightY); rightY += 6;
    }

    // Meals box (right column)
    if (day.meals) {
      rightY += 3;
      fill(doc, LT_GRAY); draw(doc, MID_GRAY); doc.setLineWidth(0.25);
      doc.rect(rightX, rightY, rightW, 14, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
      doc.text(`Meal Plan - Day ${dayNum}`, rightX + 4, rightY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(clean(day.meals), rightX + 4, rightY + 11);
      rightY += 17;
    }

    // Footer
    pageFooter(doc, pg, ref, client, company);
    pg++;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PRICING PAGE
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Header bar
  fill(doc, BLACK); doc.rect(0, 0, PW, 10, 'F');
  fill(doc, WHITE); doc.rect(0, 0, 22, 10, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
  doc.text('Pricing', 4, 7);
  rgb(doc, WHITE);
  doc.text(`Our offer for ${client}`, PW - ML, 7, { align: 'right' });

  let y = 16;

  // Tour info bar
  const pInfo = [
    { label: 'Tour Type',   value: 'Private Tour' },
    { label: 'Tour Length', value: durDays > 0 ? `${durDays} Days / ${durNights} Nights` : '—' },
    { label: 'Start Tour',  value: fmtDate(quote.start_date) },
    { label: 'End Tour',    value: fmtDate(quote.end_date) },
    { label: 'Travelers',   value: numGuests > 0 ? `${numGuests} Adult${numGuests !== 1 ? 's' : ''}` : '—' },
  ];
  draw(doc, MID_GRAY); doc.setLineWidth(0.25);
  doc.rect(ML, y, CW, 16, 'S');
  pInfo.forEach((item, i) => {
    const cx = ML + i * (CW / pInfo.length);
    if (i > 0) doc.line(cx, y, cx, y + 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); rgb(doc, GRAY);
    doc.text(item.label, cx + 3, y + 6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
    doc.text(item.value, cx + 3, y + 12);
  });
  y += 22;

  // Included / Excluded side by side
  if (inclusions.length > 0 || exclusions.length > 0) {
    const halfW = (CW - 4) / 2;
    const exX   = ML + halfW + 4;
    const maxRows = Math.max(inclusions.length, exclusions.length);
    const boxH  = maxRows * 5.5 + 16;

    if (inclusions.length > 0) {
      draw(doc, MID_GRAY); doc.setLineWidth(0.25);
      doc.rect(ML, y, halfW, boxH, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
      doc.text('Included', ML + 4, y + 8);
      inclusions.forEach((item, i) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); rgb(doc, BLACK);
        doc.text(doc.splitTextToSize(`+ ${clean(item)}`, halfW - 10)[0], ML + 8, y + 14 + i * 5.5);
      });
    }

    if (exclusions.length > 0) {
      draw(doc, MID_GRAY); doc.setLineWidth(0.25);
      doc.rect(exX, y, halfW, boxH, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
      doc.text('Not Included', exX + 4, y + 8);
      exclusions.forEach((item, i) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); rgb(doc, BLACK);
        doc.text(doc.splitTextToSize(`- ${clean(item)}`, halfW - 10)[0], exX + 8, y + 14 + i * 5.5);
      });
    }

    y += boxH + 10;
  }

  // Breakdown of Costs
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); rgb(doc, BLACK);
  doc.text('Breakdown of Costs', ML, y); y += 8;

  // Table header row (black bg)
  const cCols = [ML, ML + 95, ML + 135, ML + 165];
  fill(doc, BLACK); doc.rect(ML, y, CW, 8, 'F');
  ['Description', 'Unit Price', 'Qty', 'Total'].forEach((h, i) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, WHITE);
    doc.text(h, cCols[i] + 3, y + 5.5);
  });
  y += 8;

  items.forEach((item, i) => {
    fill(doc, i % 2 === 0 ? WHITE : LT_GRAY);
    doc.rect(ML, y, CW, 8, 'F');
    draw(doc, MID_GRAY); doc.setLineWidth(0.2);
    doc.rect(ML, y, CW, 8, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
    doc.text(doc.splitTextToSize(clean(item.description || ''), 88)[0], cCols[0] + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtMoney(item.unit_price, cur), cCols[1] + 3, y + 5.5);
    doc.text(String(item.qty || ''), cCols[2] + 3, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtMoney(item.total, cur), cCols[3] + 3, y + 5.5);
    y += 8;
  });

  // Totals
  y += 3;
  draw(doc, MID_GRAY); doc.setLineWidth(0.3);
  doc.line(cCols[1], y, PW - ML, y); y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); rgb(doc, BLACK);
  doc.text('Total in ' + cur, cCols[1] + 3, y);
  doc.setFontSize(11);
  doc.text(fmtMoney(quote.total, cur), cCols[3] + 3, y);
  y += 14;

  // Payment Terms
  const termsMap = {
    '50/50': 'To confirm and secure the safari booking, a non-refundable deposit of 50% of the total safari cost is required at the time of reservation. The remaining 50% balance is due before the commencement of services.',
    '30/70': 'To confirm and secure the safari booking, a non-refundable deposit of 30% of the total safari cost is required at the time of reservation. The remaining 70% must be paid upon arrival on the first day of the safari, prior to the commencement of services.',
    'full':  'Full payment is required at the time of booking to confirm and secure all arrangements, including accommodation, park permits, and transportation.',
    'flexible': 'Payment terms are flexible. Please contact us to discuss a suitable plan that works for you.',
  };
  const termsText = quote.payment_terms ? (termsMap[quote.payment_terms] || quote.payment_terms) : null;
  if (termsText) {
    fill(doc, LT_GRAY); draw(doc, MID_GRAY); doc.setLineWidth(0.25);
    const tl = doc.splitTextToSize(termsText, CW - 12);
    doc.rect(ML, y, CW, tl.length * 4.5 + 16, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); rgb(doc, BLACK);
    doc.text('Payment Terms', ML + 5, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); rgb(doc, GRAY);
    doc.text(tl, ML + 5, y + 13);
  }

  pageFooter(doc, pg, ref, client, company);
  pg++;

  // ════════════════════════════════════════════════════════════════════════════
  // ABOUT US PAGE (only if company info exists)
  // ════════════════════════════════════════════════════════════════════════════
  if (quote.company_about || contact.email || contact.phone || contact.website) {
    doc.addPage();

    fill(doc, BLACK); doc.rect(0, 0, PW, 10, 'F');
    fill(doc, WHITE); doc.rect(0, 0, 22, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, BLACK);
    doc.text('About Us', 4, 7);

    let y = 22;
    const aboutW   = CW * 0.56;
    const contX    = ML + aboutW + 6;
    const contW    = CW - aboutW - 6;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); rgb(doc, BLACK);
    doc.text(company, ML, y); y += 12;

    if (quote.company_about) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); rgb(doc, BLACK);
      const al = doc.splitTextToSize(quote.company_about, aboutW);
      doc.text(al, ML, y);
    }

    // Contact box
    fill(doc, LT_GRAY); draw(doc, MID_GRAY); doc.setLineWidth(0.25);
    doc.rect(contX, 22, contW, 44, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); rgb(doc, BLACK);
    doc.text('Contact Us', contX + 5, 34);

    let cy = 42;
    [['Email', contact.email], ['Phone', contact.phone], ['Website', contact.website], ['Address', contact.address]]
      .filter(([, v]) => v)
      .forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); rgb(doc, GRAY);
        doc.text(label, contX + 5, cy);
        doc.setFont('helvetica', 'normal'); rgb(doc, BLACK);
        doc.text(String(val), contX + 5 + 18, cy);
        cy += 6;
      });

    pageFooter(doc, pg, ref, client, company);
  }

  return doc;
}

export async function downloadQuotePDF(quote) {
  const doc = await generateQuotePDF(quote);
  doc.save(`Quote-${quote.quote_number || quote.id}.pdf`);
}
