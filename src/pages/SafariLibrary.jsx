import React, { useState, useMemo, useEffect } from 'react';
import {
  Mountain, MapPin, Star, Clock, DollarSign, Users, Search, Check, Plus, X,
  TreePine, Hotel, Activity, Camera, ChevronRight, Globe, Calendar, Ruler,
  Shield, Zap, Info, ArrowLeft, ExternalLink, Award, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NATIONAL_PARKS,
  ACCOMMODATIONS,
  ACTIVITIES,
  REGIONS,
  ACCOMMODATION_CATEGORIES,
} from '@/lib/safariData';

// ─── Utility helpers ──────────────────────────────────────────────────────────

const fmt = (n) =>
  n != null ? `$${Number(n).toLocaleString()}` : '—';

const COUNTRIES = ['All', 'Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Zanzibar'];

const ACCOM_CAT_COLORS = {
  luxury:       'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  mid_range:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  budget:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  beach_resort: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

const ACTIVITY_CAT_COLORS = {
  game_drive:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  trekking:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cultural:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  water:       'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  aerial:      'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  walking:     'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  specialist:  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  dining:      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

const ACCOM_CAT_LABELS = {
  luxury: 'Luxury', mid_range: 'Mid-Range', budget: 'Budget', beach_resort: 'Beach Resort',
};

function labelCase(str = '') {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function StarRating({ value = 0 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('w-3.5 h-3.5', i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
        />
      ))}
    </div>
  );
}

function CategoryBadge({ category, map, className }) {
  const colorClass = map[category] || 'bg-muted text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorClass, className)}>
      {labelCase(category)}
    </span>
  );
}

// ─── Slide-over backdrop + panel ─────────────────────────────────────────────

function SlideOver({ open, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full sm:w-1/2 bg-background border-l border-border shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right-full duration-300">
        {children}
      </div>
    </>
  );
}

// ─── Park Detail Slide-over ───────────────────────────────────────────────────

