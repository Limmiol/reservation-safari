import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BookingCalendar({ bookings }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(b => ['confirmed', 'in_progress'].includes(b.status) && new Date(b.start_date) >= new Date())
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }, [bookings]);

  const bookingsByDate = useMemo(() => {
    const map = {};
    upcomingBookings.forEach(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(booking);
      }
    });
    return map;
  }, [upcomingBookings]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().split('T')[0];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Upcoming Bookings Calendar</h3>
            <p className="text-xs text-muted-foreground mt-1">Visual schedule of confirmed trips and overlaps</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthYear}</span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground h-8 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-20 bg-muted/30 rounded" />;
            }

            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayBookings = bookingsByDate[dateStr] || [];
            const isToday = dateStr === today;
            const isInPast = new Date(dateStr) < new Date(today);

            return (
              <div
                key={day}
                className={`h-20 rounded border p-1 text-xs flex flex-col ${
                  isInPast ? 'bg-muted/20 opacity-50' : isToday ? 'bg-primary/10 border-primary' : 'bg-background border-border'
                }`}
              >
                <div className={`font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {day}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {dayBookings.length > 0 && (
                    <>
                      {dayBookings.slice(0, 2).map((booking, i) => (
                        <div
                          key={i}
                          className="bg-primary text-primary-foreground text-[10px] px-1 py-0.5 rounded truncate font-medium mb-0.5"
                          title={`${booking.client_name} - ${booking.package_name}`}
                        >
                          {booking.client_name?.split(' ')[0]}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-primary font-medium px-1">
                          +{dayBookings.length - 2} more
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {upcomingBookings.length > 0 && (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3">Next 5 Departures</h4>
          <div className="space-y-2">
            {upcomingBookings.slice(0, 5).map(booking => (
              <div key={booking.id} className="text-xs p-2 rounded bg-secondary/20 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{booking.client_name}</p>
                  <p className="text-muted-foreground">{booking.package_name} • {new Date(booking.start_date).toLocaleDateString()}</p>
                </div>
                <span className="text-[10px] font-semibold text-primary bg-primary/20 px-2 py-1 rounded">{booking.num_guests} guests</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingBookings.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No upcoming bookings scheduled
        </div>
      )}
    </div>
  );
}