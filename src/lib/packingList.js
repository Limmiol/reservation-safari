/**
 * Smart packing-list generator for East African safari packages.
 *
 * Takes a Package-shaped object and derives a categorized, prioritized
 * checklist driven by: duration, destinations, season (rain/dry), altitude,
 * and activities mentioned in the itinerary.
 *
 * generatePackingList(pkg)        -> structured { categories, notes }
 * exportPackingListPdf(pkg, cfg?) -> triggers PDF download
 */

import { jsPDF } from 'jspdf';
import { guessParkId } from './parkCoordinates';

// Parks that need specific gear
const COLD_PARKS      = ['ngorongoro', 'bwindi', 'volcanoes', 'mgahinga', 'kilimanjaro', 'nyungwe'];
const GORILLA_PARKS   = ['bwindi', 'volcanoes', 'mgahinga'];
const CHIMP_PARKS     = ['kibale', 'mahale', 'nyungwe'];
const WET_FOREST      = ['bwindi', 'volcanoes', 'mgahinga', 'nyungwe', 'kibale', 'mahale'];
const HIGH_ALTITUDE   = ['kilimanjaro', 'bwindi', 'volcanoes', 'mgahinga'];
const BEACH_REGIONS   = ['zanzibar', 'diani', 'mombasa', 'coast'];

// ── Season detection ────────────────────────────────────────────────────────

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const LONG_RAINS  = new Set(['mar','apr','may']);
const SHORT_RAINS = new Set(['nov','dec']);

function detectSeason(pkg) {
  // Try package metadata first
  const blob = [pkg?.season, pkg?.description, pkg?.best_time, pkg?.travel_dates].filter(Boolean).join(' ').toLowerCase();
  let rainy = false;
  for (const m of MONTHS) {
    if (blob.includes(m)) {
      const key = m.slice(0, 3);
      if (LONG_RAINS.has(key) || SHORT_RAINS.has(key)) rainy = true;
    }
  }
  if (/\brain|wet season\b/.test(blob)) rainy = true;
  if (/\bdry season|jun|jul|aug|sep|oct\b/.test(blob)) rainy = rainy || false;
  return { rainy };
}

// ── Destination detection ───────────────────────────────────────────────────

function detectParks(pkg) {
  const hits = new Set();
  const push = (id) => id && hits.add(id);

  // Explicit itinerary array
  let itinerary = pkg?.itinerary_days;
  if (typeof itinerary === 'string') {
    try { itinerary = JSON.parse(itinerary); } catch { itinerary = null; }
  }
  if (Array.isArray(itinerary)) {
    for (const day of itinerary) {
      push(guessParkId(day?.location));
      push(guessParkId(day?.title));
      push(guessParkId(day?.description));
    }
  }

  // Fallback: scan destination + description
  push(guessParkId(pkg?.destination));
  const text = `${pkg?.destination || ''} ${pkg?.description || ''}`.toLowerCase();
  if (/zanzibar|beach|diani|mombasa|coast/.test(text)) hits.add('zanzibar');

  return [...hits];
}

function detectActivities(pkg) {
  const blob = [
    pkg?.description,
    pkg?.includes,
    Array.isArray(pkg?.itinerary_days) ? JSON.stringify(pkg.itinerary_days) : pkg?.itinerary_days,
  ].filter(Boolean).join(' ').toLowerCase();
  return {
    gorilla:   /\bgorilla|silverback|bwindi|volcanoes\b/.test(blob),
    chimp:     /\bchimp|kibale|mahale|nyungwe\b/.test(blob),
    hike:      /\bhike|hiking|trek|kilimanjaro|mt meru|walking safari|summit\b/.test(blob),
    beach:     /\bbeach|zanzibar|diani|coast|snorkel|diving\b/.test(blob),
    balloon:   /\bballoon\b/.test(blob),
    boat:      /\bboat|boat cruise|kazinga|rufiji\b/.test(blob),
    nightDrive:/\bnight game drive|night drive\b/.test(blob),
    cultural:  /\bmaasai|cultural|village|batwa|hadzabe\b/.test(blob),
  };
}

// ── Generator ───────────────────────────────────────────────────────────────