function ParkDetailPanel({ park, onClose }) {
  if (!park) return null;
  const fees = park.fees || {};
  const extraFees = fees.extra_fees || [];

  return (
    <SlideOver open={!!park} onClose={onClose}>
      {/* Hero */}
      <div className="relative h-64 flex-shrink-0">
        <img
          src={park.image}
          alt={park.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl font-bold text-white">{park.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-4 h-4 text-white/80" />
            <span className="text-white/90 text-sm">{park.country} · {park.region}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 space-y-6">

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          {park.area_km2 && (
            <span className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground">
              <Ruler className="w-3.5 h-3.5" />
              {Number(park.area_km2).toLocaleString()} km²
            </span>
          )}
          {park.best_time && (
            <span className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-sm">
              <Calendar className="w-3.5 h-3.5" />
              {park.best_time}
            </span>
          )}
          {park.country && (
            <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-sm">
              <Globe className="w-3.5 h-3.5" />
              {park.country}
            </span>
          )}
        </div>

        {/* Description */}
        {park.description && (
          <div>
            <h3 className="font-semibold text-foreground mb-2">About</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{park.description}</p>
          </div>
        )}

        {/* Highlights */}
        {park.highlights?.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-3">Highlights</h3>
            <ul className="space-y-2">
              {park.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fee Table */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Park Entry Fees (per person per day)
          </h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Fee (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fees.non_resident_adult != null && (
                  <tr className="bg-background hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-foreground">Non-Resident Adult</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(fees.non_resident_adult)}</td>
                  </tr>
                )}
                {fees.non_resident_child != null && (
                  <tr className="bg-background hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-foreground">Non-Resident Child</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(fees.non_resident_child)}</td>
                  </tr>
                )}
                {fees.resident_adult != null && (
                  <tr className="bg-background hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-foreground">EAC Resident Adult</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(fees.resident_adult)}</td>
                  </tr>
                )}
                {fees.resident_child != null && (
                  <tr className="bg-background hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-foreground">EAC Resident Child</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(fees.resident_child)}</td>
                  </tr>
                )}
                {fees.vehicle_fee != null && (
                  <tr className="bg-background hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-foreground">Vehicle Fee</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(fees.vehicle_fee)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Extra fees */}
          {extraFees.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Fees</p>
              {extraFees.map((fee, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">{fee.name || fee.description || 'Additional Fee'}</span>
                  <span className="font-medium text-foreground">{fmt(fee.amount ?? fee.fee)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Fees are per person per day unless stated otherwise. Prices subject to change — verify with the park authority before quoting.
          </p>
        </div>

        {/* Tags */}
        {park.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {park.tags.map((tag, i) => (
              <span key={i} className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="pt-2 border-t border-border flex gap-3">
          <Button className="flex-1" onClick={onClose}>
            <Plus className="w-4 h-4" />
            Use in Quote
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}

// ─── Accommodation Detail Slide-over ─────────────────────────────────────────

function AccommodationDetailPanel({ accommodation: acc, onClose }) {
  const [activeImg, setActiveImg] = useState(0);
  if (!acc) return null;

  const images = acc.images?.length ? acc.images : (acc.image ? [acc.image] : []);
  const pricing = acc.pricing || {};

  return (
    <SlideOver open={!!acc} onClose={onClose}>
      {/* Gallery */}
      <div className="relative h-64 flex-shrink-0 bg-muted">
        <img
          src={images[activeImg] || acc.image}
          alt={acc.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 flex gap-1.5">
            {images.slice(0, 6).map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={cn(
                  'w-10 h-10 rounded overflow-hidden border-2 transition-all',
                  i === activeImg ? 'border-white scale-105' : 'border-white/40 opacity-70'
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="absolute bottom-4 right-4">
          <CategoryBadge category={acc.category} map={ACCOM_CAT_COLORS} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{acc.name}</h2>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {acc.region}{acc.country ? `, ${acc.country}` : ''}
            </div>
            {acc.type && <span className="text-sm text-muted-foreground">· {acc.type}</span>}
            {acc.rating && <StarRating value={acc.rating} />}
          </div>
        </div>

        {/* Description */}
        {acc.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{acc.description}</p>
        )}

        {/* Amenities */}
        {acc.amenities?.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-2.5">Amenities</h3>
            <div className="flex flex-wrap gap-1.5">
              {acc.amenities.map((a, i) => (
                <span key={i} className="flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3 text-emerald-500" />
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Room Types */}
        {acc.room_types?.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-3">Room Types</h3>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Room</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {acc.room_types.map((rt, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {typeof rt === 'string' ? rt : (rt.name || rt.type)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                        {typeof rt === 'object' && rt.capacity ? `${rt.capacity} pax` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Meal Plans */}
        {acc.meal_plans?.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-2">Meal Plans</h3>
            <div className="flex flex-wrap gap-2">
              {acc.meal_plans.map((mp, i) => (
                <span key={i} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full">
                  {mp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        {(pricing.low_season || pricing.high_season || pricing.peak_season) && (
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Pricing (per person sharing)
            </h3>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Season</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">PPS</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Single Supp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pricing.low_season && (
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-foreground">Low Season</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(pricing.low_season.pps)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(pricing.low_season.single_supplement)}</td>
                    </tr>
                  )}
                  {pricing.high_season && (
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-foreground">High Season</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(pricing.high_season.pps)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(pricing.high_season.single_supplement)}</td>
                    </tr>
                  )}
                  {pricing.peak_season && (
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-foreground">Peak Season</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">{fmt(pricing.peak_season.pps)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(pricing.peak_season.single_supplement)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-2 border-t border-border flex gap-3">
          <Button className="flex-1" onClick={onClose}>
            <Plus className="w-4 h-4" />
            Add to Quote
          </Button>
          <Button variant="outline" onClick={onClose}>
            <Layers className="w-4 h-4" />
            Add to Package
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}

// ─── Activity Detail inline panel ────────────────────────────────────────────

function ActivityDetailPanel({ activity: act, onClose }) {
  if (!act) return null;
  return (
    <SlideOver open={!!act} onClose={onClose}>
      <div className="relative h-56 flex-shrink-0">
        <img
          src={act.image}
          alt={act.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="absolute bottom-4 left-4">
          <h2 className="text-xl font-bold text-white">{act.name}</h2>
          <CategoryBadge category={act.category} map={ACTIVITY_CAT_COLORS} className="mt-1" />
        </div>
      </div>
      <div className="flex-1 p-6 space-y-5">
        {/* Meta */}
        <div className="flex flex-wrap gap-3">
          {act.duration && (
            <span className="flex items-center gap-1.5 bg-muted text-muted-foreground text-sm px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" /> {act.duration}
            </span>
          )}
          {act.price_per_person != null && (
            <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm px-3 py-1 rounded-full">
              <DollarSign className="w-3.5 h-3.5" /> {fmt(act.price_per_person)} / person
            </span>
          )}
          {(act.min_guests || act.max_guests) && (
            <span className="flex items-center gap-1.5 bg-muted text-muted-foreground text-sm px-3 py-1 rounded-full">
              <Users className="w-3.5 h-3.5" /> {act.min_guests ?? 1}–{act.max_guests ?? '∞'} guests
            </span>
          )}
        </div>

        {act.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{act.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {act.includes?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" /> Includes
              </h4>
              <ul className="space-y-1">
                {act.includes.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">·</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {act.excludes?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <X className="w-4 h-4 text-rose-500" /> Excludes
              </h4>
              <ul className="space-y-1">
                {act.excludes.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">·</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Applicable parks */}
        {act.park_ids?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <TreePine className="w-4 h-4 text-emerald-500" /> Available At
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {act.park_ids.map((pid, i) => {
                const park = NATIONAL_PARKS.find(p => p.id === pid);
                return (
                  <span key={i} className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">
                    {park ? park.name : pid}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border flex gap-3">
          <Button className="flex-1" onClick={onClose}>
            <Plus className="w-4 h-4" /> Add to Quote
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}

// ─── Filter pill button ───────────────────────────────────────────────────────

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border',
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

// ─── Parks Tab ────────────────────────────────────────────────────────────────

function ParksTab({ search }) {
  const [country, setCountry] = useState('All');
  const [selectedPark, setSelectedPark] = useState(null);

  const filtered = useMemo(() => {
    let list = NATIONAL_PARKS || [];
    if (country !== 'All') list = list.filter(p => p.country === country);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q) ||
        p.region?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, country]);

  return (
    <div>
      {/* Country filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {COUNTRIES.map(c => (
          <FilterPill key={c} active={country === c} onClick={() => setCountry(c)}>
            {c}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Mountain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No parks found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(park => (
            <button
              key={park.id}
              onClick={() => setSelectedPark(park)}
              className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200 text-left"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={park.image}
                  alt={park.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {park.country && (
                  <span className="absolute top-3 left-3 bg-white/90 dark:bg-black/70 text-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                    {park.country}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {park.name}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 mb-2.5">
                  {park.area_km2 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      {Number(park.area_km2).toLocaleString()} km²
                    </span>
                  )}
                  {park.best_time && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {park.best_time}
                    </span>
                  )}
                </div>
                {park.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {park.description}
                  </p>
                )}
                <div className="mt-3 flex items-center text-primary text-xs font-medium">
                  View details <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ParkDetailPanel park={selectedPark} onClose={() => setSelectedPark(null)} />
    </div>
  );
}

// ─── Accommodations Tab ───────────────────────────────────────────────────────

const ACCOM_CAT_FILTER = ['All', 'luxury', 'mid_range', 'budget', 'beach_resort'];

function AccommodationsTab({ search }) {
  const [category, setCategory] = useState('All');
  const [country, setCountry] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let list = ACCOMMODATIONS || [];
    if (category !== 'All') list = list.filter(a => a.category === category);
    if (country !== 'All') list = list.filter(a => a.country === country);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.country?.toLowerCase().includes(q) ||
        a.region?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.type?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, category, country]);

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ACCOM_CAT_FILTER.map(cat => (
          <FilterPill key={cat} active={category === cat} onClick={() => setCategory(cat)}>
            {cat === 'All' ? 'All' : ACCOM_CAT_LABELS[cat]}
          </FilterPill>
        ))}
      </div>
      {/* Country filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {COUNTRIES.map(c => (
          <FilterPill key={c} active={country === c} onClick={() => setCountry(c)}>
            {c}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Hotel className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No accommodations found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(acc => (
            <button
              key={acc.id}
              onClick={() => setSelected(acc)}
              className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200 text-left"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={acc.image}
                  alt={acc.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {acc.category && (
                  <span className={cn(
                    'absolute top-3 left-3 text-xs font-medium px-2 py-0.5 rounded-full',
                    ACCOM_CAT_COLORS[acc.category] || 'bg-muted text-muted-foreground'
                  )}>
                    {ACCOM_CAT_LABELS[acc.category] || labelCase(acc.category)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {acc.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 mb-1.5">
                  {acc.type && <span className="text-xs text-muted-foreground">{acc.type}</span>}
                  {acc.type && acc.region && <span className="text-muted-foreground/40">·</span>}
                  {acc.region && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" /> {acc.region}
                    </span>
                  )}
                </div>
                {acc.rating && <StarRating value={acc.rating} />}
                {acc.pricing?.low_season?.pps && (
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    From {fmt(acc.pricing.low_season.pps)}
                    <span className="text-xs font-normal text-muted-foreground"> /person</span>
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <AccommodationDetailPanel accommodation={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── Activities Tab ───────────────────────────────────────────────────────────

const ACTIVITY_CATS = [
  'All', 'game_drive', 'trekking', 'cultural', 'water', 'aerial', 'walking', 'specialist', 'dining',
];

function ActivitiesTab({ search }) {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let list = ACTIVITIES || [];
    if (category !== 'All') list = list.filter(a => a.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, category]);

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ACTIVITY_CATS.map(cat => (
          <FilterPill key={cat} active={category === cat} onClick={() => setCategory(cat)}>
            {cat === 'All' ? 'All' : labelCase(cat)}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No activities found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(act => (
            <button
              key={act.id}
              onClick={() => setSelected(act)}
              className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200 text-left"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={act.image}
                  alt={act.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                    {act.name}
                  </h3>
                  {act.category && (
                    <CategoryBadge category={act.category} map={ACTIVITY_CAT_COLORS} />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {act.duration && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {act.duration}
                    </span>
                  )}
                  {act.price_per_person != null && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {fmt(act.price_per_person)}/pp
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ActivityDetailPanel activity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SafariLibrary() {
  const [activeTab, setActiveTab] = useState('parks');
  const [search, setSearch] = useState('');

  const tabs = [
    { id: 'parks',          label: 'Parks',          icon: Mountain },
    { id: 'accommodations', label: 'Accommodations',  icon: Hotel    },
    { id: 'activities',     label: 'Activities',      icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 to-teal-900/80" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <TreePine className="w-6 h-6 text-white" />
            </div>
            <span className="text-emerald-300 font-medium text-sm tracking-wide uppercase">Reference Library</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            Safari Library
          </h1>
          <p className="text-emerald-100/80 text-lg max-w-2xl">
            Your complete reference for East African safari experiences — parks, lodges, and activities all in one place.
          </p>
          <div className="mt-6 flex gap-4 text-emerald-200 text-sm">
            <span className="flex items-center gap-1.5">
              <Mountain className="w-4 h-4" /> {(NATIONAL_PARKS || []).length} Parks
            </span>
            <span className="flex items-center gap-1.5">
              <Hotel className="w-4 h-4" /> {(ACCOMMODATIONS || []).length} Accommodations
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> {(ACTIVITIES || []).length} Activities
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar + search */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex">
              {tabs.map(tab => (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => { setActiveTab(tab.id); setSearch(''); }}
                  icon={tab.icon}
                  label={tab.label}
                />
              ))}
            </div>
            {/* Search */}
            <div className="relative w-64 my-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${activeTab}…`}
                className="pl-9 h-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'parks'          && <ParksTab          search={search} />}
        {activeTab === 'accommodations' && <AccommodationsTab search={search} />}
        {activeTab === 'activities'     && <ActivitiesTab     search={search} />}
      </div>
    </div>
  );
}
