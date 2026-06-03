import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye } from 'lucide-react';
import ItineraryBuilder from '@/components/itinerary/ItineraryBuilder';
import ItineraryTimeline from '@/components/itinerary/ItineraryTimeline';
import PageHeader from '@/components/ui/PageHeader';

export default function ItineraryManager() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.Package.list(),
  });

  const handleSaveItinerary = async (itineraryJson) => {
    try {
      await base44.entities.Package.update(selectedPackage.id, {
        itinerary_days: itineraryJson
      });
      setOpenDialog(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Failed to save itinerary:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading packages...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safari Itinerary Manager"
        description="Create and manage detailed day-by-day itineraries for your safari packages"
      />

      <div className="grid gap-4">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{pkg.destination}</p>
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{pkg.duration_days} days</span>
                  <span>${pkg.price_per_person}/person</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog open={openDialog && selectedPackage?.id === pkg.id} onOpenChange={setOpenDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setSelectedPackage(pkg)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Edit Itinerary
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Itinerary - {pkg.name}</DialogTitle>
                    </DialogHeader>
                    <ItineraryBuilder
                      packageData={pkg}
                      onSave={handleSaveItinerary}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={() => setPreviewData(pkg)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Itinerary Preview - {previewData?.name}</DialogTitle>
          </DialogHeader>
          <ItineraryTimeline itineraryData={previewData?.itinerary_days} />
        </DialogContent>
      </Dialog>
    </div>
  );
}