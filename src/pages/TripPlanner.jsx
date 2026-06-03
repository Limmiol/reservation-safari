import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2, Users, CalendarDays, MapPin, DollarSign, Heart, Compass, ArrowRight, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { NATIONAL_PARKS, COUNTRIES, ACCOMMODATION_CATEGORIES, ACTIVITY_CATEGORIES } from '@/lib/safariData';
import RouteMap from '@/components/RouteMap';

/**
 * AI-style Trip Planner
 * ---------------------
 * Free-text → structured trip brief. No LLM required — we use deterministic
 * keyword heuristics against our safariData catalogue so agents get a fast,
 * explainable draft they can hand straight to the Quote Builder.
 */

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
// Each short token maps to the full month name at the same index
const MONTHS_SHORT = [
  ['jan','january'], ['feb','february'], ['mar','march'], ['apr','april'],
  ['may','may'], ['jun','june'], ['jul','july'], ['aug','august'],
  ['sep','september'], ['sept','september'], ['oct','october'], ['nov','november'], ['dec','december'],
];

// Interests catalogue — each maps to tags/activities we already know about.
const INTERESTS = [
  { key: 'big_five',   label: 'Big Five',         words: ['big five','big 5','lion','leopard','elephant','rhino','buffalo'] },
  { key: 'migration',  label: 'Great Migration',  words: ['migration','wildebeest','calving','river crossing','mara crossing'] },
  { key: 'gorilla',    label: 'Gorilla Trekking', words: ['gorilla','gorillas','silverback','bwindi','volcanoes'] },
  { key: 'chimp',      label: 'Chimpanzee',       words: ['chimp','chimpanzee','kibale','mahale','nyungwe'] },
  { key: 'beach',      label: 'Beach Extension',  words: ['beach','zanzibar','diani','mombasa','coast','ocean','island'] },
  { key: 'culture',    label: 'Cultural',         words: ['maasai','culture','cultural','village','tribe','bushmen','hadzabe'] },
  { key: 'honeymoon',  label: 'Honeymoon',        words: ['honeymoon','romantic','couple','anniversary'] },
  { key: 'family',     label: 'Family',           words: ['family','kids','children','child','teen','teens'] },
  { key: 'birding',    label: 'Birding',          words: ['bird','birding','birdwatch','flamingo'] },
  { key: 'photography',label: 'Photography',      words: ['photo','photography','photographer','lens'] },
  { key: 'walking',    label: 'Walking Safari',   words: ['walking safari','foot safari','hike','trek'] },
  { key: 'balloon',    label: 'Hot-air Balloon',  words: ['balloon','hot air','sunrise flight'] },
  { key: 'adventure',  label: 'Adventure',        words: ['adventure','adrenaline','rafting','climbing','kilimanjaro','meru'] },
];

const BUDGET_WORDS = {
  budget:     ['budget','cheap','affordable','low cost','shoestring','backpack'],
  mid_range:  ['mid range','mid-range','comfortable','standard','midrange'],
  luxury:     ['luxury','luxurious','high end','premium','upscale','fancy'],
  ultra:      ['ultra luxury','ultra-luxury','exclusive','private jet','bespoke','five star','5 star','5-star'],
};

// ── Parser ──────────────────────────────────────────────────────────────────

