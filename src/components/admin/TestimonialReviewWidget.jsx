import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, CheckCircle, XCircle, Star } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

export default function TestimonialReviewWidget() {
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: () => base44.entities.Feedback.list('-created_date', 100),
  });

  const approveMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.Feedback.update(id, { status: 'approved', admin_notes: adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      setSelectedFeedback(null);
      setAdminNotes('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.Feedback.update(id, { status: 'rejected', admin_notes: adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      setSelectedFeedback(null);
      setAdminNotes('');
    },
  });

  const featureMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.Feedback.update(id, { featured: !selectedFeedback?.featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
    },
  });

  const pending = feedbacks.filter((f) => f.status === 'pending');
  const approved = feedbacks.filter((f) => f.status === 'approved');
  const featured = feedbacks.filter((f) => f.featured && f.status === 'approved');

  const handleOpenFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.admin_notes || '');
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Testimonial Reviews</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{pending.length}</p>
            <p className="text-xs text-yellow-600">Pending</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{approved.length}</p>
            <p className="text-xs text-green-600">Approved</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{featured.length}</p>
            <p className="text-xs text-blue-600">Featured</p>
          </div>
        </div>

        {/* Pending Reviews */}
        {pending.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 text-yellow-700">Pending Review</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pending.slice(0, 5).map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => handleOpenFeedback(feedback)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{feedback.client_name}</p>
                      <p className="text-xs text-muted-foreground">{feedback.review_title}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < feedback.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(feedback.created_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Testimonials */}
        {approved.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 text-green-700">Approved Testimonials</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {approved.slice(0, 3).map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleOpenFeedback(feedback)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{feedback.client_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{feedback.review_text}</p>
                    </div>
                    {feedback.featured && <div className="text-xs font-semibold text-blue-600">★ Featured</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Feedback</DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* Header */}
              <div className="border-b pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{selectedFeedback.client_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedFeedback.package_name}</p>
                  </div>
                  <StatusBadge status={selectedFeedback.status} />
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < selectedFeedback.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Review Content */}
              <div>
                <h4 className="font-semibold mb-1">{selectedFeedback.review_title}</h4>
                <p className="text-sm text-foreground">{selectedFeedback.review_text}</p>
                {selectedFeedback.would_recommend && (
                  <p className="text-xs text-green-600 mt-2">✓ Would recommend this package</p>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  className="min-h-20"
                />
              </div>

              {/* Actions */}
              <DialogFooter className="flex gap-2 flex-wrap">
                {selectedFeedback.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => rejectMutation.mutate(selectedFeedback.id)}
                      disabled={rejectMutation.isPending}
                      className="gap-2 flex-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(selectedFeedback.id)}
                      disabled={approveMutation.isPending}
                      className="gap-2 flex-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                  </>
                )}

                {selectedFeedback.status === 'approved' && (
                  <Button
                    variant={selectedFeedback.featured ? 'default' : 'outline'}
                    onClick={() => featureMutation.mutate(selectedFeedback.id)}
                    disabled={featureMutation.isPending}
                    className="gap-2 w-full"
                  >
                    ★ {selectedFeedback.featured ? 'Remove from Featured' : 'Mark as Featured'}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}