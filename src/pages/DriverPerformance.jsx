import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PerformanceOverview from '@/components/manager/PerformanceOverview';
import DriverLeaderboard from '@/components/manager/DriverLeaderboard';
import IssueAnalytics from '@/components/manager/IssueAnalytics';
import FeedbackSummary from '@/components/manager/FeedbackSummary';
import { BarChart3, TrendingUp, AlertTriangle, Star } from 'lucide-react';

export default function DriverPerformance() {
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-performance'],
    queryFn: () => base44.entities.Driver.list('-updated_date'),
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback-performance'],
    queryFn: () => base44.entities.Feedback.list('-created_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-performance'],
    queryFn: () => base44.entities.ResourceAssignment.list('-updated_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages-performance'],
    queryFn: () => base44.entities.Message.list('-created_date', 100),
  });

  // Calculate average rating
  const avgRating = feedback.length > 0 
    ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : 0;

  // Count recent issues (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentIssues = messages.filter(m => 
    m.subject?.includes('Issue Report') && 
    new Date(m.created_date) >= thirtyDaysAgo
  ).length;

  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const completionRate = assignments.length > 0 
    ? ((completedAssignments / assignments.length) * 100).toFixed(0)
    : 0;

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Driver Performance Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track performance metrics and team insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Drivers</p>
              <p className="text-3xl font-semibold">{drivers.length}</p>
            </div>
            <TrendingUp className="w-5 h-5 text-primary opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Trip Completion Rate</p>
              <p className="text-3xl font-semibold">{completionRate}%</p>
            </div>
            <BarChart3 className="w-5 h-5 text-primary opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Recent Issues (30 days)</p>
              <p className="text-3xl font-semibold">{recentIssues}</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-destructive opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Client Rating</p>
              <p className="text-3xl font-semibold">{avgRating}/5</p>
            </div>
            <Star className="w-5 h-5 text-warning opacity-50" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PerformanceOverview 
            drivers={drivers} 
            assignments={assignments} 
            feedback={feedback}
            messages={messages}
          />
        </TabsContent>

        <TabsContent value="leaderboard">
          <DriverLeaderboard 
            drivers={drivers} 
            feedback={feedback}
            assignments={assignments}
            messages={messages}
          />
        </TabsContent>

        <TabsContent value="issues">
          <IssueAnalytics 
            drivers={drivers}
            messages={messages}
          />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackSummary 
            drivers={drivers}
            feedback={feedback}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}