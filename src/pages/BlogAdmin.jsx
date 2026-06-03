import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import BlogPostForm from '@/components/blog/BlogPostForm';
import BlogPostViewer from '@/components/blog/BlogPostViewer';

export default function BlogAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewing, setPreviewing] = useState(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blog-posts-admin'],
    queryFn: () => base44.entities.BlogPost.list('-created_date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BlogPost.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-posts-admin'] }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status, published_date }) =>
      base44.entities.BlogPost.update(id, { status, published_date }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-posts-admin'] }),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }) => base44.entities.BlogPost.update(id, { featured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-posts-admin'] }),
  });

  const handleEdit = (post) => { setEditing(post); setShowForm(true); };
  const handleClose = () => { setEditing(null); setShowForm(false); };

  if (previewing) {
    return <BlogPostViewer post={previewing} onBack={() => setPreviewing(null)} />;
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Blog Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{posts.length} article{posts.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Article
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <p className="font-medium">No articles yet</p>
          <p className="text-sm mt-1">Create your first safari blog post</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {posts.map(post => (
            <div key={post.id} className="flex items-center gap-4 p-4 px-5">
              {post.cover_image_url ? (
                <img src={post.cover_image_url} alt={post.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl">📝</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  {post.featured && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${post.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                    {post.status}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{post.category?.replace(/_/g, ' ')}</span>
                  {post.read_time_minutes && <span className="text-xs text-muted-foreground">{post.read_time_minutes} min</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                  title={post.featured ? 'Unfeature' : 'Feature'}
                  onClick={() => toggleFeatured.mutate({ id: post.id, featured: !post.featured })}
                >
                  {post.featured ? <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> : <StarOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                  title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                  onClick={() => toggleStatus.mutate({
                    id: post.id,
                    status: post.status === 'published' ? 'draft' : 'published',
                    published_date: post.status === 'published' ? post.published_date : new Date().toISOString().split('T')[0],
                  })}
                >
                  {post.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                  onClick={() => setPreviewing(post)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleEdit(post)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => { if (confirm('Delete this article?')) deleteMutation.mutate(post.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Article' : 'New Article'}</DialogTitle>
          </DialogHeader>
          <BlogPostForm
            post={editing}
            onSave={() => { qc.invalidateQueries({ queryKey: ['blog-posts-admin'] }); handleClose(); }}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}