import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdvancedItineraryEditor({ booking, packageData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [itinerary, setItinerary] = useState(() => {
    try {
      if (booking?.custom_itinerary) {
        const parsed = JSON.parse(booking.custom_itinerary);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Fall back to package itinerary_days
      const pkgDays = packageData?.itinerary_days;
      if (pkgDays) {
        const days = Array.isArray(pkgDays) ? pkgDays : JSON.parse(pkgDays);
        // Normalize to AdvancedItineraryEditor format
        return days.map((d, i) => ({
          id: `day-${d.day || i + 1}`,
          day: d.day || i + 1,
          title: d.title || '',
          location: d.location || '',
          transport: d.transport || '',
          description: d.description || '',
          accommodation: d.accommodation || '',
          meals: d.meals || '',
          activities: Array.isArray(d.activities)
            ? d.activities.map((a, j) => ({
                id: `act-${i}-${j}`,
                title: typeof a === 'string' ? a : (a.title || a.notes || ''),
                notes: typeof a === 'string' ? '' : (a.notes || ''),
              }))
            : [],
        }));
      }
      return [];
    } catch {
      return [];
    }
  });
  const [expanded, setExpanded] = useState(new Set());
  const [editingDay, setEditingDay] = useState(null);
  const queryClient = useQueryClient();

  // packageData loads async — update itinerary once it arrives if still empty
  useEffect(() => {
    if (!packageData?.itinerary_days) return;
    setItinerary(prev => {
      if (prev.length > 0) return prev; // custom itinerary already set
      try {
        const pkgDays = packageData.itinerary_days;
        const days = Array.isArray(pkgDays) ? pkgDays : JSON.parse(pkgDays);
        return days.map((d, i) => ({
          id: `day-${d.day || i + 1}`,
          day: d.day || i + 1,
          title: d.title || '',
          location: d.location || '',
          transport: d.transport || '',
          description: d.description || '',
          accommodation: d.accommodation || '',
          meals: d.meals || '',
          activities: Array.isArray(d.activities)
            ? d.activities.map((a, j) => ({
                id: `act-${i}-${j}`,
                title: typeof a === 'string' ? a : (a.title || a.notes || ''),
                notes: typeof a === 'string' ? '' : (a.notes || ''),
              }))
            : [],
        }));
      } catch { return prev; }
    });
  }, [packageData]);

  const numDays = packageData?.duration_days
    || (booking && booking.end_date && booking.start_date
      ? Math.round((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24)) + 1
      : 0);

  // Ensure we have days for the entire trip
  const fullItinerary = useMemo(() => {
    const days = [];
    for (let i = 1; i <= numDays; i++) {
      const existing = itinerary.find(d => d.day === i);
      if (existing) {
        // Ensure activities is always an array
        days.push({
          ...existing,
          activities: Array.isArray(existing.activities) ? existing.activities : []
        });
      } else {
        days.push({
          id: `day-${i}`,
          day: i,
          title: '',
          location: '',
          transport: '',
          activities: []
        });
      }
    }
    return days;
  }, [itinerary, numDays]);

  const updateMutation = useMutation({
    mutationFn: () => base44.entities.Booking.update(booking.id, { custom_itinerary: JSON.stringify(fullItinerary) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setIsOpen(false);
    },
  });

  const toggleExpanded = (dayNum) => {
    const newSet = new Set(expanded);
    if (newSet.has(dayNum)) {
      newSet.delete(dayNum);
    } else {
      newSet.add(dayNum);
    }
    setExpanded(newSet);
  };

  const updateDay = (dayNum, field, value) => {
    setItinerary(prev => {
      const idx = prev.findIndex(d => d.day === dayNum);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [field]: value };
        return updated;
      } else {
        return [...prev, { id: `day-${dayNum}`, day: dayNum, [field]: value, activities: [] }];
      }
    });
  };

  const updateActivity = (dayNum, actIdx, field, value) => {
    setItinerary(prev => {
      const dayIdx = prev.findIndex(d => d.day === dayNum);
      if (dayIdx >= 0) {
        const updated = [...prev];
        updated[dayIdx] = {
          ...updated[dayIdx],
          activities: updated[dayIdx].activities.map((act, i) => i === actIdx ? { ...act, [field]: value } : act)
        };
        return updated;
      }
      return prev;
    });
  };

  const addActivity = (dayNum) => {
    setItinerary(prev => {
      const dayIdx = prev.findIndex(d => d.day === dayNum);
      if (dayIdx >= 0) {
        const updated = [...prev];
        updated[dayIdx] = {
          ...updated[dayIdx],
          activities: [...(updated[dayIdx].activities || []), { id: `act-${Date.now()}`, title: '', notes: '' }]
        };
        return updated;
      } else {
        return [...prev, { id: `day-${dayNum}`, day: dayNum, activities: [{ id: `act-${Date.now()}`, title: '', notes: '' }] }];
      }
    });
  };

  const removeActivity = (dayNum, actIdx) => {
    setItinerary(prev => {
      const dayIdx = prev.findIndex(d => d.day === dayNum);
      if (dayIdx >= 0) {
        const updated = [...prev];
        updated[dayIdx] = {
          ...updated[dayIdx],
          activities: updated[dayIdx].activities.filter((_, i) => i !== actIdx)
        };
        return updated;
      }
      return prev;
    });
  };

  return (
    <>
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold">Day-by-Day Itinerary</h2>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
            <Edit2 className="w-4 h-4" /> Edit Itinerary
          </Button>
        </div>
        
        <div className="space-y-3">
          {fullItinerary.map(day => (
            <div key={day.day} className="border border-border rounded-lg">
              <button
                onClick={() => toggleExpanded(day.day)}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-accent transition-colors"
              >
                <div className="text-left">
                  <p className="font-medium">Day {day.day}</p>
                  {day.location && <p className="text-xs text-muted-foreground">{day.location}</p>}
                </div>
                {expanded.has(day.day) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {expanded.has(day.day) && (
                <div className="px-4 py-3 border-t border-border space-y-2 bg-muted/30">
                  {day.title && <p className="text-sm font-medium text-foreground">{day.title}</p>}
                  {day.description && <p className="text-sm text-muted-foreground">{day.description}</p>}
                  {day.transport && <p className="text-xs"><span className="font-medium">Transport:</span> {day.transport}</p>}
                  {(day.activities || []).length > 0 && (
                    <ul className="space-y-1">
                      {(day.activities || []).map((act, i) => {
                        const text = typeof act === 'string' ? act : (act.title || '');
                        const notes = typeof act === 'object' ? act.notes : '';
                        return text ? (
                          <li key={act.id || i} className="text-sm">
                            <span className="text-foreground">• {text}</span>
                            {notes && <span className="text-muted-foreground text-xs ml-2">— {notes}</span>}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {day.meals && (
                      <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded">🍽 {day.meals}</span>
                    )}
                    {day.accommodation && (
                      <span className="text-xs bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded">🏨 {day.accommodation}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Day-by-Day Itinerary</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {fullItinerary.map(day => (
              <div key={day.day} className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Day {day.day}</h3>
                
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                  <input
                    type="text"
                    value={day.title || ''}
                    onChange={(e) => updateDay(day.day, 'title', e.target.value)}
                    placeholder="e.g., Arrival & Safari Introduction"
                    className="w-full h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                    <input
                      type="text"
                      value={day.location || ''}
                      onChange={(e) => updateDay(day.day, 'location', e.target.value)}
                      placeholder="e.g., Nairobi"
                      className="w-full h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Coordinates</label>
                    <input
                      type="text"
                      value={day.coordinates || ''}
                      onChange={(e) => updateDay(day.day, 'coordinates', e.target.value)}
                      placeholder="e.g., -1.2921,36.8219"
                      className="w-full h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Transport</label>
                  <input
                    type="text"
                    value={day.transport || ''}
                    onChange={(e) => updateDay(day.day, 'transport', e.target.value)}
                    placeholder="e.g., 4x4 Safari Vehicle"
                    className="w-full h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Accommodation</label>
                    <input
                      type="text"
                      value={day.accommodation || ''}
                      onChange={(e) => updateDay(day.day, 'accommodation', e.target.value)}
                      placeholder="e.g., Serengeti Serena Lodge"
                      className="w-full h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Meals</label>
                    <input
                      type="text"
                      value={day.meals || ''}
                      onChange={(e) => updateDay(day.day, 'meals', e.target.value)}
                      placeholder="e.g., Breakfast, Lunch, Dinner"
                      className="w-full h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-muted-foreground">Activities</label>
                    <Button size="sm" variant="ghost" onClick={() => addActivity(day.day)} className="h-6 px-2 gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                  
                  {(day.activities || []).map((act, idx) => (
                    <div key={act.id || idx} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={act.title || ''}
                        onChange={(e) => updateActivity(day.day, idx, 'title', e.target.value)}
                        placeholder="Activity title"
                        className="flex-1 h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                      />
                      <input
                        type="text"
                        value={act.notes || ''}
                        onChange={(e) => updateActivity(day.day, idx, 'notes', e.target.value)}
                        placeholder="Details"
                        className="flex-1 h-8 px-2 rounded-md border border-input bg-transparent text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeActivity(day.day, idx)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}