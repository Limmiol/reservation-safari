import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, MapPin, Utensils, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ItineraryTimeline({ itineraryData }) {
  const days = typeof itineraryData === 'string' 
    ? JSON.parse(itineraryData) 
    : itineraryData || [];

  if (days.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No itinerary data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="relative">
          {/* Day Header */}
          <div className="mb-4">
            <h3 className="text-xl font-bold">Day {day.day}</h3>
            <p className="text-muted-foreground">{day.description}</p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            {day.activities.length > 0 && (
              <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-primary/30" />
            )}

            {/* Activities */}
            <div className="space-y-4">
              {day.activities.map((activity, actIndex) => (
                <div key={activity.id} className="relative pl-20">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />

                  {/* Activity Card */}
                  <Card className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{activity.time}</span>
                        </div>
                        <h4 className="text-lg font-semibold mb-1">{activity.title}</h4>
                        {activity.location && (
                          <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{activity.location}</span>
                          </div>
                        )}
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* Day Summary */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                {day.accommodation && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Accommodation</p>
                      <p className="text-sm font-semibold">{day.accommodation}</p>
                    </div>
                  </div>
                )}
                {day.meals && (
                  <div className="flex items-start gap-3">
                    <Utensils className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Meals</p>
                      <p className="text-sm font-semibold">{day.meals}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}