/**
 * Package parsers: extract structured Package data from PDFs and Excel/CSV files.
 *
 * extractFromPdf(file)   -> { raw, parsed }
 * extractFromExcel(file) -> { raw, parsed }
 *
 * `parsed` matches the Package entity shape used by Packages.jsx:
 *   { name, description, destination, duration_days, price_per_person, currency,
 *     max_guests, includes, excludes, category, itinerary_days: [...] }
 */

// ───── PDF ──────────────────────────────────────────────────────────────────

let pdfJsPromise = null;
async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      const mod = await import('pdfjs-dist/build/pdf.mjs');
      // Vite pattern: import worker as a URL. `?url` returns the final asset path.
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
      mod.GlobalWorkerOptions.workerSrc = workerUrl;
      return mod;
    })();
  }
  return pdfJsPromise;
}

export async function extractPdfText(file) {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Group by Y coord to preserve line structure
    const lines = {};
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      lines[y] = (lines[y] ? lines[y] + ' ' : '') + item.str;
    }
    const ordered = Object.keys(lines)
      .map(Number)
      .sort((a, b) => b - a) // top→bottom
      .map(k => lines[k].replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    pages.push(ordered.join('\n'));
  }
  return pages.join('\n\n');
}

// ───── Heuristic extraction ────────────────────────────────────────────────

const CURRENCY_TOKENS = ['USD', 'EUR', 'GBP', 'KES', 'TZS', 'UGX', 'RWF', 'ZAR'];
const CURRENCY_SYMBOLS = { '$': 'USD', '€': 'EUR', '£': 'GBP' };

function firstMatch(re, text, group = 1) {
  const m = text.match(re);
  return m ? m[group] : null;
}

function parsePrice(text) {
  // $ 1,200 / USD 1200 / 1200 USD / KES 50,000
  const withCode = text.match(/\b(USD|EUR|GBP|KES|TZS|UGX|RWF|ZAR)\s*([\d,]+(?:\.\d+)?)/i);
  if (withCode) return { currency: withCode[1].toUpperCase(), amount: Number(withCode[2].replace(/,/g, '')) };
  const codeAfter = text.match(/([\d,]+(?:\.\d+)?)\s*(USD|EUR|GBP|KES|TZS|UGX|RWF|ZAR)/i);
  if (codeAfter) return { currency: codeAfter[2].toUpperCase(), amount: Number(codeAfter[1].replace(/,/g, '')) };
  const sym = text.match(/([$€£])\s*([\d,]+(?:\.\d+)?)/);
  if (sym) return { currency: CURRENCY_SYMBOLS[sym[1]], amount: Number(sym[2].replace(/,/g, '')) };
  return null;
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/luxury|ultra[- ]luxury|5[- ]star/.test(t))  return 'luxury';
  if (/budget|camping|backpacker/.test(t))         return 'budget';
  if (/premium|deluxe|4[- ]star/.test(t))          return 'premium';
  return 'mid_range';
}

