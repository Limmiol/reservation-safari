import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UpcomingAssignments from '@/components/driver/UpcomingAssignments';
import IssueReportForm from '@/components/driver/IssueReportForm';
import DocumentUpload from '@/components/driver/DocumentUpload';
import { AlertCircle, FileText, ClipboardList } from 'lucide-react';

export default function DriverPortal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setLoading(false);
    };
    loadUser();
  }, []);

  const { data: driverProfile } = useQuery({
    queryKey: ['driver-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const drivers = await base44.entities.Driver.filter({ email: user.email });
      return drivers?.[0] || null;
    },
    enabled: !!user?.email,
  });

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Driver Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {driverProfile?.full_name || user?.full_name || 'Driver'}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="grid w-full max-w-sm grid-cols-3">
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Report Issues
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <UpcomingAssignments driverEmail={user?.email} driverId={driverProfile?.id} />
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <IssueReportForm driverName={driverProfile?.full_name} driverId={driverProfile?.id} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentUpload driverName={driverProfile?.full_name} driverId={driverProfile?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}