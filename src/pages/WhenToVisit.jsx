import React from 'react';
import PageHeader from '@/components/ui/PageHeader';
import SeasonalAdvisor from '@/components/safari/SeasonalAdvisor';

export default function WhenToVisit() {
  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      <PageHeader
        title="When to Visit"
        description="Month-by-month wildlife scoring, weather patterns, and pricing seasons across East African parks."
      />
      <SeasonalAdvisor />
    </div>
  );
}
