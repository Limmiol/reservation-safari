import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star, Send, Check } from 'lucide-react';

export default function FeedbackForm({ booking, client, disabled = false }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');
  const [recommend, setRecommend] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Feedback.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-feedback'] });
      setSubmitted(true);
      setTimeout(() => {
        setRating(5);
        setTitle('');
        setReview('');
        setRecommend(true);
        setSubmitted(false);
      }, 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !review.trim()) return;

    mutation.mutate({
      booking_id: booking.id,
      booking_ref: booking.booking_ref,
      client_id: client.id,
      client_name: client.full_name,
      client_email: client.email,
      package_id: booking.package_id,
      package_name: booking.package_name,
      rating,
      review_title: title,
      review_text: review,
      would_recommend: recommend,
    });
  };

  if (disabled) {
    return null;
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-1">Thank you!</h3>
        <p className="text-sm text-green-700">Your feedback has been submitted for review.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-4">Share Your Experience</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium mb-2 block">Review Title</label>
          <Input
            placeholder="e.g., 'Incredible wildlife experience'"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Review */}
        <div>
          <label className="text-sm font-medium mb-2 block">Your Review</label>
          <Textarea
            placeholder="Tell us about your safari experience. What did you enjoy most? Any highlights?"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={500}
            className="min-h-24"
          />
          <p className="text-xs text-muted-foreground mt-1">{review.length}/500</p>
        </div>

        {/* Recommendation */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="recommend"
            checked={recommend}
            onChange={(e) => setRecommend(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
          />
          <label htmlFor="recommend" className="text-sm cursor-pointer">
            I would recommend this package to others
          </label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={!title.trim() || !review.trim() || mutation.isPending}
          className="w-full gap-2"
        >
          {mutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Feedback
            </>
          )}
        </Button>
      </form>
    </div>
  );
}