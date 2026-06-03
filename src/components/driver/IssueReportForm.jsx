import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function IssueReportForm({ driverName, driverId }) {
  const [formData, setFormData] = useState({
    issue_type: 'maintenance',
    vehicle_issue: '',
    severity: 'medium',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async (data) => {
      // Store in Message entity as a report
      return base44.entities.Message.create({
        conversation_id: `driver-${driverId}-issues`,
        booking_id: '',
        client_id: driverId,
        client_name: driverName,
        client_email: '',
        sender_type: 'admin',
        sender_name: driverName,
        sender_email: '',
        subject: `Vehicle Issue Report - ${data.issue_type}`,
        body: `Issue Type: ${data.issue_type}\nVehicle Issue: ${data.vehicle_issue}\nSeverity: ${data.severity}\n\nDescription:\n${data.description}`,
        is_read: false,
        status: 'open',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-issues'] });
      setSubmitted(true);
      toast.success('Issue reported successfully');
      setTimeout(() => {
        setFormData({
          issue_type: 'maintenance',
          vehicle_issue: '',
          severity: 'medium',
          description: '',
        });
        setSubmitted(false);
      }, 3000);
    },
    onError: (error) => {
      toast.error('Failed to report issue');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.vehicle_issue.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    reportMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-center mx-auto max-w-sm">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Issue reported successfully</p>
              <p className="text-sm text-green-700 mt-1">Management team has been notified</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a Vehicle Issue</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Notify management of any vehicle problems or maintenance needs
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Type */}
          <div>
            <label className="text-sm font-medium block mb-2">Issue Type</label>
            <Select value={formData.issue_type} onValueChange={(val) => setFormData({ ...formData, issue_type: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance Required</SelectItem>
                <SelectItem value="damage">Vehicle Damage</SelectItem>
                <SelectItem value="mechanical">Mechanical Issue</SelectItem>
                <SelectItem value="safety">Safety Concern</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Issue */}
          <div>
            <label className="text-sm font-medium block mb-2">What's the problem?</label>
            <Input
              placeholder="e.g., Engine overheating, Flat tire, Air conditioning not working"
              value={formData.vehicle_issue}
              onChange={(e) => setFormData({ ...formData, vehicle_issue: e.target.value })}
              required
            />
          </div>

          {/* Severity */}
          <div>
            <label className="text-sm font-medium block mb-2">Severity Level</label>
            <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Can wait</SelectItem>
                <SelectItem value="medium">Medium - Should be addressed soon</SelectItem>
                <SelectItem value="high">High - Urgent attention needed</SelectItem>
                <SelectItem value="critical">Critical - Unsafe to operate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium block mb-2">Description</label>
            <Textarea
              placeholder="Provide detailed description of the issue, when it started, and any other relevant information..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-24"
              required
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={reportMutation.isPending}
          >
            {reportMutation.isPending ? 'Submitting...' : 'Report Issue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}