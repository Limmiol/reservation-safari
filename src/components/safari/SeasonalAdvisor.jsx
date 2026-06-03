import React, { useMemo, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, Calendar, MapPin, Info, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NATIONAL_PARKS } from '@/lib/safariData';

/**
 * Per-park monthly advisor:
 *  - wildlife score (0-100)
 *  - weather (dry/short-rains/long-rains)
 *  - pricing (low/shoulder/high/peak)
 *  - crowd level (0-100)
 *  - notes
 *
 * Driven by heuristics: East Africa has two rainy seasons (Mar-May long, Oct-Nov short),
 * plus park-specific wildlife peaks (migration, calving).
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Region-level weather defaults (most East African parks)
const EA_WEATHER = ['dry','dry','short','long','long','dry','dry','dry','dry','short','short','dry'];

// Pricing defaults per month index: low / shoulder / high / peak
const EA_SEASON  = ['high','high','shoulder','low','low','high','peak','peak','high','shoulder','low','peak'];

// Park-specific wildlife scores — higher = better game viewing
// 12-element arrays, Jan..Dec
const PARK_WILDLIFE = {
  serengeti:    [90,95,80,60,55,80,95,100,95,85,70,85], // calving Jan–Feb, migration Jul–Oct
  masai_mara:   [75,70,60,55,55,70,90,100,100,90,70,70], // migration Aug–Oct
  ngorongoro:   [90,90,80,70,70,85,90,90,90,85,80,85],
  tarangire:    [70,70,65,60,60,85,95,95,95,85,75,75], // dry-season elephant congregation
  lake_manyara: [75,75,65,60,60,80,85,85,85,80,70,70],
  amboseli:     [80,80,65,55,55,85,95,95,95,85,70,75],
  tsavo_east:   [75,75,60,55,55,80,90,90,90,80,65,70],
  tsavo_west:   [75,75,60,55,55,80,90,90,90,80,65,70],
  samburu:      [80,80,65,55,55,85,95,95,95,85,70,75],
  nakuru:       [80,85,75,65,65,80,85,85,85,80,75,80],
  bwindi:       [75,75,60,45,45,85,90,90,85,70,60,70], // gorilla trekking best in dry
  volcanoes:    [75,75,60,45,45,85,90,90,85,70,60,70],
  queen_elizabeth:[80,80,65,55,55,80,85,90,85,75,65,75],
  murchison:    [80,80,65,55,55,80,85,90,85,75,65,75],
  zanzibar:     [80,85,70,50,50,85,95,100,95,80,65,75], // beach: dry = best
};

const DEFAULT_WILDLIFE = [75,75,65,55,55,80,90,90,90,80,70,75];

const crowdFromSeason = (s) => ({ low: 30, shoulder: 55, high: 80, peak: 95 }[s] || 50);

const WEATHER_META = {
  dry:   { label: 'Dry', icon: Sun,       className: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
  short: { label: 'Short rains', icon: CloudRain, className: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  long:  { label: 'Long rains',  icon: CloudRain, className: 'text-indigo-600 dark:text-indigo-400',bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  cloud: { label: 'Cloudy',      icon: Cloud,     className: 'text-slate-600 dark:text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800' },
};

const SEASON_META = {
  low:      { label: 'Low',      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  shoulder: { label: 'Shoulder', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  high:     { label: 'High',     className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  peak:     { label: 'Peak',     className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const SPECIAL_NOTES = {
  serengeti: {
    1: 'Calving season in the south — big cats active.',
    2: 'Peak calving — spectacular predator activity.',
    7: 'Great Migration river crossings begin.',
    8: 'Migration peak — book 12+ months ahead.',
    9: 'Migration peak — book 12+ months ahead.',
    10: 'Herds moving south — still excellent.',
  },
  masai_mara: {
    8: 'Mara River crossings — legendary.',
    9: 'Mara River crossings — legendary.',
    10: 'Late migration — fewer crowds.',
  },
  bwindi:   { 7: 'Prime gorilla trekking — dry trails.', 8: 'Prime gorilla trekking — dry trails.', 12: 'Good trekking but busy.' },
  volcanoes:{ 7: 'Prime gorilla trekking.', 8: 'Prime gorilla trekking.' },
  zanzibar: { 7: 'Kaskazi winds — perfect for kitesurfing.', 8: 'Peak beach season.' },
  tarangire:{ 8: 'Massive elephant herds around Tarangire River.', 9: 'Massive elephant herds around Tarangire River.' },
  amboseli: { 7: 'Clearest Kilimanjaro views.', 8: 'Clearest Kilimanjaro views.' },
};

export default function SeasonalAdvisor({ initialParkId = '' }) {
  const [parkId, setParkId] = useState(initialParkId || NATIONAL_PARKS[0]?.id || '');

  const park = useMemo(() => NATIONAL_PARKS.find(p => p.id === parkId), [parkId]);

  const data = useMemo(() => {
    const wildlife = PARK_WILDLIFE[parkId] || DEFAULT_WILDLIFE;
    return MONTHS.map((m, i) => ({
      month: m,
      monthIdx: i + 1,
      wildlife: wildlife[i],
      weather: EA_WEATHER[i],
      season: EA_SEASON[i],
      crowd: crowdFromSeason(EA_SEASON[i]),
      note: SPECIAL_NOTES[parkId]?.[i + 1],
    }));
  }, [parkId]);

  const best = useMemo(() => {
    return [...data]
      .map(d => ({ ...d, score: d.wildlife * 0.7 + (100 - d.crowd) * 0.2 + (d.weather === 'dry' ? 10 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [data]);

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">When to Visit</h3>
            <p className="text-xs text-muted-foreground">
              Wildlife scoring, weather & pricing across the year
            </p>
          </div>
        </div>
      </div>

      {/* Park picker */}
      <div className="px-5 pt-4">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Destination
        </label>
        <Select value={parkId} onValueChange={setParkId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select a park…" /></SelectTrigger>
          <SelectContent>
            {NATIONAL_PARKS.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} <span className="text-muted-foreground">· {p.country}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Top 3 months */}
      <div className="px-5 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Best months
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {best.map((m, i) => {
            const W = WEATHER_META[m.weather];
            return (
              <div
                key={m.month}
                className={cn(
                  'rounded-lg border p-3 text-center',
                  i === 0 ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
                )}
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">#{i + 1}</div>
                <div className="text-lg font-bold text-foreground">{m.month}</div>
                <div className={cn('inline-flex items-center gap-1 text-[10px] mt-1 px-1.5 py-0.5 rounded-full', W.bg, W.className)}>
                  <W.icon className="w-2.5 h-2.5" /> {W.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month matrix */}
      <div className="px-5 py-4">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Monthly breakdown</h4>
        <div className="space-y-1.5">
          {data.map(m => {
            const W = WEATHER_META[m.weather];
            const S = SEASON_META[m.season];
            const isCurrent = m.monthIdx === currentMonth;
            return (
              <div
                key={m.month}
                className={cn(
                  'grid grid-cols-12 items-center gap-2 px-2 py-1.5 rounded-lg text-xs',
                  isCurrent ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/40'
                )}
              >
                <div className={cn('col-span-1 font-bold', isCurrent ? 'text-primary' : 'text-foreground')}>
                  {m.month}
                </div>
                <div className="col-span-5 flex items-center gap-1.5">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${m.wildlife}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{m.wildlife}</span>
                </div>
                <div className={cn('col-span-3 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full justify-self-start', W.bg, W.className)}>
                  <W.icon className="w-2.5 h-2.5" /> {W.label}
                </div>
                <div className={cn('col-span-3 text-center px-1.5 py-0.5 rounded-full text-[10px] font-medium justify-self-end', S.className)}>
                  {S.label} season
                </div>
                {m.note && (
                  <div className="col-span-12 -mt-1 pl-6 pr-2 text-[11px] text-muted-foreground italic flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {m.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><div className="w-3 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" /> Wildlife score</span>
        </div>
        <span>{park?.country || ''} · estimates — verify local conditions</span>
      </div>
    </div>
  );
}
