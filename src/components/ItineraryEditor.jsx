import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function buildDefaultItinerary(booking, packageItineraryDays) {
  const start = booking.start_date ? new Date(booking.start_date) : new Date();
  const days = booking.end_date
    ? Math.max(1, Math.round((new Date(booking.end_date) - start) / 86400000) + 1)
    : 1;

  // Try to use structured package itinerary days
  let pkgDays = [];
  if (packageItineraryDays) {
    try { pkgDays = JSON.parse(packageItineraryDays); } catch {}
  }

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const pkgDay = pkgDays[i];
    return {
      id: `day-${i + 1}`,
      day: i + 1,
      date: date.toISOString().split('T')[0],
      label,
      title: pkgDay?.title || `Day ${i + 1}`,
      activities: pkgDay?.activities?.length
        ? pkgDay.activities.map((a, j) => ({ ...a, id: `act-${i}-${j}-${Date.now()}` }))
        : [{ id: `act-${i}-0`, title: '', notes: '' }],
    };
  });
}

export default function ItineraryEditor({ booking, packageItineraryDays }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Parse or build itinerary on load
  useEffect(() => {
    if (!booking) return;
    if (booking.custom_itinerary) {
      try {
        const parsed = JSON.parse(booking.custom_itinerary);
        setDays(parsed);
        return;
      } catch {}
    }
    setDays(buildDefaultItinerary(booking, packageItineraryDays));
  }, [booking?.id, booking?.custom_itinerary, packageItineraryDays]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Booking.update(booking.id, {
      custom_itinerary: JSON.stringify(days),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setDirty(false);
    },
  });

  const resetToDefault = () => {
    setDays(buildDefaultItinerary(booking, packageItinerary));
    setDirty(true);
  };

  // --- Drag end handler ---
  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'DAY') {
      // Reorder days
      const reordered = Array.from(days);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      // Re-number days sequentially
      setDays(reordered.map((d, i) => ({ ...d, day: i + 1 })));
      setDirty(true);
      return;
    }

    if (type === 'ACTIVITY') {
      const srcDayId = source.droppableId;
      const dstDayId = destination.droppableId;
      const newDays = days.map(d => ({ ...d, activities: [...d.activities] }));
      const srcDay = newDays.find(d => d.id === srcDayId);
      const dstDay = newDays.find(d => d.id === dstDayId);
      const [moved] = srcDay.activities.splice(source.index, 1);
      dstDay.activities.splice(destination.index, 0, moved);
      setDays(newDays);
      setDirty(true);
    }
  };

  // --- Activity helpers ---
  const addActivity = (dayId) => {
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, activities: [...d.activities, { id: `act-${Date.now()}`, title: '', notes: '' }] }
      : d
    ));
    setDirty(true);
  };

  const removeActivity = (dayId, actId) => {
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, activities: d.activities.filter(a => a.id !== actId) }
      : d
    ));
    setDirty(true);
  };

  const updateActivity = (dayId, actId, field, value) => {
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, activities: d.activities.map(a => a.id === actId ? { ...a, [field]: value } : a) }
      : d
    ));
    setDirty(true);
  };

  if (!days.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">Itinerary</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Drag days or activities to reorder</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetToDefault} className="text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saveMutation.isPending ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* DnD context */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="days-list" type="DAY">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-border">
              {days.map((day, dayIndex) => (
                <Draggable key={day.id} draggableId={day.id} index={dayIndex}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-card transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-1 ring-border rounded-xl' : ''}`}
                    >
                      {/* Day header */}
                      <div className="flex items-center gap-3 px-5 py-3.5">
                        <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted-foreground w-12">Day {day.day}</span>
                          <span className="text-sm font-medium">{day.label}</span>
                          <span className="text-xs text-muted-foreground">{day.activities.length} activit{day.activities.length === 1 ? 'y' : 'ies'}</span>
                        </div>
                        <button
                          onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expandedDay === day.id
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Activities (expanded) */}
                      {expandedDay === day.id && (
                        <div className="px-5 pb-4">
                          <Droppable droppableId={day.id} type="ACTIVITY">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                                {day.activities.map((act, actIndex) => (
                                  <Draggable key={act.id} draggableId={act.id} index={actIndex}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex gap-2 items-start rounded-lg border border-border bg-secondary/40 p-3 transition-shadow ${snapshot.isDragging ? 'shadow-md ring-1 ring-border' : ''}`}
                                      >
                                        <div {...provided.dragHandleProps} className="mt-1.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex-shrink-0">
                                          <GripVertical className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                          <Input
                                            value={act.title}
                                            onChange={(e) => updateActivity(day.id, act.id, 'title', e.target.value)}
                                            placeholder="Activity title..."
                                            className="h-8 text-sm"
                                          />
                                          <Textarea
                                            value={act.notes}
                                            onChange={(e) => updateActivity(day.id, act.id, 'notes', e.target.value)}
                                            placeholder="Notes (optional)..."
                                            className="text-xs resize-none"
                                            rows={2}
                                          />
                                        </div>
                                        <button
                                          onClick={() => removeActivity(day.id, act.id)}
                                          className="mt-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                          <button
                            onClick={() => addActivity(day.id)}
                            className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add activity
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}