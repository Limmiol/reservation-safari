/**
 * Package → branded PDF brochure generator.
 * Uses jsPDF (already a dependency) — no server round-trip.
 *
 * exportPackagePdf(pkg, { siteConfig })  -> triggers download
 */

import { jsPDF } from 'jspdf';

const MARGIN = 40;
const PAGE_W = 595; // A4 portrait at 72dpi
const PAGE_H = 842;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Theme helpers
const RGB = {
  primary: [10, 61, 98],   // deep safari blue
  accent:  [245, 158, 11], // savanna amber
  gray:    [120, 120, 120],
  light:   [240, 240, 240],
  text:    [34, 34, 34],
};

// ── Primitives ──────────────────────────────────────────────────────────────

function drawHero(doc, title, subtitle) {
  doc.setFillColor(...RGB.primary);
  doc.rect(0, 0, PAGE_W, 140, 'F');

  // Accent stripe
  doc.setFillColor(...RGB.accent);
  doc.rect(0, 140, PAGE_W, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(title || 'Safari Package', CONTENT_W);
  doc.text(titleLines, MARGIN, 55);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(200, 220, 240);
    doc.text(subtitle, MARGIN, 85 + (titleLines.length - 1) * 22);
  }
}

function drawFooter(doc, pageNum, totalPages, siteConfig) {
  const y = PAGE_H - 25;
  doc.setDrawColor(...RGB.light);
  doc.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10);
  doc.setTextColor(...RGB.gray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(siteConfig?.appName || 'Reservation Safari', MARGIN, y);
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' });
}

function section(doc, y, label) {
  doc.setFillColor(...RGB.accent);
  doc.rect(MARGIN, y, 3, 14, 'F');
  doc.setTextColor(...RGB.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(label.toUpperCase(), MARGIN + 10, y + 11);
  return y + 22;
}

function keyValue(doc, y, label, value) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...RGB.gray);
  doc.text(label.toUpperCase(), MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...RGB.text);
  doc.text(String(value || '—'), MARGIN, y + 14);
  return y + 32;
}

function paragraph(doc, y, text, opts = {}) {
  const { fontSize = 10, lineHeight = 14, color = RGB.text } = opts;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * lineHeight;
}

function ensureSpace(doc, y, needed = 100) {
  if (y + needed > PAGE_H - 60) {
    doc.addPage();
    return 60;
  }
  return y;
}

function bulletList(doc, y, items, opts = {}) {
  const { color = [52, 168, 83] } = opts;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...RGB.text);
  for (const item of items) {
    y = ensureSpace(doc, y, 20);
    doc.setFillColor(...color);
    doc.circle(MARGIN + 4, y - 3, 2, 'F');
    const lines = doc.splitTextToSize(item, CONTENT_W - 20);
    doc.text(lines, MARGIN + 14, y);
    y += lines.length * 13 + 2;
  }
  return y + 4;
}

// ── Data shaping ────────────────────────────────────────────────────────────

function splitList(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str.filter(Boolean);
  return String(str)
    .split(/\n|,|•|·|\*|✓|;|—|–/)
    .map(s => s.replace(/^[\s\-\d\.)]+/, '').trim())
    .filter(s => s.length > 1);
}

