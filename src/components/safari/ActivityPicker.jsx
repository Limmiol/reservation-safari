import React, { useState, useMemo } from 'react';
import {
  Search, Clock, DollarSign, Check, X, Activity, Plus, TreePine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ACTIVITIES,
  ACTIVITY_CATEGORIES,
  NATIONAL_PARKS,
} from '@/lib/safariData';

const CATEGORY_COLORS = {
  game_drive:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  trekking:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cultural:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  water:       'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  aerial:      'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  walking:     'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  specialist:  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  dining:      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
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
 * Modal picker for selecting activities.
 *
 * Props:
 *  - open
 *  - onClose
 *  - onSelect   : (activity | activity[]) => void
 *  - multiple   : boolean — default true
 *  - parkId     : optional, filters to activities available at that park
 *  - initialIds : pre-selected activity ids
 */
export default function ActivityPicker({
  open,
  onClose,
  onSelect,
  multiple = true,
  parkId = null,
  initialIds = [],
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState(initialIds);

  const baseList = useMemo(
    () => parkId ? ACTIVITIES.filter(a => a.park_ids?.includes(parkId)) : ACTIVITIES,
    [parkId],
  );

  const filtered = useMemo(() => {
    let list = baseList;
    if (category !== 'All') list = list.filter(a => a.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseList, search, category]);

  const toggle = (act) => {
    if (!multiple) {
      onSelect?.(act);
      onClose?.();
      return;
    }
    setSelectedIds(ids =>
      ids.includes(act.id) ? ids.filter(x => x !== act.id) : [...ids, act.id]
    );
  };

  const confirmMulti = () => {
    const picked = ACTIVITIES.filter(a => selectedIds.includes(a.id));
    onSelect?.(picked);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {multiple ? 'Select Activities' : 'Select Activity'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search activities…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill active={category === 'All'} onClick={() => setCategory('All')}>All</Pill>
            {ACTIVITY_CATEGORIES.map(cat => (
              <Pill key={cat.id} active={category === cat.id} onClick={() => setCategory(cat.id)}>
                {cat.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-3 border-t border-b border-border">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activities match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(act => {
                const selected = selectedIds.includes(act.id);
                return (
                  <button
                    key={act.id}
                    onClick={() => toggle(act)}
                    className={cn(
                      'flex gap-3 p-3 rounded-xl border text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
                    )}
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={act.image}
                        alt={act.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-foreground line-clamp-2">{act.name}</h4>
                        {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {act.category && (
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', CATEGORY_COLORS[act.category] || 'bg-muted')}>
                            {act.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        {act.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {act.duration}
                          </span>
                        )}
                      </div>
                      {act.price_per_person != null && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" /> {act.price_per_person.toLocaleString()}/pp
                        </p>
                      )}
                      {!parkId && act.park_ids?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 line-clamp-1">
                          <TreePine className="w-2.5 h-2.5" />
                          {act.park_ids.slice(0, 2).map(pid => {
                            const p = NATIONAL_PARKS.find(n => n.id === pid);
                            return p?.name?.replace(' National Park','').replace(' National Reserve','');
                          }).filter(Boolean).join(', ')}
                          {act.park_ids.length > 2 && ` +${act.park_ids.length - 2}`}
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
