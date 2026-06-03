import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Upload, X, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

function buildEmptyDays(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `day-${i + 1}-${Date.now()}`,
    day: i + 1,
    title: `Day ${i + 1}`,
    activities: [{ id: `act-${i}-0-${Date.now()}`, title: '', notes: '', image_url: '' }],
  }));
}

function ImageUploadField({ url, onUrl, uploading, onUpload, onClear, label }) {
  return (
    <div className="space-y-1.5">
      {url ? (
        <div className="relative w-full h-28 rounded-lg overflow-hidden border border-border">
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <label className={`flex items-center gap-2 w-full border border-dashed border-border rounded-lg py-2 px-3 cursor-pointer hover:border-primary transition-colors text-xs text-muted-foreground ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? (
            <>
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Image className="w-3.5 h-3.5" />
              {label}
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      )}
    </div>
  );
}

export default function PackageItineraryEditor({ durationDays, value, onChange }) {
  const [days, setDays] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [uploadingAccom, setUploadingAccom] = useState({}); // dayId → bool
  const [uploadingAct, setUploadingAct] = useState({});     // `${dayId}-${actId}` → bool

  // Sync days when durationDays changes
  useEffect(() => {
    const count = durationDays || 1;
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // Ensure every day and activity has a unique stable id
          // (old saved data may not have id fields, causing all to match undefined)
          const normalized = parsed.map((d, i) => ({
            ...d,
            id: d.id || `day-${i + 1}-${Date.now() + i}`,
            activities: (d.activities || []).map((a, j) => ({
              ...a,
              id: a.id || `act-${i}-${j}-${Date.now() + i * 1000 + j}`,
            })),
          }));
          if (normalized.length < count) {
            const extra = Array.from({ length: count - normalized.length }, (_, i) => ({
              id: `day-${normalized.length + i + 1}-${Date.now() + i}`,
              day: normalized.length + i + 1,
              title: `Day ${normalized.length + i + 1}`,
              activities: [{ id: `act-new-${i}-${Date.now()}`, title: '', notes: '', image_url: '' }],
            }));
            setDays([...normalized, ...extra]);
          } else {
            setDays(normalized.slice(0, count));
          }
          return;
        }
      } catch {}
    }
    setDays(buildEmptyDays(count));
  }, [durationDays]);

  const sync = (newDays) => {
    setDays(newDays);
    onChange(JSON.stringify(newDays));
  };

  const onDragEnd = ({ source, destination, type }) => {
    if (!destination) return;
    if (type === 'ACTIVITY') {
      const srcDayId = source.droppableId;
      const dstDayId = destination.droppableId;
      const newDays = days.map(d => ({ ...d, activities: [...d.activities] }));
      const srcDay = newDays.find(d => d.id === srcDayId);
      const dstDay = newDays.find(d => d.id === dstDayId);
      const [moved] = srcDay.activities.splice(source.index, 1);
      dstDay.activities.splice(destination.index, 0, moved);
      sync(newDays);
    }
  };

  const addActivity = (dayId) => {
    sync(days.map(d => d.id === dayId
      ? { ...d, activities: [...d.activities, { id: `act-${Date.now()}`, title: '', notes: '', image_url: '' }] }
      : d
    ));
  };

  const removeActivity = (dayId, actId) => {
    sync(days.map(d => d.id === dayId
      ? { ...d, activities: d.activities.filter(a => a.id !== actId) }
      : d
    ));
  };

  const updateActivity = (dayId, actId, field, val) => {
    sync(days.map(d => d.id === dayId
      ? { ...d, activities: d.activities.map(a => a.id === actId ? { ...a, [field]: val } : a) }
      : d
    ));
  };

  const updateDayField = (dayId, field, val) => {
    sync(days.map(d => d.id === dayId ? { ...d, [field]: val } : d));
  };

  const handleAccomImageUpload = async (dayId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAccom(u => ({ ...u, [dayId]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateDayField(dayId, 'accommodation_image_url', file_url);
    } finally {
      setUploadingAccom(u => ({ ...u, [dayId]: false }));
    }
  };

  const handleActImageUpload = async (dayId, actId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = `${dayId}-${actId}`;
    setUploadingAct(u => ({ ...u, [key]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateActivity(dayId, actId, 'image_url', file_url);
    } finally {
      setUploadingAct(u => ({ ...u, [key]: false }));
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
        {days.map((day) => (
          <div key={day.id} className="bg-card">
            {/* Day header */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-10 flex-shrink-0">D{day.day}</span>
                <Input
                  value={day.title}
                  onChange={(e) => updateDayField(day.id, 'title', e.target.value)}
                  placeholder={`Day ${day.day} title...`}
                  className="h-7 text-sm flex-1 border-transparent bg-transparent shadow-none px-1 focus-visible:border-input focus-visible:bg-background"
                />
                <span className="text-xs text-muted-foreground">{(day.activities || []).length} act.</span>
                <button type="button" onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)} className="text-muted-foreground hover:text-foreground">
                  {expandedDay === day.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {expandedDay === day.id && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={day.location || ''}
                      onChange={(e) => updateDayField(day.id, 'location', e.target.value)}
                      placeholder="Location (e.g., Amboseli)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={day.coordinates || ''}
                      onChange={(e) => updateDayField(day.id, 'coordinates', e.target.value)}
                      placeholder="Coordinates (lat,lng)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={day.accommodation || ''}
                      onChange={(e) => updateDayField(day.id, 'accommodation', e.target.value)}
                      placeholder="Accommodation (e.g., Serena Lodge)"
                      className="h-7 text-xs col-span-2"
                    />
                  </div>
                  {/* Accommodation image */}
                  <ImageUploadField
                    url={day.accommodation_image_url}
                    uploading={!!uploadingAccom[day.id]}
                    label="Upload accommodation photo"
                    onUpload={(e) => handleAccomImageUpload(day.id, e)}
                    onClear={() => updateDayField(day.id, 'accommodation_image_url', '')}
                  />
                </div>
              )}
            </div>

            {/* Activities */}
            {expandedDay === day.id && (
              <div className="px-4 pb-3 bg-secondary/30">
                <Droppable droppableId={day.id} type="ACTIVITY">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 pt-2">
                      {(day.activities || []).map((act, idx) => (
                        <Draggable key={act.id} draggableId={act.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`rounded-lg border border-border bg-card p-2.5 ${snapshot.isDragging ? 'shadow-md' : ''}`}
                            >
                              <div className="flex gap-2 items-start">
                                <div {...provided.dragHandleProps} className="mt-1.5 text-muted-foreground hover:text-foreground cursor-grab flex-shrink-0">
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                  <Input
                                    value={act.title}
                                    onChange={(e) => updateActivity(day.id, act.id, 'title', e.target.value)}
                                    placeholder="Activity title..."
                                    className="h-7 text-sm"
                                  />
                                  <Textarea
                                    value={act.notes || ''}
                                    onChange={(e) => updateActivity(day.id, act.id, 'notes', e.target.value)}
                                    placeholder="Notes (optional)..."
                                    className="text-xs resize-none"
                                    rows={2}
                                  />
                                  {/* Activity image */}
                                  <ImageUploadField
                                    url={act.image_url}
                                    uploading={!!uploadingAct[`${day.id}-${act.id}`]}
                                    label="Upload activity photo"
                                    onUpload={(e) => handleActImageUpload(day.id, act.id, e)}
                                    onClear={() => updateActivity(day.id, act.id, 'image_url', '')}
                                  />
                                </div>
                                <button type="button" onClick={() => removeActivity(day.id, act.id)} className="mt-1.5 text-muted-foreground hover:text-destructive flex-shrink-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <button type="button" onClick={() => addActivity(day.id)} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Plus className="w-3.5 h-3.5" /> Add activity
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
