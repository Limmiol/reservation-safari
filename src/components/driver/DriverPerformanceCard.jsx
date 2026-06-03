import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, TrendingUp, Car, Clock, Award } from 'lucide-react';

export default function DriverPerformanceCard({ driver, stats, assignments, feedback }) {
  const completionRate = stats?.completionRate || 0;
  const avgRating = stats?.avgRating || 0;
  const totalTrips = stats?.totalTrips || 0;

  // Calculate performance score (0-100)
  const performanceScore = Math.round(
    (completionRate * 0.4) +
    (Math.min(avgRating * 20, 100) * 0.4) +
    (Math.min(totalTrips * 2, 100) * 0.2)
  );

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <Card className="border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(performanceScore)}`}>
              {performanceScore}% {getPerformanceLabel(performanceScore)}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {driver.employment_status}
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Performance Score */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Performance Score</span>
              <span className="font-medium">{performanceScore}%</span>
            </div>
            <Progress value={performanceScore} className="h-2" />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Car className="w-3 h-3" />
                <span className="text-xs">Trips</span>
              </div>
              <p className="text-lg font-semibold">{totalTrips}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs">Rate</span>
              </div>
              <p className="text-lg font-semibold">{completionRate}%</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Star className="w-3 h-3" />
                <span className="text-xs">Rating</span>
              </div>
              <p className="text-lg font-semibold">{avgRating || 'N/A'}</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Recent Activity</span>
              <span>Last 30 days</span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs">{assignments?.filter(a => {
                  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  return new Date(a.created_date) >= thirtyDaysAgo;
                }).length || 0} assignments</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span className="text-xs">{feedback?.length || 0} reviews</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}