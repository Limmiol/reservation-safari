import React from 'react';
import { ArrowLeft, Clock, Calendar, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/helpers';
import ReactMarkdown from 'react-markdown';

const CATEGORY_LABELS = {
  packing_tips: 'Packing Tips',
  best_time_to_visit: 'Best Time to Visit',
  wildlife: 'Wildlife',
  destinations: 'Destinations',
  travel_tips: 'Travel Tips',
  health_safety: 'Health & Safety',
  culture: 'Culture',
  photography: 'Photography',
  news: 'News',
};

export default function BlogPostViewer({ post, onBack }) {
  return (
    <div className="p-6 max-w-3xl">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Blog
      </button>

      {post.cover_image_url && (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="w-full h-72 object-cover rounded-2xl mb-6"
        />
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {post.category && (
          <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
        )}
        {post.tags && post.tags.split(',').map(tag => (
          <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
            #{tag.trim()}
          </span>
        ))}
      </div>

      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
        {post.author_name && (
          <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{post.author_name}</span>
        )}
        {post.published_date && (
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(post.published_date)}</span>
        )}
        {post.read_time_minutes && (
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{post.read_time_minutes} min read</span>
        )}
      </div>

      <div className="prose prose-slate max-w-none text-foreground">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
            p: ({ children }) => <p className="mb-4 leading-relaxed text-foreground">{children}</p>,
            ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">{children}</blockquote>
            ),
            hr: () => <hr className="my-6 border-border" />,
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}