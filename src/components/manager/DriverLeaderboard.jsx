import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

export default function DriverLeaderboard({ drivers, feedback, assignments, messages }) {
  const getPerformanceScore = (driverId) => {
    const driverAssignments = assignments.filter(a => a.driver_id === driverId);
    const driverFeedback = feedback.filter(f => 
      driverAssignments.some(a => a.booking_id === f.booking_id)
    );
    const driverIssues = messages.filter(m => 
      m.subject?.includes('Issue Report') && 
      m.client_id === driverId
    ).length;

    const completionRate = driverAssignments.length > 0
      ? (driverAssignments.filter(a => a.status === 'completed').length / driverAssignments.length) * 100
      : 0;

    const avgRating = driverFeedback.length > 0
      ? driverFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / driverFeedback.length
      : 0;

    // Score = (completion rate * 0.4) + (avg rating * 20 * 0.4) + (100 - min(issues, 10) * 10 * 0.2)
    const issueScore = Math.max(0, 100 - (driverIssues * 10));
    const score = (completionRate * 0.4) + (avgRating * 20 * 0.4) + (issueScore * 0.2);

    return Math.min(100, score).toFixed(1);
  };

  const rankedDrivers = drivers
    .map(d => ({
      ...d,
      score: parseFloat(getPerformanceScore(d.id)),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Performance Leaderboard
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Ranked by completion rate, client feedback, and issue reports
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankedDrivers.map((driver, index) => (
              <div
                key={driver.id}
                className="flex items-center justify-between p-4 bg-accent/30 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                    {index + 1}
                    {index === 0 && <Trophy className="w-4 h-4 absolute" />}
                  </div>
                  <div>
                    <p className="font-semibold">{driver.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      License: {driver.license_expiry}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{driver.score}</p>
                  <p className="text-xs text-muted-foreground">Performance Score</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}