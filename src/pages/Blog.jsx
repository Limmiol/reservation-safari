import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Clock, Tag, BookOpen, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/helpers';
import BlogPostViewer from '@/components/blog/BlogPostViewer';

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

const CATEGORY_COLORS = {
  packing_tips: 'bg-blue-50 text-blue-700',
  best_time_to_visit: 'bg-green-50 text-green-700',
  wildlife: 'bg-orange-50 text-orange-700',
  destinations: 'bg-purple-50 text-purple-700',
  travel_tips: 'bg-yellow-50 text-yellow-700',
  health_safety: 'bg-red-50 text-red-700',
  culture: 'bg-pink-50 text-pink-700',
  photography: 'bg-gray-50 text-gray-700',
  news: 'bg-cyan-50 text-cyan-700',
};

export default function Blog() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blog-posts-public'],
    queryFn: () => base44.entities.BlogPost.filter({ status: 'published' }, '-published_date'),
  });

  const filtered = posts.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.excerpt?.toLowerCase().includes(search.toLowerCase()) || p.tags?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featured = filtered.find(p => p.featured);
  const rest = filtered.filter(p => !p.featured || filtered.indexOf(p) !== filtered.indexOf(featured));

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];

  if (selectedPost) {
    return <BlogPostViewer post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Safari Blog</h1>
        <p className="text-muted-foreground">Expert guides, tips, and stories to help you plan the perfect safari</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {cat === 'all' ? 'All Articles' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No articles found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      )}

      {/* Featured Post */}
      {featured && (
        <div
          className="bg-card border border-border rounded-2xl overflow-hidden mb-8 cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => setSelectedPost(featured)}
        >
          {featured.cover_image_url && (
            <img src={featured.cover_image_url} alt={featured.title} className="w-full h-64 object-cover" />
          )}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[featured.category] || 'bg-gray-50 text-gray-700'}`}>
                {CATEGORY_LABELS[featured.category]}
              </span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">⭐ Featured</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{featured.title}</h2>
            <p className="text-muted-foreground mb-4">{featured.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {featured.author_name && <span>By {featured.author_name}</span>}
                {featured.published_date && <span>{formatDate(featured.published_date)}</span>}
                {featured.read_time_minutes && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{featured.read_time_minutes} min read</span>
                )}
              </div>
              <span className="text-sm text-primary font-medium flex items-center gap-1">Read more <ChevronRight className="w-4 h-4" /></span>
            </div>
          </div>
        </div>
      )}

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rest.map(post => (
          <div
            key={post.id}
            className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group flex flex-col"
            onClick={() => setSelectedPost(post)}
          >
            {post.cover_image_url ? (
              <img src={post.cover_image_url} alt={post.title} className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-44 bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-primary/40" />
              </div>
            )}
            <div className="p-4 flex flex-col flex-1">
              <span className={`self-start text-xs px-2.5 py-1 rounded-full font-medium mb-3 ${CATEGORY_COLORS[post.category] || 'bg-gray-50 text-gray-700'}`}>
                {CATEGORY_LABELS[post.category]}
              </span>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors flex-1">{post.title}</h3>
              {post.excerpt && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{post.excerpt}</p>}
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                <span>{post.published_date ? formatDate(post.published_date) : '—'}</span>
                {post.read_time_minutes && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time_minutes} min</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}