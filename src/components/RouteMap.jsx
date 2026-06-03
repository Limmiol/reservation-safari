import React, { useMemo } from 'react';
import { PARK_COORDS, COUNTRY_ANCHORS, MAP_BOUNDS, guessParkId } from '@/lib/parkCoordinates';

/**
 * RouteMap — lightweight SVG overview of East Africa with park pins and an
 * optional ordered itinerary route. Pins are labelled with day numbers when
 * an itinerary is provided, so the map always matches the day-by-day plan.
 *
 * Props (choose one source of truth — in priority order):
 *   itinerary?: [{ day, location?, title?, description? }]  // preferred
 *   stops?: [{ id, dayStart?, dayEnd?, label? }]            // pre-built
 *   parkIds?: string[]        // simple ordered ids (pins numbered 1..N)
 *   destinations?: string[]   // freeform fallback strings
 *   highlightAll?: boolean    // dim other parks for context
 *   compact?: boolean         // smaller variant
 *   title?: string
 */

const VB_W = 560;
const VB_H = 680;
const LAT_SPAN = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
const LNG_SPAN = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;

function project({ lat, lng }) {
  const x = ((lng - MAP_BOUNDS.minLng) / LNG_SPAN) * VB_W;
  const y = ((MAP_BOUNDS.maxLat - lat) / LAT_SPAN) * VB_H;
  return { x, y };
}

/**
 * Collapse an itinerary into map stops. Consecutive days at the same park
 * fold into a single pin with a day range (e.g. "D2–4"). Unknown locations
 * are skipped but still advance the day counter so ranges stay accurate.
 */
function itineraryToStops(itinerary) {
  if (!Array.isArray(itinerary)) return [];
  const stops = [];
  let current = null;

  for (const entry of itinerary) {
    const dayNum = Number(entry?.day) || (stops.length > 0 ? (current?.dayEnd ?? 0) + 1 : 1);
    // Match against every field that might hold a place name
    const parkId =
      guessParkId(entry?.location) ||
      guessParkId(entry?.title) ||
      guessParkId(entry?.description);

    if (!parkId) {
      // Skip unknown days but reset streak so next known park starts a new pin
      current = null;
      continue;
    }

    if (current && current.id === parkId) {
      current.dayEnd = dayNum;
    } else {
      current = { id: parkId, dayStart: dayNum, dayEnd: dayNum };
      stops.push(current);
    }
  }
  return stops;
}

function normaliseStops({ itinerary, stops, parkIds, destinations }) {
  // 1. Prefer itinerary — drives day-accurate numbering
  if (Array.isArray(itinerary) && itinerary.length > 0) {
    const fromItin = itineraryToStops(itinerary);
    if (fromItin.length > 0) return fromItin;
  }
  // 2. Pre-built stops
  if (Array.isArray(stops) && stops.length > 0) {
    return stops.filter(s => s && PARK_COORDS[s.id]);
  }
  // 3. Simple id list — dayStart/dayEnd default to the sequence index so the
  //    pin label remains a 1..N stop number.
  if (Array.isArray(parkIds) && parkIds.length > 0) {
    return parkIds
      .filter(id => PARK_COORDS[id])
      .map((id, i) => ({ id, dayStart: i + 1, dayEnd: i + 1, _indexed: true }));
  }
  // 4. Freeform destination strings
  if (Array.isArray(destinations)) {
    const seen = new Set();
    const out = [];
    for (const d of destinations) {
      const id = typeof d === 'string' ? guessParkId(d) : null;
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push({ id, dayStart: out.length + 1, dayEnd: out.length + 1, _indexed: true });
      }
    }
    return out;
  }
  return [];
}

function pinLabel(stop, fallbackIndex) {
  if (stop._indexed) return String(fallbackIndex + 1);
  if (stop.label) return stop.label;
  if (stop.dayStart == null) return String(fallbackIndex + 1);
  if (stop.dayEnd && stop.dayEnd !== stop.dayStart) {
    return `${stop.dayStart}-${stop.dayEnd}`;
  }
  return `D${stop.dayStart}`;
}

function dayBadgeText(stop) {
  if (stop._indexed) return null;
  if (stop.dayStart == null) return null;
  if (stop.dayEnd && stop.dayEnd !== stop.dayStart) {
    return `Day ${stop.dayStart}–${stop.dayEnd}`;
  }
  return `Day ${stop.dayStart}`;
}

