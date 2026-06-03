import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function PerformanceOverview({ drivers, assignments, feedback, messages }) {
  const getDriverStats = (driverId) => {
    const driverAssignments = assignments.filter(a => a.driver_id === driverId);
    const driverIssues = messages.filter(m => 
      m.subject?.includes('Issue Report') && 
      m.client_id === driverId
    ).length;
    const driverFeedback = feedback.filter(f => 
      driverAssignments.some(a => a.booking_id === f.booking_id)
    );

    const avgRating = driverFeedback.length > 0
      ? (driverFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / driverFeedback.length).toFixed(1)
      : null;

    const completedTrips = driverAssignments.filter(a => a.status === 'completed').length;
    const completionRate = driverAssignments.length > 0
      ? ((completedTrips / driverAssignments.length) * 100).toFixed(0)
      : null;

    return {
      totalTrips: driverAssignments.length,
      completedTrips,
      completionRate,
      issuesReported: driverIssues,
      avgRating,
      feedbackCount: driverFeedback.length,
    };
  };

  return (
    <div className="grid gap-4">
      {drivers.map((driver) => {
        const stats = getDriverStats(driver.id);

        return (
          <Card key={driver.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{driver.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {driver.employment_status === 'active' ? '✓ Active' : '⊗ Inactive'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Trips Completed */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-muted-foreground">Trips Completed</p>
                  </div>
                  <p className="text-2xl font-semibold">
                    {stats.completedTrips}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      / {stats.totalTrips}
                    </span>
                  </p>
                  {stats.completionRate && (
                    <p className="text-xs text-muted-foreground mt-1">{stats.completionRate}% completion</p>
                  )}
                </div>

                {/* Issues Reported */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <p className="text-sm text-muted-foreground">Issues</p>
                  </div>
                  <p className="text-2xl font-semibold">{stats.issuesReported}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </div>

                {/* Client Rating */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-warning">★</span>
                    <p className="text-sm text-muted-foreground">Rating</p>
                  </div>
                  <p className="text-2xl font-semibold">
                    {stats.avgRating ? `${stats.avgRating}/5` : '—'}
                  </p>
                  {stats.feedbackCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{stats.feedbackCount} reviews</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Availability</p>
                  </div>
                  <p className="text-sm font-semibold capitalize">{driver.availability_status}</p>
                  <p className="text-xs text-muted-foreground mt-1">License: {driver.license_expiry}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {drivers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>No drivers found</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}