export function generatePackingList(pkg) {
  if (!pkg) return { categories: [], notes: [] };

  const parks = detectParks(pkg);
  const parkSet = new Set(parks);
  const activities = detectActivities(pkg);
  const { rainy } = detectSeason(pkg);
  const days = Number(pkg?.duration_days) || 7;

  const needsCold    = parks.some(id => COLD_PARKS.includes(id));
  const needsGorilla = parks.some(id => GORILLA_PARKS.includes(id)) || activities.gorilla;
  const needsChimp   = parks.some(id => CHIMP_PARKS.includes(id)) || activities.chimp;
  const needsForest  = parks.some(id => WET_FOREST.includes(id)) || needsGorilla || needsChimp;
  const needsHigh    = parks.some(id => HIGH_ALTITUDE.includes(id));
  const needsBeach   = parks.some(id => BEACH_REGIONS.includes(id)) || activities.beach;

  const shirts = Math.min(7, Math.max(3, Math.ceil(days / 2)));
  const trousers = Math.min(4, Math.max(2, Math.ceil(days / 3)));
  const socks = Math.min(8, Math.max(3, Math.ceil(days / 2) + 1));

  const categories = [];

  categories.push({
    name: 'Clothing (safari-neutral colours — khaki, olive, beige)',
    items: [
      `${shirts} lightweight long-sleeve shirts`,
      `${shirts - 1 || 2} T-shirts / polo shirts`,
      `${trousers} pairs safari trousers (convertible/zip-off ideal)`,
      '1 pair shorts',
      `${socks} pairs breathable socks`,
      '1 fleece or mid-layer sweater',
      ...(needsCold ? ['1 warm jacket (crater rim / early morning drives can hit 5 °C)'] : []),
      ...(needsBeach ? ['Swimwear + beach cover-up + sarong', 'Flip-flops / reef shoes'] : []),
      ...(rainy ? ['Lightweight waterproof rain jacket', 'Pack-cover or dry bag'] : ['Light windproof jacket']),
      '1 pair sturdy walking shoes / light hiking boots',
      ...(needsGorilla ? ['Gardening gloves (for gripping stinging nettles)', 'Waterproof gaiters'] : []),
      'Wide-brim sun hat + sunglasses (UV-rated)',
      'Buff / neck gaiter (dust protection on game drives)',
    ],
  });

  categories.push({
    name: 'Health & toiletries',
    items: [
      'Yellow Fever vaccination certificate (required for cross-border travel)',
      'Malaria prophylaxis (consult a travel clinic)',
      'Insect repellent — DEET 30–50% recommended',
      'High-SPF sunscreen (50+)',
      'Lip balm with SPF',
      'Hand sanitiser + wet wipes',
      'Rehydration salts / electrolytes',
      'Personal first-aid kit (plasters, antihistamine, anti-diarrhoea, pain relief)',
      'Prescription meds in original packaging + copy of prescription',
      ...(needsHigh ? ['Altitude sickness medication (Diamox) if advised'] : []),
      'Contact lens supplies / spare glasses',
      'Toiletries — travel-size (most lodges provide basics)',
    ],
  });

  categories.push({
    name: 'Gear & optics',
    items: [
      'Binoculars (8×42 recommended) — a must, don\'t rely on shared camp pairs',
      'Camera + spare batteries + 2× memory cards',
      'Telephoto lens (200–400mm) for wildlife',
      ...(activities.balloon ? ['Wide-angle lens for balloon safari landscapes'] : []),
      ...(activities.boat ? ['Waterproof cover / dry bag for boat cruises'] : []),
      'Universal power adapter (UK 3-pin standard in TZ/KE/UG/RW)',
      'Power bank (10,000+ mAh — bush camps ration generator hours)',
      'Head torch / small flashlight',
      'Reusable water bottle (many lodges now refill; saves plastic)',
      ...(needsForest ? ['Small waterproof backpack for forest treks'] : ['Daypack for game drives']),
    ],
  });

  categories.push({
    name: 'Documents & money',
    items: [
      'Passport (6+ months validity, 2 blank pages per country)',
      'Printed e-visa / visa on arrival receipt',
      'Travel insurance policy (medical + repatriation covered)',
      'International driving permit (if self-driving)',
      'Printed itinerary + lodge contact sheet',
      'USD cash in clean, post-2013 notes (for tips, souvenirs)',
      'Credit card (Visa/Mastercard — AmEx rarely accepted)',
      'Emergency contact card',
    ],
  });

  if (needsGorilla) {
    categories.push({
      name: 'Gorilla / chimp trekking extras',
      items: [
        'Permit (carry printed permit + passport on trek day)',
        'Walking stick (usually provided at trailhead)',
        'Long-sleeve shirt + long trousers (stinging nettles, insects)',
        'Tucked-in shirt to prevent ants climbing inside',
        'Waterproof boots with ankle support',
        'Packed lunch + 2L water (treks can run 2–8 hours)',
        'Energy bars / trail snacks',
        'Small towel (forest can be wet and muddy)',
      ],
    });
  }

  if (activities.hike || parkSet.has('kilimanjaro')) {
    categories.push({
      name: 'Hiking / summit extras',
      items: [
        'Trekking poles',
        'Thermal base layers',
        'Insulated down jacket (for summit night if climbing Kili)',
        'Balaclava + warm hat + gloves',
        'Gaiters',
        'Blister plasters',
        '4-season sleeping bag (if camping above 4000m)',
      ],
    });
  }

  if (needsBeach) {
    categories.push({
      name: 'Beach extension',
      items: [
        'Reef-safe sunscreen',
        'Mask + snorkel (some lodges provide, bring own for fit)',
        'Underwater camera or waterproof phone pouch',
        'Kaftan / modest cover-up (for Stone Town walks)',
        'Mosquito coils (evenings on the coast)',
      ],
    });
  }

  const notes = [
    `Duration basis: ${days} day${days === 1 ? '' : 's'} — lodges typically offer laundry every 2–3 days.`,
    'Luggage limit on internal bush flights is 15 kg in soft duffel (not hard case).',
    rainy ? 'Packed for shoulder / rainy season — include waterproof layers.' : 'Packed for predominantly dry-season travel.',
    needsCold ? 'Includes cold-weather layers for Ngorongoro/forest parks.' : null,
    needsGorilla ? 'Gorilla permits and long-sleeve trekking kit included.' : null,
    'Tip: pack 2–3 USD $1 bills for small gratuities (porters, staff).',
  ].filter(Boolean);

  return { categories, notes, meta: { days, parks, rainy, needsCold, needsGorilla, needsBeach } };
}