export default function RouteMap({
  itinerary,
  stops: stopsProp,
  parkIds,
  destinations,
  highlightAll = true,
  compact = false,
  title,
}) {
  const stops = useMemo(
    () => normaliseStops({ itinerary, stops: stopsProp, parkIds, destinations }),
    [itinerary, stopsProp, parkIds, destinations],
  );
  const routeSet = new Set(stops.map(s => s.id));

  const points = stops.map((stop, i) => {
    const coords = PARK_COORDS[stop.id];
    if (!coords) return null;
    return { ...stop, ...project(coords), _i: i };
  }).filter(Boolean);

  // Pin widths scale when label is a range like "2-4" vs a single digit
  const pinRadius = (label) => (label.length >= 3 ? 14 : 11);

  const pathD = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : null;

  return (
    <div className={`w-full ${compact ? 'max-w-xs' : ''}`}>
      {title && <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</div>}
      <div className="relative rounded-xl overflow-hidden border border-border bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto"
          role="img"
          aria-label="East Africa safari route map"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" opacity="0.5" />
            </pattern>
            <linearGradient id="route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dy="1" />
              <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M 0 0 L 7 3 L 0 6 z" fill="#ea580c" opacity="0.9" />
            </marker>
          </defs>

          <rect width={VB_W} height={VB_H} fill="url(#grid)" />

          {/* Equator */}
          {(() => {
            const eq = project({ lat: 0, lng: MAP_BOUNDS.minLng });
            return (
              <g opacity="0.4">
                <line x1="0" y1={eq.y} x2={VB_W} y2={eq.y} stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" className="text-slate-400" />
                <text x="6" y={eq.y - 4} fontSize="10" className="fill-slate-400">Equator</text>
              </g>
            );
          })()}

          {/* Country labels */}
          {COUNTRY_ANCHORS.map(c => {
            const { x, y } = project(c);
            return (
              <text
                key={c.name}
                x={x}
                y={y}
                fontSize="15"
                fontWeight="700"
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500 select-none"
                opacity="0.55"
              >
                {c.name}
              </text>
            );
          })}

          <text x={VB_W - 20} y={VB_H - 30} fontSize="11" fontStyle="italic" textAnchor="end" className="fill-sky-500" opacity="0.7">
            Indian Ocean
          </text>

          {/* Dim all other catalogue parks for context */}
          {highlightAll && Object.entries(PARK_COORDS).map(([id, c]) => {
            if (routeSet.has(id)) return null;
            const { x, y } = project(c);
            return <circle key={id} cx={x} cy={y} r="2.5" className="fill-slate-400" opacity="0.35" />;
          })}

          {/* Route path (with arrowhead on each segment) */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#route)"
              strokeWidth="2.5"
              strokeDasharray="6 5"
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
            />
          )}

          {/* Pins — labelled with day number or day range */}
          {points.map((p, i) => {
            const label = pinLabel(p, i);
            const r = pinRadius(label);
            return (
              <g key={`${p.id}-${i}`} filter="url(#pinShadow)">
                <circle cx={p.x} cy={p.y} r={r} fill="#0a3d62" stroke="white" strokeWidth="2" />
                <text
                  x={p.x}
                  y={p.y + 3.5}
                  fontSize={label.length >= 3 ? 9 : 10}
                  fontWeight="700"
                  textAnchor="middle"
                  fill="white"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Park name labels (alternating side to reduce overlap) */}
          {points.map((p, i) => {
            const label = p.id.replace(/_/g, ' ');
            const right = i % 2 === 0;
            const r = pinRadius(pinLabel(p, i));
            return (
              <text
                key={`lbl-${p.id}-${i}`}
                x={right ? p.x + r + 5 : p.x - r - 5}
                y={p.y + 3}
                fontSize="10"
                fontWeight="600"
                textAnchor={right ? 'start' : 'end'}
                className="fill-slate-700 dark:fill-slate-200 capitalize"
              >
                {label}
              </text>
            );
          })}
        </svg>

        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="text-xs text-muted-foreground text-center px-4">
              No recognised parks to plot yet.<br />Add destinations to see the route.
            </div>
          </div>
        )}
      </div>

      {/* Legend — shows day ranges when the map was driven by an itinerary */}
      {points.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {points.map((p, i) => {
            const label = pinLabel(p, i);
            const dayTxt = dayBadgeText(p);
            return (
              <span key={`leg-${p.id}-${i}`} className="inline-flex items-center gap-1 capitalize">
                <span className={`inline-flex items-center justify-center h-4 min-w-[1rem] ${label.length >= 3 ? 'px-1 w-auto' : 'w-4'} rounded-full bg-[#0a3d62] text-white text-[9px] font-bold`}>{label}</span>
                <span>{p.id.replace(/_/g, ' ')}</span>
                {dayTxt && <span className="text-[10px] text-muted-foreground/70">({dayTxt})</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
