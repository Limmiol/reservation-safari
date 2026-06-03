import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, Mountain, Hotel, Activity, User, DollarSign, Save, Plus, X,
  Calendar, Users, MapPin, ArrowRight, ArrowLeft, Check, FileText,
  TrendingUp, Layers, Trash2, Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import AccommodationPicker from '@/components/safari/AccommodationPicker';
import ActivityPicker from '@/components/safari/ActivityPicker';
import ParkFeeCalculator from '@/components/safari/ParkFeeCalculator';
import {
  NATIONAL_PARKS,
  calculateParkFees,
  calculateAccommodationTotal,
  calculateActivityTotal,
} from '@/lib/safariData';

const STEPS = [
  { id: 'trip',     label: 'Trip Details',   icon: Sparkles },
  { id: 'parks',    label: 'Parks & Fees',   icon: Mountain },
  { id: 'lodging',  label: 'Accommodation',  icon: Hotel },
  { id: 'activities', label: 'Activities',   icon: Activity },
  { id: 'review',   label: 'Review & Save',  icon: FileText },
];

const fmt = (n, cur = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n || 0);

// Map an itinerary produced by the Trip Planner into Quote Builder park entries.
// Matches itinerary day `location` (park name) against the NATIONAL_PARKS
// catalogue and sums consecutive / non-consecutive days at the same park.
function itineraryToParkDays(itinerary, recs) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return [];
  const nameToId = new Map();
  // Use recs first (they already came from the catalogue, so IDs are reliable)
  (recs || []).forEach(r => { if (r?.name && r?.id) nameToId.set(r.name.toLowerCase(), r.id); });
  // Fall back to the full catalogue for anything the recs missed
  NATIONAL_PARKS.forEach(p => { if (!nameToId.has(p.name.toLowerCase())) nameToId.set(p.name.toLowerCase(), p.id); });

  const dayCounts = new Map(); // parkId → days
  for (const entry of itinerary) {
    const loc = (entry?.location || '').toLowerCase().trim();
    if (!loc) continue;
    let pid = nameToId.get(loc);
    if (!pid) {
      // Loose contains match ("Serengeti National Park" vs "Serengeti")
      for (const [name, id] of nameToId) {
        if (loc.includes(name) || name.includes(loc)) { pid = id; break; }
      }
    }
    if (!pid) continue;
    dayCounts.set(pid, (dayCounts.get(pid) || 0) + 1);
  }
  return Array.from(dayCounts.entries()).map(([parkId, days]) => ({ parkId, days, vehicles: 1 }));
}

// Build a default start date from the first month detected in the brief.
// Uses the 5th of that month in the next upcoming occurrence.
function monthsToStartDate(months) {
  if (!Array.isArray(months) || months.length === 0) return '';
  const MONTH_INDEX = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11 };
  const m = MONTH_INDEX[(months[0] || '').toLowerCase()];
  if (m == null) return '';
  const now = new Date();
  const year = (m < now.getMonth()) ? now.getFullYear() + 1 : now.getFullYear();
  const d = new Date(year, m, 5);
  return d.toISOString().slice(0, 10);
}

// Translate a brief tier into the Quote Builder's season bucket.
// Luxury/ultra often travel peak; budget/mid align with high; unknown = high.
function tierToSeason(tier) {
  if (tier === 'ultra' || tier === 'luxury') return 'peak_season';
  if (tier === 'budget') return 'low_season';
  return 'high_season';
}

