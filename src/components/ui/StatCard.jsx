import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-primary rounded-xl">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}