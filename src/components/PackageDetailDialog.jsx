import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Users, DollarSign, CheckCircle, XCircle, Tag, BedDouble, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import RouteMap from '@/components/RouteMap';

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-base font-semibold text-foreground mb-3 border-b border-border pb-2">{title}</h4>
      {children}
    </div>
  );
}

function DayCard({ day, index }) {
  const [open, setOpen] = useState(true);
  // Support both {title, notes} objects and plain strings for activities
  const activities = day.activities || [];

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">
          Day {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">{day.title || `Day ${index + 1}`}</span>
          {day.location && <span className="text-xs text-muted-foreground ml-2">📍 {day.location}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {/* Activity image */}
          {day.activity_image && (
            <img src={day.activity_image} alt="Activity" className="w-full h-36 object-cover rounded-lg" />
          )}

          {/* Description */}
          {day.description && (
            <p className="text-sm text-muted-foreground">{day.description}</p>
          )}

          {/* Activities */}
          {activities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Activities
              </p>
              <ul className="space-y-1.5">
                {activities.map((act, j) => (
                  <li key={j} className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{j + 1}</span>
                    <p className="text-sm">
                      {typeof act === 'string' ? act : (act.title || act.notes || '')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meals */}
          {day.meals && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="text-amber-600 text-xs mt-0.5">🍽</span>
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Meals</p>
                <p className="text-sm text-amber-900">{day.meals}</p>
              </div>
            </div>
          )}

          {/* Accommodation */}
          {day.accommodation && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-2">
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <BedDouble className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Accommodation</p>
                    <p className="text-sm text-blue-900">{day.accommodation}</p>
                  </div>
                </div>
                {day.accommodation_image && (
                  <img src={day.accommodation_image} alt={day.accommodation} className="w-full h-28 object-cover rounded-lg mt-2" />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PackageDetailDialog({ pkg, onClose }) {
  if (!pkg) return null;

  let itineraryDays = [];
  if (pkg.itinerary_days) {
    if (Array.isArray(pkg.itinerary_days)) {
      itineraryDays = pkg.itinerary_days;
    } else {
      try { itineraryDays = JSON.parse(pkg.itinerary_days); } catch {}
    }
  }

  const includesList = pkg.includes ? pkg.includes.split(',').map(s => s.trim()).filter(Boolean) : [];
  const excludesList = pkg.excludes ? pkg.excludes.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <Dialog open={!!pkg} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Hero Image */}
        {pkg.image_url ? (
          <div className="relative w-full h-56">
            <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <h2 className="text-xl font-bold text-white">{pkg.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <StatusBadge status={pkg.status} />
                <span className="inline-flex items-center gap-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full capitalize">
                  <Tag className="w-3 h-3" />{pkg.category?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl">{pkg.name}</DialogTitle>
            <div className="flex flex-wrap gap-2 mt-1">
              <StatusBadge status={pkg.status} />
              <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full capitalize text-muted-foreground">
                <Tag className="w-3 h-3" />{pkg.category?.replace('_', ' ')}
              </span>
            </div>
          </DialogHeader>
        )}

        <div className="p-6 space-y-6">
          {/* Overview */}
          <Section title="Overview">
            {pkg.description && <p className="text-muted-foreground text-sm mb-4">{pkg.description}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted rounded-xl p-3 flex flex-col items-center text-center">
                <MapPin className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs text-muted-foreground">Destination</span>
                <span className="text-sm font-semibold mt-0.5">{pkg.destination}</span>
              </div>
              <div className="bg-muted rounded-xl p-3 flex flex-col items-center text-center">
                <Clock className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs text-muted-foreground">Duration</span>
                <span className="text-sm font-semibold mt-0.5">{pkg.duration_days} days</span>
              </div>
              <div className="bg-muted rounded-xl p-3 flex flex-col items-center text-center">
                <DollarSign className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs text-muted-foreground">Price / Person</span>
                <span className="text-sm font-semibold mt-0.5">${pkg.price_per_person?.toLocaleString()}</span>
              </div>
              <div className="bg-muted rounded-xl p-3 flex flex-col items-center text-center">
                <Users className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs text-muted-foreground">Max Guests</span>
                <span className="text-sm font-semibold mt-0.5">{pkg.max_guests || '—'}</span>
              </div>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Pricing">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price per person</p>
                <p className="text-2xl font-bold text-primary">${pkg.price_per_person?.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="text-sm font-semibold capitalize">{pkg.category?.replace('_', ' ')}</p>
              </div>
            </div>
            {pkg.max_guests && (
              <p className="text-xs text-muted-foreground mt-2">
                Maximum group size: <span className="font-medium">{pkg.max_guests} guests</span>
              </p>
            )}
          </Section>

          {/* Includes & Excludes */}
          {(includesList.length > 0 || excludesList.length > 0) && (
            <Section title="What's Included">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {includesList.length > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-green-700 flex items-center gap-1.5 mb-3">
                      <CheckCircle className="w-4 h-4" /> Included
                    </h5>
                    <ul className="space-y-1.5">
                      {includesList.map((item, i) => (
                        <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                          <span className="text-green-500 mt-1 text-xs">✓</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {excludesList.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-3">
                      <XCircle className="w-4 h-4" /> Not Included
                    </h5>
                    <ul className="space-y-1.5">
                      {excludesList.map((item, i) => (
                        <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                          <span className="text-red-400 mt-1 text-xs">✗</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Route map — day-accurate when itinerary exists, falls back to destination */}
          <Section title="Route">
            <RouteMap
              itinerary={itineraryDays.length > 0 ? itineraryDays : undefined}
              destinations={itineraryDays.length === 0 ? [pkg.destination].filter(Boolean) : undefined}
            />
          </Section>

          {/* Itinerary */}
          {itineraryDays.length > 0 && (
            <Section title={`Itinerary (${itineraryDays.length} Days)`}>
              <div className="space-y-3">
                {itineraryDays.map((day, i) => (
                  <DayCard key={i} day={day} index={i} />
                ))}
              </div>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}