export default function SafariQuoteBuilder() {
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Trip details
  const [clientId,  setClientId]  = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [adults,    setAdults]    = useState(2);
  const [children,  setChildrenN] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [duration,  setDuration]  = useState(5);
  const [season,    setSeason]    = useState('high_season');
  const [currency,  setCurrency]  = useState('USD');
  const [resident,  setResident]  = useState(false);
  const [markup,    setMarkup]    = useState(15);
  const [tax,       setTax]       = useState(0);
  const [notes,     setNotes]     = useState('');

  // Itinerary pieces
  const [parkDays, setParkDays]             = useState([]); // [{ parkId, days, vehicles }]
  const [accommodations, setAccommodations] = useState([]); // [{ id, nights }]
  const [activities, setActivities]         = useState([]); // [{ id, adults, children }]

  // Pickers
  const [showAccPicker, setShowAccPicker] = useState(false);
  const [showActPicker, setShowActPicker] = useState(false);

  // Clients
  const [clients, setClients] = useState([]);
  useEffect(() => {
    base44.entities.Client.list('-created_date', 200)
      .then(setClients).catch(() => {});
  }, []);

  // ── Calculations ───────────────────────────────────────────────────────────
  const parkFeesTotal = useMemo(() => {
    return parkDays.reduce((sum, p) => {
      const r = calculateParkFees({
        parkId: p.parkId, adults, children, days: p.days, vehicles: p.vehicles, resident,
      });
      return sum + r.total;
    }, 0);
  }, [parkDays, adults, children, resident]);

  const accommodationTotal = useMemo(() => {
    return accommodations.reduce((sum, a) => {
      const r = calculateAccommodationTotal({
        accommodationId: a.id, adults, children, nights: a.nights, season,
      });
      return sum + r.total;
    }, 0);
  }, [accommodations, adults, children, season]);

  const activitiesTotal = useMemo(() => {
    return activities.reduce((sum, a) => {
      const r = calculateActivityTotal({
        activityId: a.id, adults: a.adults, children: a.children,
      });
      return sum + r.total;
    }, 0);
  }, [activities]);

  const subtotal = parkFeesTotal + accommodationTotal + activitiesTotal;
  const markupAmount = subtotal * (markup / 100);
  const taxable = subtotal + markupAmount;
  const taxAmount = taxable * (tax / 100);
  const grandTotal = taxable + taxAmount;
  const perPerson = (adults + children) > 0 ? grandTotal / (adults + children) : 0;

  // ── Itinerary actions ──────────────────────────────────────────────────────
  const addPark = (parkId) => {
    if (!parkId || parkDays.some(p => p.parkId === parkId)) return;
    setParkDays([...parkDays, { parkId, days: 2, vehicles: 1 }]);
  };
  const removePark = (parkId) => setParkDays(parkDays.filter(p => p.parkId !== parkId));

  const addAccommodations = (accs) => {
    const newList = [...accommodations];
    const existingIds = new Set(newList.map(x => x.id));
    accs.forEach(a => { if (!existingIds.has(a.id)) newList.push({ id: a.id, nights: 2 }); });
    setAccommodations(newList);
  };
  const removeAccommodation = (id) =>
    setAccommodations(accommodations.filter(a => a.id !== id));

  const addActivities = (acts) => {
    const newList = [...activities];
    const existingIds = new Set(newList.map(x => x.id));
    acts.forEach(a => {
      if (!existingIds.has(a.id)) newList.push({ id: a.id, adults, children });
    });
    setActivities(newList);
  };
  const removeActivity = (id) => setActivities(activities.filter(a => a.id !== id));

  // ── Client select handler ─────────────────────────────────────────────────
  const onClientChange = (id) => {
    setClientId(id);
    const c = clients.find(x => x.id === id);
    if (c) { setClientName(c.full_name); setClientEmail(c.email); }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const saveQuote = async () => {
    if (!clientName.trim()) {
      toast({ title: 'Missing info', description: 'Please select or enter a client name', variant: 'destructive' });
      setStep(0);
      return;
    }
    if (subtotal === 0) {
      toast({ title: 'Empty quote', description: 'Add at least one park, accommodation, or activity', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const lineItems = [
        ...parkDays.map(p => {
          const park = NATIONAL_PARKS.find(x => x.id === p.parkId);
          const r = calculateParkFees({ parkId: p.parkId, adults, children, days: p.days, vehicles: p.vehicles, resident });
          return { type: 'park_fee', label: `${park?.name} (${p.days} days)`, quantity: 1, rate: r.total, amount: r.total };
        }),
        ...accommodations.map(a => {
          const r = calculateAccommodationTotal({ accommodationId: a.id, adults, children, nights: a.nights, season });
          return { type: 'accommodation', label: `${r.accommodation?.name} (${a.nights} nights, ${season.replace('_', ' ')})`, quantity: 1, rate: r.total, amount: r.total };
        }),
        ...activities.map(a => {
          const r = calculateActivityTotal({ activityId: a.id, adults: a.adults, children: a.children });
          return { type: 'activity', label: `${r.activity?.name} × ${a.adults + a.children} pax`, quantity: 1, rate: r.total, amount: r.total };
        }),
      ];

      const quoteNumber = `QT-${Date.now().toString().slice(-8)}`;
      await base44.entities.Quote.create({
        quote_number: quoteNumber,
        client_id: clientId || null,
        client_name: clientName,
        client_email: clientEmail,
        num_guests: adults + children,
        subtotal,
        markup_percent: markup,
        markup_amount: markupAmount,
        tax: taxAmount,
        total: grandTotal,
        currency,
        status: 'draft',
        start_date: startDate || null,
        duration_days: duration,
        line_items: JSON.stringify(lineItems),
        notes,
      });
      toast({ title: 'Quote saved', description: `${quoteNumber} created successfully` });
      nav('/quotes');
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Step Navigation ────────────────────────────────────────────────────────
  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Smart Builder</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Safari Quote Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build a professional, itemized safari quote in minutes.
          </p>
        </div>
        <div className="text-right bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-900/40 px-4 py-3 rounded-xl min-w-56">
          <p className="text-xs text-muted-foreground">Running Total</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(grandTotal, currency)}</p>
          <p className="text-xs text-muted-foreground">
            {fmt(perPerson, currency)} per person
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-card border border-border rounded-xl p-1 flex items-center gap-1 mb-6 overflow-x-auto">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={cn(
                'flex-1 min-w-fit flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                isActive && 'bg-primary text-primary-foreground',
                !isActive && isDone && 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
                !isActive && !isDone && 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                isActive && 'bg-primary-foreground text-primary',
                !isActive && isDone && 'bg-emerald-500 text-white',
                !isActive && !isDone && 'bg-muted text-muted-foreground'
              )}>
                {isDone ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main panel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 md:p-6">
          {/* ─── STEP 0: TRIP DETAILS ─── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Trip Details
                </h2>
                <p className="text-xs text-muted-foreground">Who is this quote for and when?</p>
              </div>

              <div>
                <Label className="text-xs">Client</Label>
                <Select value={clientId} onValueChange={onClientChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select existing client or leave blank for a new one" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} <span className="text-muted-foreground text-xs">· {c.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Client Name</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Client Email</Label>
                  <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" placeholder="name@example.com" className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Adults</Label>
                  <Input type="number" min={0} value={adults} onChange={e => setAdults(Number(e.target.value) || 0)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Children</Label>
                  <Input type="number" min={0} value={children} onChange={e => setChildrenN(Number(e.target.value) || 0)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Start Date</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Duration (days)</Label>
                  <Input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value) || 1)} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Season</Label>
                  <Select value={season} onValueChange={setSeason}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low_season">Low Season</SelectItem>
                      <SelectItem value="high_season">High Season</SelectItem>
                      <SelectItem value="peak_season">Peak Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="KES">KES (KSh)</SelectItem>
                      <SelectItem value="TZS">TZS (TSh)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="flex items-center gap-2 mt-7 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resident}
                      onChange={e => setResident(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-muted-foreground">EAC Resident</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 1: PARKS ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-primary" /> Parks & Entry Fees
                </h2>
                <p className="text-xs text-muted-foreground">Add parks to visit. Fees auto-calculate.</p>
              </div>

              <div className="flex gap-2">
                <Select onValueChange={addPark}>
                  <SelectTrigger><SelectValue placeholder="+ Add a park to itinerary" /></SelectTrigger>
                  <SelectContent>
                    {NATIONAL_PARKS
                      .filter(p => !parkDays.some(pd => pd.parkId === p.id))
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} <span className="text-muted-foreground text-xs">· {p.country}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {parkDays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Mountain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No parks added yet. Pick one above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parkDays.map(pd => {
                    const park = NATIONAL_PARKS.find(p => p.id === pd.parkId);
                    const r = calculateParkFees({ parkId: pd.parkId, adults, children, days: pd.days, vehicles: pd.vehicles, resident });
                    return (
                      <div key={pd.parkId} className="border border-border rounded-xl p-4 bg-muted/20">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-foreground">{park?.name}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {park?.country} · {park?.region}</p>
                          </div>
                          <button onClick={() => removePark(pd.parkId)} className="text-muted-foreground hover:text-rose-600 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className="text-xs">Days</Label>
                            <Input
                              type="number" min={1}
                              value={pd.days}
                              onChange={e => setParkDays(parkDays.map(x => x.parkId === pd.parkId ? { ...x, days: Number(e.target.value) || 1 } : x))}
                              className="h-9 mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Vehicles</Label>
                            <Input
                              type="number" min={0}
                              value={pd.vehicles}
                              onChange={e => setParkDays(parkDays.map(x => x.parkId === pd.parkId ? { ...x, vehicles: Number(e.target.value) || 0 } : x))}
                              className="h-9 mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                          <span className="text-muted-foreground">Subtotal for this park</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmt(r.total, currency)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2: ACCOMMODATION ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-primary" /> Accommodation
                  </h2>
                  <p className="text-xs text-muted-foreground">Select lodges & camps for the stay.</p>
                </div>
                <Button onClick={() => setShowAccPicker(true)}>
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              {accommodations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Hotel className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No accommodation yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAccPicker(true)}>
                    <Plus className="w-4 h-4" /> Browse Lodges
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accommodations.map(a => {
                    const r = calculateAccommodationTotal({ accommodationId: a.id, adults, children, nights: a.nights, season });
                    const acc = r.accommodation;
                    return (
                      <div key={a.id} className="border border-border rounded-xl p-3 bg-muted/20 flex gap-3">
                        <img src={acc?.image} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-muted" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm text-foreground line-clamp-1">{acc?.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                <MapPin className="w-3 h-3 inline" /> {acc?.region} · {acc?.category?.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <button onClick={() => removeAccommodation(a.id)} className="text-muted-foreground hover:text-rose-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-end justify-between gap-3 mt-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Nights</Label>
                              <Input
                                type="number" min={1}
                                value={a.nights}
                                onChange={e => setAccommodations(accommodations.map(x => x.id === a.id ? { ...x, nights: Number(e.target.value) || 1 } : x))}
                                className="h-7 w-20"
                              />
                            </div>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums text-sm">{fmt(r.total, currency)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3: ACTIVITIES ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Activities & Experiences
                  </h2>
                  <p className="text-xs text-muted-foreground">Add balloon safaris, cultural visits, special activities.</p>
                </div>
                <Button onClick={() => setShowActPicker(true)}>
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activities added yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowActPicker(true)}>
                    <Plus className="w-4 h-4" /> Browse Activities
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map(a => {
                    const r = calculateActivityTotal({ activityId: a.id, adults: a.adults, children: a.children });
                    const act = r.activity;
                    return (
                      <div key={a.id} className="border border-border rounded-xl p-3 bg-muted/20 flex gap-3">
                        <img src={act?.image} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-muted" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm text-foreground line-clamp-1">{act?.name}</h3>
                              <p className="text-xs text-muted-foreground">{act?.duration}</p>
                            </div>
                            <button onClick={() => removeActivity(a.id)} className="text-muted-foreground hover:text-rose-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-end justify-between gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">A:</Label>
                              <Input
                                type="number" min={0} value={a.adults}
                                onChange={e => setActivities(activities.map(x => x.id === a.id ? { ...x, adults: Number(e.target.value) || 0 } : x))}
                                className="h-7 w-16"
                              />
                              <Label className="text-xs ml-1">C:</Label>
                              <Input
                                type="number" min={0} value={a.children}
                                onChange={e => setActivities(activities.map(x => x.id === a.id ? { ...x, children: Number(e.target.value) || 0 } : x))}
                                className="h-7 w-16"
                              />
                            </div>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums text-sm">{fmt(r.total, currency)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 4: REVIEW ─── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Review & Save
                </h2>
                <p className="text-xs text-muted-foreground">Add markup/tax and save the quote.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Percent className="w-3 h-3" /> Markup %</Label>
                  <Input type="number" min={0} step={0.5} value={markup} onChange={e => setMarkup(Number(e.target.value) || 0)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Percent className="w-3 h-3" /> Tax / VAT %</Label>
                  <Input type="number" min={0} step={0.5} value={tax} onChange={e => setTax(Number(e.target.value) || 0)} className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Notes to Client</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Terms, inclusions, special requests…"
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Breakdown</div>
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Mountain className="w-4 h-4" /> Park Fees ({parkDays.length} parks)</span>
                    <span className="tabular-nums">{fmt(parkFeesTotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Hotel className="w-4 h-4" /> Accommodation ({accommodations.length})</span>
                    <span className="tabular-nums">{fmt(accommodationTotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" /> Activities ({activities.length})</span>
                    <span className="tabular-nums">{fmt(activitiesTotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm font-medium">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{fmt(subtotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground">
                    <span>Markup ({markup}%)</span>
                    <span className="tabular-nums">{fmt(markupAmount, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground">
                    <span>Tax ({tax}%)</span>
                    <span className="tabular-nums">{fmt(taxAmount, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 font-bold bg-emerald-50 dark:bg-emerald-900/20">
                    <span>Grand Total</span>
                    <span className="tabular-nums text-emerald-700 dark:text-emerald-400 text-base">{fmt(grandTotal, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step nav */}
          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={prev} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={saveQuote} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Quote'}
              </Button>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="bg-card border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Live Summary
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{adults + children} pax · {duration} days · {season.replace('_', ' ')}</p>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Mountain className="w-3.5 h-3.5" /> Park Fees</span>
              <span className="tabular-nums">{fmt(parkFeesTotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Hotel className="w-3.5 h-3.5" /> Lodging</span>
              <span className="tabular-nums">{fmt(accommodationTotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Activities</span>
              <span className="tabular-nums">{fmt(activitiesTotal, currency)}</span>
            </div>
            <div className="border-t border-border my-2" />
            <div className="flex items-center justify-between font-semibold">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt(subtotal, currency)}</span>
            </div>
            {markup > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>+ {markup}% markup</span>
                <span className="tabular-nums">{fmt(markupAmount, currency)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>+ {tax}% tax</span>
                <span className="tabular-nums">{fmt(taxAmount, currency)}</span>
              </div>
            )}
            <div className="border-t border-border my-2" />
            <div className="flex items-center justify-between text-base font-bold text-emerald-700 dark:text-emerald-400">
              <span>Total</span>
              <span className="tabular-nums">{fmt(grandTotal, currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {fmt(perPerson, currency)} / person
            </p>
          </div>

          {/* Itinerary overview */}
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itinerary</p>
            {parkDays.length + accommodations.length + activities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nothing added yet.</p>
            ) : (
              <div className="space-y-1 text-xs">
                {parkDays.map(pd => {
                  const p = NATIONAL_PARKS.find(x => x.id === pd.parkId);
                  return <div key={pd.parkId} className="flex items-center gap-1.5 text-muted-foreground"><Mountain className="w-3 h-3 flex-shrink-0 text-emerald-600" /> {p?.name} × {pd.days}d</div>;
                })}
                {accommodations.map(a => {
                  const acc = calculateAccommodationTotal({ accommodationId: a.id }).accommodation;
                  return <div key={a.id} className="flex items-center gap-1.5 text-muted-foreground"><Hotel className="w-3 h-3 flex-shrink-0 text-blue-600" /> {acc?.name} × {a.nights}n</div>;
                })}
                {activities.map(a => {
                  const act = calculateActivityTotal({ activityId: a.id }).activity;
                  return <div key={a.id} className="flex items-center gap-1.5 text-muted-foreground"><Activity className="w-3 h-3 flex-shrink-0 text-amber-600" /> {act?.name}</div>;
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pickers */}
      <AccommodationPicker
        open={showAccPicker}
        onClose={() => setShowAccPicker(false)}
        multiple
        initialIds={accommodations.map(a => a.id)}
        onSelect={(picked) => { addAccommodations(picked); }}
      />
      <ActivityPicker
        open={showActPicker}
        onClose={() => setShowActPicker(false)}
        multiple
        initialIds={activities.map(a => a.id)}
        onSelect={(picked) => { addActivities(picked); }}
      />
    </div>
  );
}
