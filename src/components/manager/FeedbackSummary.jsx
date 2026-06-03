import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare } from 'lucide-react';

export default function FeedbackSummary({ drivers, feedback }) {
  const getFeedbackByDriver = () => {
    const feedbackByDriver = {};

    feedback.forEach((fb) => {
      if (!feedbackByDriver[fb.client_id]) {
        feedbackByDriver[fb.client_id] = [];
      }
      feedbackByDriver[fb.client_id].push(fb);
    });

    return Object.entries(feedbackByDriver)
      .map(([clientId, clientFeedback]) => {
        const driver = drivers.find(d => d.id === clientId);
        const avgRating = (
          clientFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / clientFeedback.length
        ).toFixed(1);
        const recommendationRate = (
          (clientFeedback.filter(f => f.would_recommend).length / clientFeedback.length) * 100
        ).toFixed(0);

        return {
          driverId: clientId,
          driverName: driver?.full_name || 'Unknown',
          totalReviews: clientFeedback.length,
          avgRating: parseFloat(avgRating),
          recommendationRate: parseFloat(recommendationRate),
          reviews: clientFeedback,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating);
  };

  const feedbackByDriver = getFeedbackByDriver();

  return (
    <div className="space-y-4">
      {feedbackByDriver.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No client feedback yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        feedbackByDriver.map((driver) => (
          <Card key={driver.driverId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{driver.driverName}</CardTitle>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="text-sm font-semibold">{driver.avgRating}/5</span>
                      <span className="text-xs text-muted-foreground">({driver.totalReviews} reviews)</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {driver.recommendationRate}% would recommend
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {driver.reviews.map((review, idx) => (
                  <div key={idx} className="border border-border rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {Array(5).fill(0).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? 'fill-warning text-warning'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{review.review_title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}