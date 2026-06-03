import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp } from 'lucide-react';

export default function IssueAnalytics({ drivers, messages }) {
  const issueReports = messages.filter(m => m.subject?.includes('Issue Report'));

  const getIssuesPerDriver = () => {
    const issuesByDriver = {};

    issueReports.forEach((report) => {
      const driverId = report.client_id;
      if (!issuesByDriver[driverId]) {
        issuesByDriver[driverId] = [];
      }
      issuesByDriver[driverId].push(report);
    });

    return Object.entries(issuesByDriver)
      .map(([driverId, issues]) => {
        const driver = drivers.find(d => d.id === driverId);
        const issueSeverity = issues.reduce((acc, issue) => {
          const body = issue.body || '';
          if (body.includes('Critical')) acc.critical++;
          else if (body.includes('High')) acc.high++;
          else if (body.includes('Medium')) acc.medium++;
          else acc.low++;
          return acc;
        }, { critical: 0, high: 0, medium: 0, low: 0 });

        return {
          driverId,
          driverName: driver?.full_name || 'Unknown',
          totalIssues: issues.length,
          ...issueSeverity,
        };
      })
      .sort((a, b) => b.totalIssues - a.totalIssues);
  };

  const issuesByDriver = getIssuesPerDriver();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Issue Reports Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Breakdown of reported vehicle and operational issues
          </p>
        </CardHeader>
        <CardContent>
          {issuesByDriver.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No issues reported</p>
            </div>
          ) : (
            <div className="space-y-4">
              {issuesByDriver.map((driver) => (
                <div key={driver.driverId} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold">{driver.driverName}</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{driver.totalIssues} issues</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-red-50 rounded p-3 text-center">
                      <p className="text-sm text-muted-foreground">Critical</p>
                      <p className="text-xl font-semibold text-red-600">{driver.critical}</p>
                    </div>
                    <div className="bg-orange-50 rounded p-3 text-center">
                      <p className="text-sm text-muted-foreground">High</p>
                      <p className="text-xl font-semibold text-orange-600">{driver.high}</p>
                    </div>
                    <div className="bg-yellow-50 rounded p-3 text-center">
                      <p className="text-sm text-muted-foreground">Medium</p>
                      <p className="text-xl font-semibold text-yellow-600">{driver.medium}</p>
                    </div>
                    <div className="bg-blue-50 rounded p-3 text-center">
                      <p className="text-sm text-muted-foreground">Low</p>
                      <p className="text-xl font-semibold text-blue-600">{driver.low}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}