function extractNumber(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

// Common park-name typos & aliases (keyed to catalogue ids).
const PARK_ALIASES = {
  tarangire:   ['tangerine', 'tarangile', 'tarengire', 'tarangir'],
  ngorongoro:  ['ngoro', 'ngorogoro', 'ngorogoro crater', 'ngorongoro crater', 'crater'],
  serengeti:   ['serangeti', 'serengetti'],
  lake_manyara:['manyara', 'lake manyara'],
  masai_mara:  ['maasai mara', 'masaai mara', 'the mara', 'maasai-mara'],
  bwindi:      ['bwindi impenetrable', 'impenetrable forest'],
  volcanoes:   ['parc des volcans', 'parc national des volcans', 'musanze'],
  queen_elizabeth: ['queen elizabeth', 'qenp'],
  kilimanjaro: ['kili'],
  nyerere:     ['selous', 'selous reserve'],
};

// Pull structured "Key:: value" or "Key: value" pairs out of the text so we
// can read fields like "Safari duration in days:: 3" where the number follows
// the word "days" instead of preceding it.
function extractKeyedField(text, keywords) {
  // keywords: array of phrases that could identify the field (case-insensitive)
  for (const kw of keywords) {
    const re = new RegExp(
      `${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:=-]{1,3}\\s*([^\\n]+)`,
      'i',
    );
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function firstNumber(str) {
  if (!str) return null;
  const m = String(str).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function parseBrief(raw) {
  const rawLower = raw.toLowerCase();
  const text = ` ${rawLower.trim()} `;
  if (!text.trim()) return null;

  // ── Structured field extraction (handles "Key:: value" client briefs) ────
  // Look first in structured fields — they're authoritative when present.

  const durationField = extractKeyedField(rawLower, [
    'safari duration in days',
    'duration in days',
    'trip duration',
    'safari duration',
    'duration',
    'length of safari',
    'number of days',
    'no of days',
  ]);

  const budgetAmountField = extractKeyedField(rawLower, [
    'trip budget amount',
    'budget amount',
    'total budget',
    'budget total',
    'budget',
  ]);
  const budgetCurrencyField = extractKeyedField(rawLower, [
    'trip budget currency',
    'budget currency',
    'currency',
  ]);

  const adultsField = extractKeyedField(rawLower, [
    'number of adults', 'no of adults', 'adults', 'number of travellers',
    'number of travelers', 'party size', 'pax', 'group size',
  ]);
  const childrenField = extractKeyedField(rawLower, [
    'number of children', 'no of children', 'children', 'kids', 'number of kids',
  ]);

  const accommodationField = extractKeyedField(rawLower, [
    'safari accommodation', 'accommodation', 'accommodation level',
    'lodge preference', 'lodging',
  ]);

  const destinationField = extractKeyedField(rawLower, [
    'north tanzania or south tanzania, or kenya',
    'tanzania holiday selections',
    'destination', 'region', 'safari destination', 'where would you like to go',
  ]);

  const transportField = extractKeyedField(rawLower, [
    'safari transportation preference', 'transportation', 'transport',
    'transfer type', 'getting around',
  ]);

  const priorityField = extractKeyedField(rawLower, [
    'most important for client', 'most important', 'priority', 'top priority',
    'what matters most',
  ]);

  // ── Duration ─────────────────────────────────────────────────────────────
  // 1. Structured field wins
  let days = null;
  if (durationField) days = firstNumber(durationField);
  // 2. Natural-language patterns — "7 days", "10-day", "for 5 nights"
  if (days == null) {
    days = extractNumber(text, [
      /\b(\d{1,2})\s*[-–]?\s*days?\b/,
      /\b(\d{1,2})\s*[-–]?\s*nights?\b/,
    ]);
  }
  // 3. Reversed pattern — "days: 3", "duration in days — 3"
  if (days == null) {
    const m = text.match(/\b(?:days?|duration|length)\s*[:=-]{1,3}\s*(\d{1,2})\b/);
    if (m) days = parseInt(m[1], 10);
  }
  // 4. Weeks
  if (days == null) {
    const weeks = extractNumber(text, [/\b(\d{1,2})\s*weeks?\b/]);
    if (weeks) days = weeks * 7;
    else if (/\ba week\b/.test(text)) days = 7;
    else if (/\ba fortnight\b/.test(text)) days = 14;
  }
  if (days != null) days = Math.max(1, Math.min(60, Math.floor(days)));

  // ── Travellers ───────────────────────────────────────────────────────────
  let adults = null;
  if (adultsField) adults = firstNumber(adultsField);
  if (adults == null) {
    adults = extractNumber(text, [
      /(\d+)\s*adults?/,
      /(\d+)\s*pax/,
      /for\s+(\d+)\s+(?:people|travell?ers|guests?)/,
    ]);
  }
  if (adults == null) {
    if (/\bhoneymoon\b|\bcouple\b/.test(text)) adults = 2;
    else if (/\bsolo\b/.test(text)) adults = 1;
  }

  let children = childrenField ? firstNumber(childrenField) : null;
  if (children == null) {
    children = extractNumber(text, [/(\d+)\s*(?:kids?|child|children|teens?|minors?)/]) || 0;
  }

  // ── Budget ───────────────────────────────────────────────────────────────
  let budget = null;
  let currency = null;
  if (budgetCurrencyField) {
    const cm = budgetCurrencyField.match(/\b(usd|eur|gbp|tzs|kes|ugx|rwf|zar|aud|cad)\b/i);
    if (cm) currency = cm[1].toUpperCase();
  }
  if (budgetAmountField) {
    const n = firstNumber(budgetAmountField);
    if (n != null) {
      // "10k" is often shorthand even in structured fields
      budget = /\bk\b/.test(budgetAmountField) && n < 1000 ? n * 1000 : n;
    }
  }
  if (budget == null) {
    const m$ = text.match(/\$\s?([\d,\.]+)\s*(k|thousand)?/) ||
               text.match(/\b(?:usd|eur|gbp)\s*([\d,\.]+)\s*(k|thousand)?/);
    if (m$) {
      let n = parseFloat(m$[1].replace(/,/g, ''));
      if (m$[2]) n *= 1000;
      if (Number.isFinite(n)) budget = Math.round(n);
    } else {
      const mK = text.match(/(\d+)\s*k\s*(?:budget|total)/);
      if (mK) budget = parseInt(mK[1], 10) * 1000;
    }
  }

  // ── Tier ────────────────────────────────────────────────────────────────
  // Structured accommodation field takes precedence
  let tier = null;
  const tierSource = `${accommodationField || ''} ${rawLower}`;
  if (/ultra[- ]?luxury|5[- ]?star|five[- ]?star/.test(tierSource)) tier = 'ultra';
  else if (/\bluxury\b|\bpremium\b|\bupscale\b/.test(tierSource)) tier = 'luxury';
  else if (/\bmid[- ]?range\b|\bmidrange\b|\bcomfortable\b|\bstandard\b/.test(tierSource)) tier = 'mid_range';
  else if (/\bbudget\b|\bcheap\b|\baffordable\b|\bshoestring\b|\bbest price\b|\bbest[- ]priced\b/.test(tierSource)) tier = 'budget';
  // "Mix of mid-range and luxury" → prefer the higher of the two
  if (/\b(mid[- ]?range|midrange).{0,12}(luxury|premium)\b/.test(tierSource) ||
      /\b(luxury|premium).{0,12}(mid[- ]?range|midrange)\b/.test(tierSource)) {
    tier = 'luxury';
  }

  // ── Countries ───────────────────────────────────────────────────────────
  const countries = COUNTRIES
    .filter(c => c !== 'All')
    .filter(c => {
      const needle = c.toLowerCase();
      // Require word boundary so "Tanzania" doesn't match inside "North Tanzania" twice
      return new RegExp(`\\b${needle}\\b`).test(text);
    });

  // ── Parks (with typo / alias tolerance) ─────────────────────────────────
  const parkIdsFound = new Set();
  NATIONAL_PARKS.forEach(p => {
    const shortName = p.name.toLowerCase()
      .replace(/national park|conservation area|reserve|forest/g, '').trim();
    if (text.includes(shortName) || text.includes(p.id.replace(/_/g, ' '))) {
      parkIdsFound.add(p.id);
    }
    // Alias check
    const aliases = PARK_ALIASES[p.id] || [];
    if (aliases.some(a => text.includes(a))) parkIdsFound.add(p.id);
  });
  const parks = NATIONAL_PARKS.filter(p => parkIdsFound.has(p.id));

  // ── Interests ───────────────────────────────────────────────────────────
  const interests = INTERESTS.filter(i => i.words.some(w => text.includes(w)));

  // ── Months / season ─────────────────────────────────────────────────────
  const months = MONTHS.filter(m => text.includes(m));
  MONTHS_SHORT.forEach(([short, full]) => {
    if (new RegExp(`\\b${short}\\b`).test(text) && !months.includes(full)) {
      months.push(full);
    }
  });

  // ── Accommodation category ──────────────────────────────────────────────
  // Honour the structured accommodation field when it contains a known label
  const accommodation = ACCOMMODATION_CATEGORIES.find(c => {
    const label = (c?.label || c?.id || '').toLowerCase();
    if (!label) return false;
    const probe = accommodationField || text;
    return probe.includes(label.split(' ')[0]);
  }) || null;

  // ── Activity categories ─────────────────────────────────────────────────
  const activityTypes = ACTIVITY_CATEGORIES.filter(c => {
    const label = (c?.label || c?.id || '').toLowerCase();
    return label && text.includes(label.split(' ')[0]);
  });

  // ── Special flags (transport, priority, etc.) ───────────────────────────
  const transportText = `${transportField || ''} ${text}`;
  const flags = {
    private_vehicle: /\bprivate\s+(?:vehicle|car|safari|guide)\b/.test(text),
    fly_in:          /\bfly[-\s]?in\b|\bcharter\b|\bbush plane\b|\bflying\b/.test(transportText),
    drive_in:        /\bdrive[-\s]?in\b|\bdrive[-\s]?out\b|\broad safari\b|\bby road\b/.test(transportText),
    self_drive:      /\bself[-\s]?drive\b/.test(text),
    guided:          /\bguided\b|\bguide\b/.test(text),
    camping:         /\bcamp(?:ing|site)\b|\btent\b/.test(text),
  };

  // Priority (what the client values most)
  let priority = null;
  const priorityText = (priorityField || '').toLowerCase();
  if (/\bbest price|cheapest|lowest|most affordable/.test(priorityText)) priority = 'price';
  else if (/\bbest guide|great guide|experienced guide/.test(priorityText)) priority = 'guides';
  else if (/\bamazing lodge|best lodge|luxury lodge/.test(priorityText)) priority = 'lodges';

  return {
    days: days || null,
    adults: adults || null,
    children: children || 0,
    budget,
    currency: currency || (budget ? 'USD' : null),
    tier,
    countries,
    parks,
    interests,
    months,
    accommodation,
    activityTypes,
    flags,
    priority,
    // Keep raw structured fields for display/debugging
    _fields: {
      duration: durationField, budget: budgetAmountField, currency: budgetCurrencyField,
      adults: adultsField, children: childrenField, accommodation: accommodationField,
      destination: destinationField, transport: transportField, priority: priorityField,
    },
  };
}

// ── Recommendation engine ───────────────────────────────────────────────────

function scoreParks(brief) {
  if (!brief) return [];
  const byId = new Map();
  const add = (p, reason, points) => {
    const prev = byId.get(p.id) || { park: p, reasons: [], score: 0 };
    if (!prev.reasons.includes(reason)) prev.reasons.push(reason);
    prev.score += points;
    byId.set(p.id, prev);
  };

  // Direct mentions — strongest signal
  brief.parks.forEach(p => add(p, 'Mentioned by name', 100));

  // Country filter
  if (brief.countries.length > 0) {
    NATIONAL_PARKS.forEach(p => {
      if (brief.countries.includes(p.country)) add(p, `In ${p.country}`, 10);
    });
  }

  // Interest → tag matching
  brief.interests.forEach(intr => {
    NATIONAL_PARKS.forEach(p => {
      const haystack = [(p.tags || []).join(' '), p.description, (p.highlights || []).join(' ')]
        .join(' ').toLowerCase();
      if (intr.words.some(w => haystack.includes(w))) {
        add(p, intr.label, 25);
      }
    });
  });

  // Sort & cap
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}

function estimateItinerary(brief, recs) {
  // Hard guards — we never produce an itinerary longer than the brief asks for.
  const totalDays = Number(brief?.days);
  if (!Number.isFinite(totalDays) || totalDays < 1 || recs.length === 0) return [];
  const D = Math.max(1, Math.min(60, Math.floor(totalDays))); // clamp

  // Pick up to 4 parks, but at most one park per ~2 days so we never spread
  // thin. Single-day trips get a single park. 3-day trips get at most 2 parks.
  const maxParks = Math.min(recs.length, Math.max(1, Math.ceil(D / 2)));
  const parks = recs.slice(0, Math.min(maxParks, 4)).map(r => r.park);

  // Evenly distribute the middle days (excluding arrival day 1 and departure
  // day D) across parks.
  const middleDays = Math.max(0, D - 2);
  const perPark = parks.length > 0 ? Math.floor(middleDays / parks.length) : 0;
  let remainder = middleDays - perPark * parks.length;

  const out = [];
  // Day 1: Arrival (always)
  out.push({ day: 1, title: 'Arrival', location: parks[0]?.region, description: 'Arrive and transfer to lodge.' });

  // Single-day trip: just arrival as a day-trip.
  if (D === 1) return out;

  // Middle days split between parks
  let day = 2;
  parks.forEach((park) => {
    let nights = perPark + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    // At least 1 night per park if possible
    if (nights < 1 && day < D) nights = 1;
    for (let i = 0; i < nights && day < D; i++) {
      out.push({
        day,
        title: `${park.name} — Game Drives`,
        location: park.name,
        description: (park.highlights || []).slice(0, 2).join(' · ') || park.description?.slice(0, 120),
      });
      day += 1;
    }
  });

  // Any leftover middle days become transfer / leisure
  while (day < D) {
    out.push({ day, title: 'Transfer & Leisure', description: 'Internal transfer, optional activities.' });
    day += 1;
  }

  // Final day: Departure (only for D >= 2)
  out.push({ day: D, title: 'Departure', description: 'Transfer to airport for onward flight.' });

  // Final safety: never return more than D entries.
  return out.slice(0, D);
}

function estimateCost(brief, recs) {
  if (!brief) return null;
  const adults = brief.adults || 2;
  const children = brief.children || 0;
  // Cost always respects the (already-clamped) brief.days — with a 7-day
  // default only if the user didn't state a duration at all.
  const rawDays = Number(brief.days);
  const days = Number.isFinite(rawDays) && rawDays > 0
    ? Math.min(60, Math.floor(rawDays))
    : 7;
  // Transportation impact: fly-in is pricier than drive-in.
  const transportMult = brief.flags?.fly_in ? 1.25
                      : brief.flags?.drive_in ? 0.9
                      : 1;
  // Price-priority clients get a conservative tier even if they also
  // mentioned "luxury" — we warn them separately.
  const effectiveTier = brief.priority === 'price' ? 'budget' : (brief.tier || 'mid_range');
  const tierMult = {
    budget: 1,
    mid_range: 1.6,
    luxury: 2.8,
    ultra: 4.5,
  }[effectiveTier] || 1.6;
  // Baseline: park fees + lodge + vehicle + guide
  const dailyPerAdult = 350 * tierMult * transportMult;
  const dailyPerChild = 180 * tierMult * transportMult;
  const base = (adults * dailyPerAdult + children * dailyPerChild) * days;
  // Park gate fees (rough avg) — scaled by actual number of parks in itinerary
  const parkFees = recs.slice(0, Math.min(4, recs.length))
    .reduce((s, r) => s + (r.park.fees?.non_resident_adult || 60) * adults * 1.5, 0);
  return Math.round(base + parkFees);
}

// ── UI ──────────────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  '7-day Kenya luxury safari for 2 adults in July, big 5 + Masai Mara migration',
  '10 days Tanzania honeymoon, Serengeti balloon + Ngorongoro + Zanzibar beach, budget $12000',
  'Family trip 14 days, 2 adults 3 kids mid-range, gorilla trekking Uganda + Queen Elizabeth',
  'Solo photographer, 5 nights Samburu + Lake Nakuru, birding and leopard focus',
  // Structured client-brief format (mirrors inbound lead forms)
  `Safari duration in days:: 3
North Tanzania or South Tanzania, or Kenya?:: North Tanzania (Serengeti, Tarangire, Lake Manyara, Ngorongoro crater)
Safari accommodation:: Mix of mid-range and luxury (from $550 per person per day)
Safari transportation preference:: Drive-in and Drive-out
Trip Budget Currency:: USD
Trip Budget Amount (for entire group):: 1300
Most important for client:: Best priced trip`,
];

function StatCard({ icon: Icon, label, value, muted }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

export default function TripPlanner() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [brief, setBrief] = useState(null);

  const recs = useMemo(() => scoreParks(brief), [brief]);
  const itinerary = useMemo(() => estimateItinerary(brief, recs), [brief, recs]);
  const cost = useMemo(() => estimateCost(brief, recs), [brief, recs]);

  const run = () => {
    try {
      const parsed = parseBrief(text);
      // eslint-disable-next-line no-console
      console.log('[TripPlanner] parsed brief:', parsed);
      setBrief(parsed);
    } catch (err) {
      // Don't swallow silently — surface to console and keep UI alive.
      // eslint-disable-next-line no-console
      console.error('[TripPlanner] parseBrief failed:', err);
      setBrief({ days: null, adults: null, children: 0, budget: null, tier: null, countries: [], parks: [], interests: [], months: [], accommodation: null, activityTypes: [], flags: {} });
    }
  };

  const loadExample = (ex) => {
    setText(ex);
    try { setBrief(parseBrief(ex)); } catch (err) { console.error(err); }
  };

  const sendToQuoteBuilder = () => {
    // Pass a simple prefill payload via navigation state
    navigate('/safari-quote-builder', {
      state: {
        prefill: {
          brief,
          recs: recs.map(r => ({ id: r.park.id, name: r.park.name })),
          itinerary,
          estimate: cost,
        },
      },
    });
  };

  const sendToPackages = () => {
    navigate('/packages');
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title={<span className="flex items-center gap-2"><Sparkles className="w-6 h-6 text-amber-500" />Trip Planner</span>}
        description="Describe a dream safari in plain English — we'll pick parks, draft an itinerary, and estimate costs."
      />

      {/* Input */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <label className="text-sm font-medium">What's the trip?</label>
        <Textarea
          rows={4}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. 9-day Tanzania luxury honeymoon in August for 2 adults, Serengeti migration, balloon safari, Ngorongoro, finish on Zanzibar beach. Budget around $14,000."
          className="resize-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={run} disabled={!text.trim()}>
            <Wand2 className="w-4 h-4 mr-2" />Plan it
          </Button>
          {brief && (
            <Button variant="outline" onClick={() => { setText(''); setBrief(null); }}>
              <RefreshCw className="w-4 h-4 mr-2" />Reset
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            Keyword-based — no data leaves your browser.
          </div>
        </div>

        {/* Example chips */}
        {!brief && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">Try an example:</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => loadExample(ex)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Output */}
      {brief && (
        <>
          {/* Understanding strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={CalendarDays} label="Duration" value={brief.days ? `${brief.days} days` : '—'} muted={!brief.days} />
            <StatCard icon={Users}        label="Travellers" value={brief.adults ? `${brief.adults} adult${brief.adults === 1 ? '' : 's'}${brief.children ? ` + ${brief.children}` : ''}` : '—'} muted={!brief.adults} />
            <StatCard
              icon={DollarSign}
              label="Style / Budget"
              value={(brief.tier || '—').replace('_', ' ') + (brief.budget ? ` · ${brief.currency || 'USD'} ${brief.budget.toLocaleString()}` : '')}
            />
            <StatCard icon={MapPin}       label="Countries" value={brief.countries.length ? brief.countries.join(', ') : 'Auto-detect'} muted={!brief.countries.length} />
          </div>

          {/* Priority callout */}
          {brief.priority && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-amber-600" />
              <span className="text-amber-900 dark:text-amber-200">
                Client priority: <strong className="capitalize">{brief.priority === 'price' ? 'best price' : brief.priority === 'guides' ? 'best guides' : brief.priority === 'lodges' ? 'amazing lodges' : brief.priority}</strong>
                {brief.priority === 'price' && ' — we\'ll bias toward budget-friendly parks and lodges.'}
                {brief.priority === 'guides' && ' — we\'ll flag parks with top-rated guiding concessions.'}
                {brief.priority === 'lodges' && ' — we\'ll favour signature lodges and suites.'}
              </span>
            </div>
          )}

          {/* Interests + months */}
          <div className="flex flex-wrap gap-2">
            {brief.interests.map(i => (
              <Badge key={i.key} variant="secondary" className="gap-1"><Heart className="w-3 h-3" />{i.label}</Badge>
            ))}
            {brief.months.map(m => (
              <Badge key={m} variant="outline" className="gap-1 capitalize"><CalendarDays className="w-3 h-3" />{m}</Badge>
            ))}
            {Object.entries(brief.flags).filter(([, v]) => v).map(([k]) => (
              <Badge key={k} variant="outline" className="capitalize">{k.replace(/_/g, ' ')}</Badge>
            ))}
            {brief.interests.length === 0 && brief.months.length === 0 && (
              <div className="text-sm text-muted-foreground">No specific interests detected — we'll propose a balanced classic itinerary.</div>
            )}
          </div>

          {/* Recommended parks */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Compass className="w-4 h-4" />Recommended parks</h2>
            {recs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
                Couldn't confidently match any parks — try naming a country or interest (e.g. "Kenya big five", "Uganda gorilla").
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {recs.map(({ park, reasons, score }) => (
                  <div key={park.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    {park.image && (
                      <div className="aspect-video bg-muted">
                        <img src={park.image} alt={park.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm leading-tight">{park.name}</div>
                        <div className="text-[10px] font-semibold text-amber-600">{score}pt</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{park.country} · {park.best_time}</div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {reasons.slice(0, 3).map(r => (
                          <span key={r} className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Route map */}
          {recs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" />Route preview</h2>
              <RouteMap
                itinerary={itinerary.length > 0 ? itinerary : undefined}
                parkIds={itinerary.length === 0 ? recs.map(r => r.park.id) : undefined}
              />
            </section>
          )}

          {/* Draft itinerary */}
          {itinerary.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4" />Draft itinerary</h2>
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {itinerary.map(d => (
                  <div key={d.day} className="p-3 flex gap-3">
                    <div className="shrink-0 w-14 text-center">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Day</div>
                      <div className="text-lg font-bold text-[#0a3d62] dark:text-amber-400">{d.day}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{d.title}</div>
                      {d.location && <div className="text-xs text-muted-foreground">{d.location}</div>}
                      {d.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Estimate */}
          {cost != null && (() => {
            const cur = brief.currency || 'USD';
            const groupSize = (brief.adults || 2) + (brief.children || 0);
            const perPerson = Math.round(cost / Math.max(1, groupSize));
            // Shortfall hint: when tiny budget + price-priority, compute what's
            // realistically bookable.
            const shortfall = brief.budget != null && cost > brief.budget * 1.1;
            return (
            <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-900 p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Ballpark estimate (group total)</div>
                  <div className="text-3xl font-bold text-[#0a3d62] dark:text-amber-200">
                    {cur} {cost.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {brief.adults || 2} adult{(brief.adults || 2) === 1 ? '' : 's'}{brief.children ? ` + ${brief.children} child${brief.children === 1 ? '' : 'ren'}` : ''} · {brief.days ?? 7} days{brief.days == null ? ' (assumed)' : ''} · {(brief.tier || 'mid range').replace('_', ' ')}
                    {' · ≈ '}{cur} {perPerson.toLocaleString()} pp
                  </div>
                  {brief.budget != null && (
                    <div className={`text-xs mt-1 font-medium ${shortfall ? 'text-red-600' : cost < brief.budget * 0.8 ? 'text-green-600' : 'text-amber-700'}`}>
                      {shortfall
                        ? `↑ ${Math.round((cost / brief.budget - 1) * 100)}% over stated ${cur} ${brief.budget.toLocaleString()} budget`
                        : cost < brief.budget * 0.8
                        ? `↓ Well within budget (${cur} ${(brief.budget - cost).toLocaleString()} headroom)`
                        : 'In line with stated budget'}
                    </div>
                  )}
                  {shortfall && brief.priority === 'price' && (
                    <div className="text-xs mt-2 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-2 py-1.5">
                      ⚠ Budget is tight for this trip. Realistic options: (a) shorten to {Math.max(2, Math.floor((brief.days || 7) * (brief.budget / cost)))} days, (b) drop one park, or (c) switch to camping / budget tier.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={sendToPackages}>Browse packages</Button>
                  <Button onClick={sendToQuoteBuilder} className="bg-[#0a3d62] hover:bg-[#0a3d62]/90">
                    Open in Quote Builder<ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </section>
            );
          })()}
        </>
      )}
    </div>
  );
}