// ── PDF export ──────────────────────────────────────────────────────────────

const MARGIN = 40;
const PAGE_W = 595;
const PAGE_H = 842;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ensureSpace(doc, y, needed = 40) {
  if (y + needed > PAGE_H - 50) {
    doc.addPage();
    return 60;
  }
  return y;
}

export function exportPackingListPdf(pkg, { siteConfig = {} } = {}) {
  const { categories, notes } = generatePackingList(pkg);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Hero
  doc.setFillColor(10, 61, 98);
  doc.rect(0, 0, PAGE_W, 110, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 110, PAGE_W, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Safari Packing List', MARGIN, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(200, 220, 240);
  const subtitle = `${pkg?.name || 'Safari package'} · ${pkg?.duration_days || '?'} days · ${pkg?.destination || ''}`;
  doc.text(doc.splitTextToSize(subtitle, CONTENT_W), MARGIN, 78);

  let y = 145;

  // Notes
  if (notes.length > 0) {
    doc.setFillColor(255, 247, 230);
    doc.roundedRect(MARGIN, y, CONTENT_W, 18 + notes.length * 13, 6, 6, 'F');
    doc.setTextColor(180, 90, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TRIP NOTES', MARGIN + 10, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    let ny = y + 28;
    for (const n of notes) {
      const lines = doc.splitTextToSize(`• ${n}`, CONTENT_W - 20);
      doc.text(lines, MARGIN + 10, ny);
      ny += lines.length * 12;
    }
    y = ny + 10;
  }

  // Categories
  for (const cat of categories) {
    y = ensureSpace(doc, y, 50);

    // Section header
    doc.setFillColor(245, 158, 11);
    doc.rect(MARGIN, y, 3, 14, 'F');
    doc.setTextColor(10, 61, 98);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const heading = doc.splitTextToSize(cat.name.toUpperCase(), CONTENT_W - 10);
    doc.text(heading, MARGIN + 10, y + 11);
    y += 10 + heading.length * 13;

    // Items as checkboxes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(34, 34, 34);
    for (const item of cat.items) {
      y = ensureSpace(doc, y, 18);
      doc.setDrawColor(120, 120, 120);
      doc.rect(MARGIN + 2, y - 8, 9, 9);
      const lines = doc.splitTextToSize(item, CONTENT_W - 22);
      doc.text(lines, MARGIN + 18, y);
      y += lines.length * 13 + 2;
    }
    y += 8;
  }

  // Footer on every page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, PAGE_H - 30, PAGE_W - MARGIN, PAGE_H - 30);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(siteConfig?.appName || 'Reservation Safari', MARGIN, PAGE_H - 15);
    doc.text(`Page ${i} / ${total}`, PAGE_W - MARGIN, PAGE_H - 15, { align: 'right' });
  }

  const safeName = (pkg?.name || 'safari').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`${safeName}-packing-list.pdf`);
}
