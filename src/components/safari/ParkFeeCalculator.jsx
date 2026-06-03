import React, { useState, useMemo } from 'react';
import { DollarSign, Users, Calendar, Car, MapPin, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NATIONAL_PARKS, calculateParkFees } from '@/lib/safariData';

/**
 * Inline widget that calculates total park entry fees for a given group.
 *
 * Props:
 *  - parkId          : initial park (string)
 *  - adults          : default 2
 *  - children        : default 0
 *  - days            : default 1
 *  - vehicles        : default 1
 *  - resident        : default false
 *  - onChange(result): callback when total changes — receives { total, breakdown, park, inputs }
 *  - compact         : boolean — compressed layout
 */
export default function ParkFeeCalculator({
  parkId: initialParkId = '',
  adults: initialAdults = 2,
  children: initialChildren = 0,
  days: initialDays = 1,
  vehicles: initialVehicles = 1,
  resident: initialResident = false,
  onChange,
  compact = false,
}) {
  const [parkId, setParkId]       = useState(initialParkId);
  const [adults, setAdults]       = useState(initialAdults);
  const [children, setChildren]   = useState(initialChildren);
  const [days, setDays]           = useState(initialDays);
  const [vehicles, setVehicles]   = useState(initialVehicles);
  const [resident, setResident]   = useState(initialResident);

  const result = useMemo(() => {
    return calculateParkFees({
      parkId,
      adults: Number(adults) || 0,
      children: Number(children) || 0,
      days: Number(days) || 0,
      vehicles: Number(vehicles) || 0,
      resident,
    });
  }, [parkId, adults, children, days, vehicles, resident]);

  React.useEffect(() => {
    onChange?.({
      ...result,
      inputs: { parkId, adults, children, days, vehicles, resident },
    });
    // eslint-disable-next-line
  }, [result.total]);

  const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className={cn(
      'bg-card border border-border rounded-xl overflow-hidden',
      compact ? 'p-3' : 'p-5'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <DollarSign className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Park Fee Calculator</h3>
      </div>

      {/* Park Select */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Park
          </label>
          <Select value={parkId} onValueChange={setParkId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a park…" />
            </SelectTrigger>
            <SelectContent>
              {NATIONAL_PARKS.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} <span className="text-muted-foreground">· {p.country}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inputs grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Adults
            </label>
            <Input
              type="number" min={0}
              value={adults}
              onChange={e => setAdults(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Children
            </label>
            <Input
              type="number" min={0}
              value={children}
              onChange={e => setChildren(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Days
            </label>
            <Input
              type="number" min={1}
              value={days}
              onChange={e => setDays(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Car className="w-3 h-3" /> Vehicles
            </label>
            <Input
              type="number" min={0}
              value={vehicles}
              onChange={e => setVehicles(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {/* Resident toggle */}
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={resident}
            onChange={e => setResident(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-muted-foreground">EAC Resident pricing</span>
        </label>
      </div>

      {/* Results */}
      {parkId && result.breakdown.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="space-y-1.5 text-sm">
            {result.breakdown.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-muted-foreground">
                <span>{row.label}</span>
                <span className="tabular-nums">{fmt(row.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between font-semibold text-foreground text-base bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
            <span>Total Park Fees</span>
            <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{fmt(result.total)}</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Estimate only — verify current fees with park authority before quoting.
          </p>
        </div>
      )}

      {parkId && result.breakdown.length === 0 && (
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
          Add adults/children and days to calculate fees.
        </div>
      )}
    </div>
  );
}
