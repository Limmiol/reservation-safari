import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { TrendingUp, Package, Calendar, DollarSign } from 'lucide-react';

export default function MonthlyReportingSection({ bookings = [], payments = [], packages = [] }) {
  const monthlyData = useMemo(() => {
    const months = {};
    const today = new Date();
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: 0, bookings: 0, confirmed: 0 };
    }

    payments.forEach(p => {
      if (p.payment_date && p.status === 'confirmed') {
        const [year, month] = p.payment_date.split('-');
        const key = `${year}-${month}`;
        if (months[key]) months[key].revenue += p.amount || 0;
      }
    });

    bookings.forEach(b => {
      if (b.start_date) {
        const [year, month] = b.start_date.split('-');
        const key = `${year}-${month}`;
        if (months[key]) {
          months[key].bookings++;
          if (b.status === 'confirmed') months[key].confirmed++;
        }
      }
    });

    return Object.values(months);
  }, [payments, bookings]);

  const packagePerformance = useMemo(() => {
    const perf = {};
    bookings.forEach(b => {
      if (!perf[b.package_name]) {
        perf[b.package_name] = { name: b.package_name, revenue: 0, bookings: 0, avgGuests: 0 };
      }
      perf[b.package_name].bookings++;
      perf[b.package_name].revenue += b.total_amount || 0;
    });

    return Object.values(perf)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [bookings]);

  const bookingSource = useMemo(() => {
    const sources = { direct: 0, ota: 0, agent: 0 };
    bookings.forEach(b => {
      sources[b.booking_source] = (sources[b.booking_source] || 0) + 1;
    });
    return [
      { name: 'Direct', value: sources.direct },
      { name: 'OTA', value: sources.ota },
      { name: 'Agent', value: sources.agent }
    ].filter(x => x.value > 0);
  }, [bookings]);

  const seasonalInsight = useMemo(() => {
    const busiest = monthlyData.reduce((max, m) => m.bookings > max.bookings ? m : max);
    const highest = monthlyData.reduce((max, m) => m.revenue > max.revenue ? m : max);
    return { busiest, highest };
  }, [monthlyData]);

  const COLORS = ['#8b5cf6', '#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa502'];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-6">Business Reporting & Insights</h2>
        
        {/* Monthly Revenue & Bookings Trend */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-8">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Monthly Trends (Last 12 Months)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value, name) => name === 'Revenue' ? formatCurrency(value) : value}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Revenue" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="hsl(var(--chart-2))" name="Bookings" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Packages */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-8">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Top Performing Packages
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={packagePerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value, name) => name === 'Revenue' ? formatCurrency(value) : value}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
              <Bar yAxisId="right" dataKey="bookings" fill="hsl(var(--chart-2))" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Booking Source & Seasonal Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Source Distribution */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Booking Source Distribution
            </h3>
            {bookingSource.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={bookingSource} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {bookingSource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No booking data</div>
            )}
          </div>

          {/* Seasonal Insights */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Seasonal Insights
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-accent/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Busiest Month</p>
                <p className="text-lg font-semibold">{seasonalInsight.busiest.month}</p>
                <p className="text-xs text-muted-foreground mt-1">{seasonalInsight.busiest.bookings} bookings</p>
              </div>
              <div className="p-4 bg-success/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Highest Revenue Month</p>
                <p className="text-lg font-semibold">{seasonalInsight.highest.month}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(seasonalInsight.highest.revenue)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Average Monthly Revenue</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}