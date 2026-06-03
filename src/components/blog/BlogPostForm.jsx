import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'packing_tips', label: 'Packing Tips' },
  { value: 'best_time_to_visit', label: 'Best Time to Visit' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'destinations', label: 'Destinations' },
  { value: 'travel_tips', label: 'Travel Tips' },
  { value: 'health_safety', label: 'Health & Safety' },
  { value: 'culture', label: 'Culture' },
  { value: 'photography', label: 'Photography' },
  { value: 'news', label: 'News' },
];

const defaultForm = {
  title: '', category: '', excerpt: '', content: '',
  cover_image_url: '', author_name: '', tags: '',
  read_time_minutes: '', status: 'draft', published_date: '', featured: false,
};

export default function BlogPostForm({ post, onSave, onCancel }) {
  const [form, setForm] = useState(post ? { ...defaultForm, ...post } : defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('cover_image_url', file_url);
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      read_time_minutes: form.read_time_minutes ? Number(form.read_time_minutes) : undefined,
      featured: !!form.featured,
    };
    if (post?.id) {
      await base44.entities.BlogPost.update(post.id, data);
    } else {
      await base44.entities.BlogPost.create(data);
    }
    setSaving(false);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Title *</label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Article title" required />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Category *</label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Author Name</label>
          <Input value={form.author_name} onChange={e => set('author_name', e.target.value)} placeholder="e.g. Safari Team" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Read Time (minutes)</label>
          <Input type="number" min="1" value={form.read_time_minutes} onChange={e => set('read_time_minutes', e.target.value)} placeholder="5" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Published Date</label>
          <Input type="date" value={form.published_date} onChange={e => set('published_date', e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
          <Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. serengeti, big five, packing" />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Cover Image</label>
          <div className="flex items-center gap-3">
            {form.cover_image_url && (
              <img src={form.cover_image_url} alt="Cover" className="w-20 h-14 object-cover rounded-lg border border-border" />
            )}
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors">
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            {form.cover_image_url && (
              <Input
                value={form.cover_image_url}
                onChange={e => set('cover_image_url', e.target.value)}
                placeholder="Or paste image URL"
                className="flex-1"
              />
            )}
          </div>
          {!form.cover_image_url && (
            <Input
              className="mt-2"
              value={form.cover_image_url}
              onChange={e => set('cover_image_url', e.target.value)}
              placeholder="Or paste image URL directly"
            />
          )}
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Excerpt</label>
          <textarea
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={2}
            value={form.excerpt}
            onChange={e => set('excerpt', e.target.value)}
            placeholder="Short summary shown in the blog listing..."
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Content * <span className="text-muted-foreground font-normal">(Markdown supported)</span></label>
          <textarea
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
            rows={16}
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder={`# What to Pack for a Safari\n\nStart writing your article here...\n\n## Clothing\n- Light, neutral-colored clothes\n- Warm layer for early mornings\n\n## Essentials\n- Sunscreen (SPF 50+)\n- Binoculars\n- Camera with extra batteries`}
            required
          />
        </div>

        <div className="col-span-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={!!form.featured}
              onChange={e => set('featured', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="featured" className="text-sm">Feature this article</label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : post ? 'Update Article' : 'Create Article'}
        </Button>
      </div>
    </form>
  );
}