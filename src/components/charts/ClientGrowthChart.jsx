import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ClientGrowthChart({ clients }) {
  const monthlyClients = {};
  
  clients.forEach(client => {
    const date = new Date(client.created_date);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyClients[month] = (monthlyClients[month] || 0) + 1;
  });

  const chartData = Object.entries(monthlyClients)
    .map(([month, count]) => ({
      month,
      clients: count
    }))
    .slice(-12);

  // Calculate cumulative growth
  let cumulative = 0;
  const cumulativeData = chartData.map(item => {
    cumulative += item.clients;
    return { ...item, totalClients: cumulative };
  });

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold">Client Growth</h3>
        <p className="text-xs text-muted-foreground mt-1">Active client growth trends over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={cumulativeData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem'
            }}
            formatter={(value) => [value, 'Total Clients']}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="totalClients" 
            fill="hsl(var(--primary) / 0.1)" 
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Total Clients"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}