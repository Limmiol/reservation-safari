import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RevenueChart({ bookings, payments }) {
  const monthlyData = {};
  
  bookings.forEach(booking => {
    const date = new Date(booking.created_date);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyData[month]) monthlyData[month] = 0;
  });

  payments
    .filter(p => p.status === 'confirmed')
    .forEach(payment => {
      const date = new Date(payment.created_date);
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (monthlyData[month] !== undefined) monthlyData[month] += payment.amount || 0;
    });

  const chartData = Object.entries(monthlyData).map(([month, revenue]) => ({
    month,
    revenue: Math.round(revenue)
  })).slice(-12);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold">Monthly Revenue</h3>
        <p className="text-xs text-muted-foreground mt-1">Booking revenue trends over the last 12 months</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem'
            }}
            formatter={(value) => `$${value.toLocaleString()}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}