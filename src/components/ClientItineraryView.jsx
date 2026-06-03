import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, MapPin, Truck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientItineraryView({ booking, packageData }) {
  const [expanded, setExpanded] = useState(new Set());
  
  const itinerary = useMemo(() => {
    if (booking?.custom_itinerary) {
      try {
        return JSON.parse(booking.custom_itinerary);
      } catch {
        return [];
      }
    }
    return [];
  }, [booking?.custom_itinerary]);

  if (!itinerary.length) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground">
        <p>Your detailed itinerary will be available soon. Please check back later.</p>
      </div>
    );
  }

  const toggleExpanded = (dayNum) => {
    const newSet = new Set(expanded);
    if (newSet.has(dayNum)) {
      newSet.delete(dayNum);
    } else {
      newSet.add(dayNum);
    }
    setExpanded(newSet);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">Your Itinerary</h2>
      
      <div className="space-y-2">
        {itinerary.map(day => (
          <div key={day.id || day.day} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleExpanded(day.day)}
              className={cn(
                'w-full px-4 py-4 flex justify-between items-center transition-colors',
                expanded.has(day.day) ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <div className="text-left flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                    {day.day}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{day.title || `Day ${day.day}`}</p>
                    {day.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {day.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {expanded.has(day.day) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {expanded.has(day.day) && (
              <div className="px-4 py-4 border-t border-border bg-background/50 space-y-4">
                {day.transport && (
                  <div className="flex gap-3">
                    <Truck className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Transport</p>
                      <p className="text-sm text-foreground">{day.transport}</p>
                    </div>
                  </div>
                )}

                {(day.activities || []).filter(a => a.title).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">Activities</p>
                    <ul className="space-y-2">
                      {(day.activities || []).filter(a => a.title).map((act, i) => (
                        <li key={act.id || i} className="flex gap-2">
                          <span className="text-foreground text-sm">•</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{act.title}</p>
                            {act.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{act.notes}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}