function extractList(text, label) {
  // Looks for "Includes:" or "Inclusions:" followed by bullet/line items, stops at next heading
  const re = new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:\\-]?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:Exclusions?|Includes?|Excludes?|Itinerary|Day\\s*\\d|Price|Total|Duration|Overview|Terms|Notes?)\\b|$)`, 'i');
  const m = text.match(re);
  if (!m) return '';
  return m[1]
    .split(/\n|•|·|\*|✓|—|–/)
    .map(s => s.replace(/^[\s\-\d\.)]+/, '').trim())
    .filter(s => s.length > 2 && s.length < 200)
    .join('\n');
}

function extractItineraryDays(text) {
  // Match blocks like "Day 1 – Arrival in Arusha" ... up to next "Day N"
  const re = /Day\s*(\d+)\s*[:\-–—]?\s*([^\n]*)\n?([\s\S]*?)(?=\n\s*Day\s*\d+|\n\s*(?:Inclusions?|Exclusions?|Price|Total)\b|$)/gi;
  const days = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const num  = Number(m[1]);
    const title = (m[2] || '').trim();
    const body  = (m[3] || '').trim().replace(/\n+/g, ' ');
    days.push({
      day: num,
      title: title || `Day ${num}`,
      description: body.slice(0, 600),
    });
  }
  return days.sort((a, b) => a.day - b.day);
}

// Known destinations — used as a wide-net fallback if "Destination:" label isn't present
const DESTINATIONS = [
  'Serengeti', 'Masai Mara', 'Maasai Mara', 'Ngorongoro', 'Tarangire', 'Amboseli',
  'Bwindi', 'Volcanoes', 'Lake Manyara', 'Lake Nakuru', 'Samburu', 'Tsavo',
  'Queen Elizabeth', 'Murchison', 'Kilimanjaro', 'Zanzibar', 'Arusha', 'Nairobi',
  'Mombasa', 'Lamu', 'Diani', 'Mahale', 'Katavi', 'Selous', 'Ruaha',
  'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'Botswana', 'Zambia',
  'South Africa', 'Namibia', 'Mozambique',
];

export function parsePackageFromText(raw) {
  const text = raw.replace(/\r/g, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = lines.find(l => l.length > 3 && l.length < 120) || '';

  // ── Name ─────────────────────────────────────────────────────────────
  const name =
    firstMatch(/(?:Package|Tour|Safari)\s*Name\s*[:\-]\s*(.+)/i, text) ||
    firstMatch(/^Title\s*[:\-]\s*(.+)/im, text) ||
    firstLine;

  // ── Destination — labelled first, otherwise scan for a known place ───
  const labelledDest =
    firstMatch(/Destination\s*[:\-]\s*([^\n]+)/i, text) ||
    firstMatch(/Country\s*[:\-]\s*([^\n]+)/i, text) ||
    firstMatch(/Location\s*[:\-]\s*([^\n]+)/i, text);

  const foundDests = [];
  for (const d of DESTINATIONS) {
    const re = new RegExp(`\\b${d.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(text)) foundDests.push(d);
  }
  const destination = labelledDest || foundDests.slice(0, 3).join(', ');

  // ── Duration ─────────────────────────────────────────────────────────
  const duration =
    Number(firstMatch(/(\d+)\s*(?:day|night)s?\s*(?:\/|and|&|,)\s*\d+\s*(?:night|day)s?/i, text)) ||
    Number(firstMatch(/Duration\s*[:\-]\s*(\d+)/i, text)) ||
    Number(firstMatch(/(\d+)\s*[- ]?days?\s+package/i, text)) ||
    // Count "Day 1", "Day 2", ... occurrences
    (() => {
      const m = [...text.matchAll(/\bDay\s*(\d+)\b/gi)];
      if (m.length >= 2) return Math.max(...m.map(x => Number(x[1])));
      return null;
    })() ||
    Number(firstMatch(/\b(\d{1,2})\s*days?\b/i, text)) ||
    null;

  // ── Max guests ───────────────────────────────────────────────────────
  const maxGuests =
    Number(firstMatch(/Max(?:imum)?\s*(?:Guests?|Pax|People|Travell?ers?)\s*[:\-]?\s*(\d+)/i, text)) ||
    Number(firstMatch(/Group\s*Size\s*[:\-]?\s*(\d+)/i, text)) ||
    Number(firstMatch(/\b(?:up\s*to|maximum)\s*(\d+)\s*(?:guests?|pax|people)/i, text)) ||
    null;

  // ── Price ────────────────────────────────────────────────────────────
  const price = parsePrice(text);

  // ── Description ──────────────────────────────────────────────────────
  let description =
    firstMatch(/Description\s*[:\-]\s*([\s\S]+?)(?=\n\s*(?:Itinerary|Includes?|Day\s*\d)\b)/i, text) ||
    firstMatch(/Overview\s*[:\-]\s*([\s\S]+?)(?=\n\s*(?:Itinerary|Includes?|Day\s*\d)\b)/i, text) ||
    firstMatch(/Summary\s*[:\-]\s*([\s\S]+?)(?=\n\s*(?:Itinerary|Includes?|Day\s*\d)\b)/i, text);

  // Fallback: use the first real paragraph (skip the title line).
  if (!description || description.trim().length < 40) {
    const paragraph = lines
      .slice(1)                                  // skip title
      .filter(l => l.length > 40 && !/^Day\s*\d/i.test(l) && !/^(Includes?|Excludes?|Price|Duration|Destination|Itinerary)\b/i.test(l))
      .slice(0, 4)
      .join(' ');
    if (paragraph.length > 40) description = paragraph;
  }

  // ── Includes / Excludes — try label extraction first ────────────────
  let includes = extractList(text, 'Inclusions?|Includes?|What\'?s\\s*Included');
  let excludes = extractList(text, 'Exclusions?|Excludes?|What\'?s\\s*Not\\s*Included|Not\\s*Included');

  // Fallback: pick lines that look like bullet items even without a heading
  if (!includes) {
    const bulletLines = lines
      .filter(l => /^[•·*✓\-–—]/.test(l) && l.length < 120 && !/exclud|not\s+included/i.test(l))
      .slice(0, 8)
      .map(l => l.replace(/^[•·*✓\-–—\s]+/, ''));
    if (bulletLines.length >= 2) includes = bulletLines.join('\n');
  }

  // ── Itinerary ────────────────────────────────────────────────────────
  const itinerary = extractItineraryDays(text);

  // ── Ultimate fallback: stash raw text in description so nothing is lost
  if (!description) {
    description = text.slice(0, 800);
  }

  return {
    name: (name || '').trim().slice(0, 120),
    description: (description || '').trim().slice(0, 2000),
    destination: (destination || '').trim().slice(0, 200),
    duration_days: duration || (itinerary.length || ''),
    price_per_person: price?.amount || '',
    currency: price?.currency || 'USD',
    max_guests: maxGuests || '',
    includes: includes || '',
    excludes: excludes || '',
    category: detectCategory(text),
    status: 'active',
    // Store as a JSON string — that's what PackageItineraryEditor expects.
    itinerary_days: itinerary.length ? JSON.stringify(itinerary) : '',
    // Stash the full raw extract so nothing's ever lost — users can re-run
    // parsing or copy fields manually.
    _raw_text: text.slice(0, 20000),
  };
}

