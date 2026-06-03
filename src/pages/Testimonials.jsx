import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Quote } from 'lucide-react';

export default function Testimonials() {
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const all = await base44.entities.Feedback.filter({ status: 'approved' });
      return all.sort((a, b) => {
        if (a.featured === b.featured) {
          return new Date(b.created_date) - new Date(a.created_date);
        }
        return a.featured ? -1 : 1;
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const featured = testimonials.filter((t) => t.featured);
  const others = testimonials.filter((t) => !t.featured);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Client Testimonials</h1>
        <p className="text-lg text-muted-foreground">
          Hear what our clients say about their safari experiences
        </p>
      </div>

      {/* Featured Testimonials */}
      {featured.length > 0 && (
        <div className="mb-16">
          <h2 className="text-2xl font-semibold mb-8 text-center">Spotlight Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-gradient-to-br from-accent/5 to-primary/5 border-2 border-primary/20 rounded-2xl p-8 relative"
              >
                <Quote className="w-8 h-8 text-primary/30 absolute top-4 right-4" />
                
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < testimonial.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>

                <h3 className="text-lg font-semibold mb-2">{testimonial.review_title}</h3>
                <p className="text-foreground mb-4 leading-relaxed">{testimonial.review_text}</p>

                <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                  <div>
                    <p className="font-semibold text-sm">{testimonial.client_name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.package_name}</p>
                  </div>
                  {testimonial.would_recommend && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      ✓ Recommended
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Testimonials */}
      {others.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-6 text-center">More Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {others.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>

                <h4 className="font-semibold text-sm mb-1 line-clamp-2">{testimonial.review_title}</h4>
                <p className="text-sm text-foreground mb-3 line-clamp-3">{testimonial.review_text}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs">{testimonial.client_name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.package_name}</p>
                  </div>
                  {testimonial.would_recommend && (
                    <span className="text-xs text-green-600">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {testimonials.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No testimonials available yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
        </div>
      )}

      {/* Stats */}
      {testimonials.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{testimonials.length}</p>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {(testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {Math.round((testimonials.filter((t) => t.would_recommend).length / testimonials.length) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">Recommend</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{featured.length}</p>
              <p className="text-sm text-muted-foreground">Featured</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}