import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PackageChart({ bookings, packages }) {
  const packageCounts = {};
  
  packages.forEach(pkg => {
    packageCounts[pkg.name] = 0;
  });

  bookings.forEach(booking => {
    if (booking.package_name && packageCounts[booking.package_name] !== undefined) {
      packageCounts[booking.package_name]++;
    }
  });

  const chartData = Object.entries(packageCounts)
    .map(([name, count]) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      fullName: name,
      bookings: count,
      revenue: bookings
        .filter(b => b.package_name === name)
        .reduce((sum, b) => sum + (b.total_amount || 0), 0)
    }))
    .filter(item => item.bookings > 0)
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 8);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold">Popular Packages</h3>
        <p className="text-xs text-muted-foreground mt-1">Most booked travel packages by number of bookings</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem'
            }}
            formatter={(value) => [value, 'Bookings']}
            labelFormatter={(label) => `Package: ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="bookings" 
            fill="hsl(var(--primary))" 
            radius={[8, 8, 0, 0]}
            name="Bookings"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}