export async function extractFromPdf(file) {
  const raw = await extractPdfText(file);
  return { raw, parsed: parsePackageFromText(raw) };
}

// ───── Excel / CSV ─────────────────────────────────────────────────────────

let xlsxPromise = null;
async function loadXlsx() {
  if (!xlsxPromise) xlsxPromise = import('xlsx').then(m => m.default || m);
  return xlsxPromise;
}

const COLUMN_ALIASES = {
  name:             ['name', 'package', 'package name', 'title', 'tour', 'tour name'],
  description:      ['description', 'overview', 'summary', 'about'],
  destination:      ['destination', 'country', 'location', 'region'],
  duration_days:    ['duration', 'duration days', 'days', 'nights', 'length'],
  price_per_person: ['price', 'price per person', 'pp price', 'rate', 'cost', 'amount'],
  currency:         ['currency', 'ccy'],
  max_guests:       ['max guests', 'max pax', 'group size', 'capacity', 'max people'],
  includes:         ['includes', 'inclusions', 'included', 'what\'s included'],
  excludes:         ['excludes', 'exclusions', 'excluded', 'what\'s not included', 'not included'],
  category:         ['category', 'level', 'tier', 'class'],
  image_url:        ['image', 'image url', 'photo', 'picture'],
};

function normKey(k) { return String(k || '').toLowerCase().trim().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' '); }

function mapRow(row) {
  const out = {};
  const normalized = {};
  Object.keys(row).forEach(k => { normalized[normKey(k)] = row[k]; });

  for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const a of aliases) {
      if (normalized[a] != null && normalized[a] !== '') {
        out[target] = normalized[a];
        break;
      }
    }
  }

  // Normalize types
  if (out.duration_days)    out.duration_days    = Number(String(out.duration_days).match(/\d+/)?.[0] || 0);
  if (out.price_per_person) out.price_per_person = Number(String(out.price_per_person).replace(/[^0-9.]/g, '')) || '';
  if (out.max_guests)       out.max_guests       = Number(String(out.max_guests).match(/\d+/)?.[0] || 0);
  if (out.currency)         out.currency         = String(out.currency).toUpperCase().slice(0, 4);
  else                      out.currency         = 'USD';
  if (!out.category)        out.category         = 'mid_range';
  if (!out.status)          out.status           = 'active';

  // Collect Day 1..N columns for itinerary if present
  const dayCols = Object.keys(normalized)
    .map(k => ({ k, m: k.match(/^day\s*(\d+)/i) }))
    .filter(x => x.m)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]));
  if (dayCols.length) {
    out.itinerary_days = dayCols.map(x => ({
      day: Number(x.m[1]),
      title: `Day ${x.m[1]}`,
      description: String(normalized[x.k] || '').trim(),
    }));
  } else {
    out.itinerary_days = [];
  }

  return out;
}

export async function extractFromExcel(file) {
  const XLSX = await loadXlsx();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheets = {};
  const packages = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    sheets[sheetName] = rows;
    for (const r of rows) {
      const mapped = mapRow(r);
      if (mapped.name) packages.push(mapped);
    }
  }

  return {
    raw: sheets,
    parsed: packages[0] || {},  // primary
    allPackages: packages,       // every row that had a "name"
  };
}

// ───── Universal entry ─────────────────────────────────────────────────────

export async function extractPackageFromFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { kind: 'pdf',   ...(await extractFromPdf(file)) };
  if (['xlsx','xls','csv','ods'].includes(ext)) {
    return { kind: 'excel', ...(await extractFromExcel(file)) };
  }
  throw new Error(`Unsupported file type: .${ext}. Upload a PDF, XLSX, XLS, CSV, or ODS file.`);
}
