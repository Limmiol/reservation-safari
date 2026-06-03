import React, { useState, useMemo } from 'react';
import { Search, MapPin, Star, Check, X, Hotel, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ACCOMMODATIONS,
  ACCOMMODATION_CATEGORIES,
  COUNTRIES,
} from '@/lib/safariData';

const CATEGORY_COLORS = {
  luxury:       'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  mid_range:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  budget:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  beach_resort: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};
const CATEGORY_LABELS = {
  luxury: 'Luxury', mid_range: 'Mid-Range', budget: 'Budget', beach_resort: 'Beach Resort',
};

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition border',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Modal picker for selecting one or more accommodations from the library.
 *
 * Props:
 *  - open          : boolean
 *  - onClose       : () => void
 *  - onSelect      : (accommodation | accommodation[]) => void
 *  - multiple      : boolean  (default false — pick one)
 *  - parkId        : optional — pre-filter by park
 *  - initialIds    : string[] of already-selected ids (for multi mode)
 */
export default function AccommodationPicker({
  open,
  onClose,
  onSelect,
  multiple = false,
  parkId = null,
  initialIds = [],
}) {
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [country, setCountry]     = useState('All');
  const [selectedIds, setSelectedIds] = useState(initialIds);

  const baseList = useMemo(
    () => parkId ? ACCOMMODATIONS.filter(a => a.park_id === parkId) : ACCOMMODATIONS,
    [parkId],
  );

  const filtered = useMemo(() => {
    let list = baseList;
    if (category !== 'All') list = list.filter(a => a.category === category);
    if (country !== 'All')  list = list.filter(a => a.country === country);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.region?.toLowerCase().includes(q) ||
        a.country?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseList, search, category, country]);

  const toggle = (acc) => {
    if (!multiple) {
      onSelect?.(acc);
      onClose?.();
      return;
    }
    setSelectedIds(ids =>
      ids.includes(acc.id) ? ids.filter(x => x !== acc.id) : [...ids, acc.id]
    );
  };

  const confirmMulti = () => {
    const picked = ACCOMMODATIONS.filter(a => selectedIds.includes(a.id));
    onSelect?.(picked);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-primary" />
            {multiple ? 'Select Accommodations' : 'Select Accommodation'}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, region, description…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill active={category === 'All'} onClick={() => setCategory('All')}>All</Pill>
            {ACCOMMODATION_CATEGORIES.map(cat => (
              <Pill key={cat.id} active={category === cat.id} onClick={() => setCategory(cat.id)}>
                {cat.label}
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map(c => (
              <Pill key={c} active={country === c} onClick={() => setCountry(c)}>{c}</Pill>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-3 border-t border-b border-border">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hotel className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No accommodations match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(acc => {
                const selected = selectedIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    onClick={() => toggle(acc)}
                    className={cn(
                      'flex gap-3 p-3 rounded-xl border text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
                    )}
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={acc.image}
                        alt={acc.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=200'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-foreground line-clamp-1">{acc.name}</h4>
                        {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', CATEGORY_COLORS[acc.category] || 'bg-muted')}>
                          {CATEGORY_LABELS[acc.category] || acc.category}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" /> {acc.region}
                        </span>
                      </div>
                      {acc.rating && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn('w-3 h-3', i <= Math.round(acc.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                          ))}
                        </div>
                      )}
                      {acc.pricing?.low_season?.pps && (
                        <p className="text-xs font-semibold text-foreground mt-1">
                          From ${acc.pricing.low_season.pps.toLocaleString()}
                          <span className="font-normal text-muted-foreground"> /pp</span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {multiple && (
          <DialogFooter className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button onClick={confirmMulti} disabled={selectedIds.length === 0}>
                <Plus className="w-4 h-4" /> Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
