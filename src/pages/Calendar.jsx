import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plane, MapPin, Building2 } from 'lucide-react';
import { formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';

export default function Calendar() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({ bookings: true, flights: true, vouchers: true });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.filter({ status: 'confirmed' }),
  });

  const { data: flights = [] } = useQuery({
    queryKey: ['flights'],
    queryFn: () => base44.entities.FlightTicket.list(),
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ['vouchers'],
    queryFn: () => base44.entities.Voucher.list(),
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const daysInView = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    daysInView.push(day);
  }

  const events = useMemo(() => {
    const allEvents = [];

    if (filters.bookings) {
      bookings.forEach(booking => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        allEvents.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          title: `${booking.client_name} - ${booking.package_name}`,
          startDate: start,
          endDate: end,
          data: booking,
          color: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: MapPin,
        });
      });
    }

    if (filters.flights) {
      flights.forEach(flight => {
        const date = new Date(flight.departure_date);
        allEvents.push({
          id: `flight-${flight.id}`,
          type: 'flight',
          title: `${flight.passenger_name} - ${flight.airline} ${flight.flight_number}`,
          startDate: date,
          endDate: date,
          data: flight,
          color: 'bg-purple-100 text-purple-700 border-purple-300',
          icon: Plane,
        });
      });
    }

    if (filters.vouchers) {
      vouchers.forEach(voucher => {
        const start = new Date(voucher.check_in);
        const end = new Date(voucher.check_out);
        allEvents.push({
          id: `voucher-${voucher.id}`,
          type: 'voucher',
          title: `${voucher.client_name} - ${voucher.hotel_name}`,
          startDate: start,
          endDate: end,
          data: voucher,
          color: 'bg-green-100 text-green-700 border-green-300',
          icon: Building2,
        });
      });
    }

    return allEvents;
  }, [bookings, flights, vouchers, filters]);

  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(23, 59, 59, 999);
      return date >= eventStart && date <= eventEnd;
    });
  };

  const getConflicts = (dayEvents) => {
    const byType = {};
    dayEvents.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });
    const bookingCount = byType.booking || 0;
    return bookingCount > 1 ? 'Overlapping bookings!' : null;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('calendar_overview')}</h1>
          <p className="text-muted-foreground">{t('calendar_description')}</p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <p className="text-sm font-medium mb-3">{t('show_label')}</p>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.bookings}
                onChange={(e) => setFilters(prev => ({ ...prev, bookings: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-2" />
              <span className="text-sm">{t('confirmed_bookings_filter')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.flights}
                onChange={(e) => setFilters(prev => ({ ...prev, flights: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="inline-block w-3 h-3 bg-purple-100 border border-purple-300 rounded mr-2" />
              <span className="text-sm">{t('flight_schedules')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.vouchers}
                onChange={(e) => setFilters(prev => ({ ...prev, vouchers: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded mr-2" />
              <span className="text-sm">{t('hotel_vouchers')}</span>
            </label>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Month Navigation */}
          <div className="flex justify-between items-center p-6 border-b border-border">
            <h2 className="text-xl font-semibold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                {t('today')}
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="px-4 py-3 text-center font-semibold text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-max">
            {daysInView.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const conflict = getConflicts(dayEvents);
              const isCurrentMonth = day.getMonth() === month;
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[140px] border border-border p-2 relative',
                    !isCurrentMonth && 'bg-muted/50',
                    isToday && 'ring-2 ring-primary ring-inset'
                  )}
                >
                  {/* Date */}
                  <div className={cn('text-xs font-semibold mb-1', !isCurrentMonth && 'text-muted-foreground')}>
                    {day.getDate()}
                  </div>

                  {/* Conflict Alert */}
                  {conflict && (
                    <div className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-300 mb-1 font-medium">
                      ⚠️ {conflict}
                    </div>
                  )}

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => {
                      const Icon = event.icon;
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'text-xs px-1.5 py-1 rounded border flex items-start gap-1 cursor-pointer hover:opacity-80 transition-opacity',
                            event.color
                          )}
                          title={event.title}
                        >
                          <Icon className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1.5 py-1 font-medium">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> {t('confirmed_bookings_filter')}
            </p>
            <p className="text-xs text-muted-foreground">{t('multi_day_safaris')}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Plane className="w-4 h-4 text-purple-600" /> {t('flight_schedules')}
            </p>
            <p className="text-xs text-muted-foreground">{t('departure_dates')}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-600" /> {t('hotel_vouchers')}
            </p>
            <p className="text-xs text-muted-foreground">{t('checkin_checkout_dates')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}