function parseItinerary(it) {
  if (!it) return [];
  if (Array.isArray(it)) return it;
  try {
    const parsed = JSON.parse(it);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

export function exportPackagePdf(pkg, { siteConfig = {} } = {}) {
  if (!pkg) throw new Error('No package provided');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // ── Page 1: Cover + overview ──────────────────────────────────────────
  drawHero(doc, pkg.name, pkg.destination);

  let y = 180;

  // Quick stats strip
  const stats = [
    { label: 'Duration', value: pkg.duration_days ? `${pkg.duration_days} day${pkg.duration_days === 1 ? '' : 's'}` : '—' },
    { label: 'From',     value: pkg.price_per_person ? `${pkg.currency || 'USD'} ${Number(pkg.price_per_person).toLocaleString()}` : '—' },
    { label: 'Max Pax',  value: pkg.max_guests || 'Flexible' },
    { label: 'Style',    value: (pkg.category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Custom' },
  ];
  const colW = CONTENT_W / stats.length;
  doc.setDrawColor(...RGB.light);
  doc.roundedRect(MARGIN, y, CONTENT_W, 55, 6, 6, 'S');
  stats.forEach((s, i) => {
    const x = MARGIN + colW * i;
    doc.setTextColor(...RGB.gray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(s.label.toUpperCase(), x + 12, y + 20);
    doc.setTextColor(...RGB.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(s.value), x + 12, y + 42);
    if (i < stats.length - 1) {
      doc.setDrawColor(...RGB.light);
      doc.line(x + colW, y + 10, x + colW, y + 45);
    }
  });
  y += 75;

  // Overview
  if (pkg.description) {
    y = section(doc, y, 'Overview');
    y = paragraph(doc, y, pkg.description, { lineHeight: 15 });
    y += 10;
  }

  // ── Itinerary ─────────────────────────────────────────────────────────
  const itinerary = parseItinerary(pkg.itinerary_days);
  if (itinerary.length > 0) {
    y = ensureSpace(doc, y, 80);
    y = section(doc, y, 'Day-by-Day Itinerary');

    for (const day of itinerary) {
      y = ensureSpace(doc, y, 90);

      // Day badge
      doc.setFillColor(...RGB.primary);
      doc.roundedRect(MARGIN, y, 55, 22, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`DAY ${day.day || '?'}`, MARGIN + 27, y + 15, { align: 'center' });

      // Title
      doc.setTextColor(...RGB.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const titleText = day.title || day.location || `Day ${day.day}`;
      doc.text(titleText, MARGIN + 65, y + 15);

      y += 32;

      if (day.location && day.title && day.location !== day.title) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...RGB.gray);
        doc.text(`📍 ${day.location}`, MARGIN + 65, y);
        y += 13;
      }

      if (day.description) {
        y = paragraph(doc, y, day.description, { fontSize: 10, lineHeight: 13 });
      }

      // Activities
      if (Array.isArray(day.activities) && day.activities.length > 0) {
        y += 4;
        const items = day.activities.map(a => typeof a === 'string' ? a : (a.title || a.notes || '')).filter(Boolean);
        y = bulletList(doc, y, items);
      }

      if (day.accommodation) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...RGB.gray);
        doc.text(`🏨 ${day.accommodation}`, MARGIN, y);
        y += 14;
      }
      if (day.meals) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...RGB.gray);
        doc.text(`🍽 ${day.meals}`, MARGIN, y);
        y += 14;
      }

      y += 12;
    }
  }

  // ── Inclusions / Exclusions ───────────────────────────────────────────
  const inc = splitList(pkg.includes);
  const exc = splitList(pkg.excludes);

  if (inc.length > 0) {
    y = ensureSpace(doc, y, 80);
    y = section(doc, y, 'Inclusions');
    y = bulletList(doc, y, inc, { color: [52, 168, 83] });
    y += 6;
  }

  if (exc.length > 0) {
    y = ensureSpace(doc, y, 80);
    y = section(doc, y, 'Exclusions');
    y = bulletList(doc, y, exc, { color: [219, 68, 55] });
    y += 6;
  }

  // ── Pricing ───────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 80);
  y = section(doc, y, 'Pricing');
  if (pkg.price_per_person) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...RGB.primary);
    doc.text(
      `${pkg.currency || 'USD'} ${Number(pkg.price_per_person).toLocaleString()} `,
      MARGIN, y + 18
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...RGB.gray);
    doc.text('per person sharing, before optional upgrades', MARGIN, y + 34);
    y += 50;
  } else {
    y = paragraph(doc, y, 'Pricing on request.', { color: RGB.gray });
  }

  // ── Company footer block ──────────────────────────────────────────────
  y = ensureSpace(doc, y, 90);
  doc.setFillColor(...RGB.light);
  doc.roundedRect(MARGIN, y, CONTENT_W, 60, 6, 6, 'F');
  doc.setTextColor(...RGB.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(siteConfig.appName || 'Reservation Safari', MARGIN + 16, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...RGB.text);
  if (siteConfig.company_email)   doc.text(siteConfig.company_email, MARGIN + 16, y + 38);
  if (siteConfig.support_phone)   doc.text(siteConfig.support_phone, MARGIN + 16, y + 50);

  // Numbered footers on every page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, siteConfig);
  }

  const safeName = (pkg.name || 'package').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`${safeName}-brochure.pdf`);
}
