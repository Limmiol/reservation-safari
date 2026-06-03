import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRole } from '@/lib/useRole';
import { celebrate } from '@/lib/confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Package, Upload, X, Eye, Heart, Star, FileDown, ListChecks } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import PackageItineraryEditor from '@/components/PackageItineraryEditor';
import PackageDetailDialog from '@/components/PackageDetailDialog';
import CurrencySelect from '@/components/ui/CurrencySelect';
import { exportPackagePdf } from '@/lib/packagePdfExport';
import { getSiteConfig } from '@/lib/siteConfig';
import { toast } from 'sonner';
import PackingListDialog from '@/components/PackingListDialog';

const EMPTY_FORM = {
  name: '',
  description: '',
  destination: '',
  duration_days: '',
  price_per_person: '',
  currency: 'USD',
  max_guests: '',
  includes: '',
  excludes: '',
  category: 'mid_range',
  status: 'active',
  image_url: '',
  itinerary_days: '',
};

export default function Packages() {
  const queryClient = useQueryClient();
  const { isAdmin, isAgent } = useRole();
  const readOnly = isAgent; // agents can view but not edit
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.Package.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Package.create(data),
    onSuccess: () => { celebrate('side'); queryClient.invalidateQueries({ queryKey: ['packages'] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Package.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['packages'] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Package.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };

  // Coerce every field to a controlled value so the form never renders a
  // surprise empty input when the DB record has a value stored in a
  // different shape (e.g. itinerary_days as array vs string, numbers as null).
  const openEdit = (pkg) => {
    setEditing(pkg);
    setForm({
      ...EMPTY_FORM,
      ...pkg,
      name:             pkg.name            ?? '',
      description:      pkg.description     ?? '',
      destination:      pkg.destination     ?? '',
      duration_days:    pkg.duration_days   ?? '',
      price_per_person: pkg.price_per_person ?? '',
      currency:         pkg.currency        || 'USD',
      max_guests:       pkg.max_guests      ?? '',
      includes:         pkg.includes        ?? '',
      excludes:         pkg.excludes        ?? '',
      category:         pkg.category        || 'mid_range',
      status:           pkg.status          || 'active',
      image_url:        pkg.image_url       ?? '',
      itinerary_days:   typeof pkg.itinerary_days === 'string'
                          ? pkg.itinerary_days
                          : Array.isArray(pkg.itinerary_days)
                            ? JSON.stringify(pkg.itinerary_days)
                            : '',
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const NUMERIC = ['duration_days', 'price_per_person', 'max_guests'];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editing) {
      // Patch-style update: only send fields the user actually changed.
      // Server does a shallow merge, so omitted keys keep their DB values —
      // this preserves untouched data even if a form input rendered empty.
      const patch = {};
      for (const key of Object.keys(EMPTY_FORM)) {
        const before = editing[key];
        let after = form[key];
        if (NUMERIC.includes(key)) {
          after = (after === '' || after == null) ? undefined : Number(after);
          if (Number.isNaN(after)) continue;
        }
        if (after === undefined) continue;
        // Treat empty-string ≡ null/undefined on the server side
        const normalizedBefore = before == null ? '' : before;
        if (after === normalizedBefore) continue;
        patch[key] = after;
      }
      if (Object.keys(patch).length === 0) { closeForm(); return; }
      updateMutation.mutate({ id: editing.id, data: patch });
    } else {
      const data = {
        ...form,
        duration_days:    form.duration_days ? Number(form.duration_days) : undefined,
        price_per_person: form.price_per_person ? Number(form.price_per_person) : undefined,
        max_guests:       form.max_guests ? Number(form.max_guests) : undefined,
      };
      createMutation.mutate(data);
    }
  };

  const filtered = packages.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const [viewing, setViewing] = useState(null);
  const [packingFor, setPackingFor] = useState(null);
  const [uploading, setUploading] = useState(false);
  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    field('image_url', file_url);
    setUploading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Packages" description={readOnly ? 'Browse available safari packages' : 'Manage your safari packages'}>
        {!readOnly && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Package</Button>}
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search packages..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No packages found" description={readOnly ? 'No packages available.' : 'Create your first safari package to get started.'} action={readOnly ? undefined : { label: 'Add Package', onClick: openCreate }} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(pkg => (
            <div key={pkg.id} className="group cursor-pointer">
              {/* Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-3">
                {pkg.image_url ? (
                  <img
                    src={pkg.image_url}
                    alt={pkg.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200">
                    <Package className="w-12 h-12 text-orange-400" />
                  </div>
                )}

                {/* Heart button */}
                <button
                  className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors drop-shadow"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Heart className="w-5 h-5 drop-shadow-md" />
                </button>

                {/* Category pill */}
                {pkg.category && (
                  <div className="absolute top-3 left-3">
                    <span className="text-xs font-semibold bg-white text-gray-800 px-2.5 py-1 rounded-full shadow-sm capitalize">
                      {pkg.category.replace('_', ' ')}
                    </span>
                  </div>
                )}

                {/* Status badge for non-active */}
                {pkg.status !== 'active' && (
                  <div className="absolute bottom-3 left-3">
                    <StatusBadge status={pkg.status} />
                  </div>
                )}

                {/* Action buttons — appear on hover */}
                <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        exportPackagePdf(pkg, { siteConfig: getSiteConfig() });
                        toast.success('Brochure generated');
                      } catch (err) {
                        toast.error('Export failed: ' + (err?.message || 'unknown error'));
                      }
                    }}
                    title="Download PDF brochure"
                    className="bg-white rounded-full p-1.5 shadow-md hover:bg-amber-50 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPackingFor(pkg); }}
                    title="Smart packing list"
                    className="bg-white rounded-full p-1.5 shadow-md hover:bg-emerald-50 transition-colors"
                  >
                    <ListChecks className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                  {!readOnly && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(pkg); }}
                        title="Edit package"
                        className="bg-white rounded-full p-1.5 shadow-md hover:bg-gray-50 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(pkg.id); }}
                        title="Delete package"
                        className="bg-white rounded-full p-1.5 shadow-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Info */}
              <div onClick={() => setViewing(pkg)} className="px-0.5 space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[#222] text-sm leading-snug line-clamp-1 dark:text-foreground">{pkg.name}</h3>
                  <div className="flex items-center gap-0.5 shrink-0 text-xs font-medium text-[#222] dark:text-foreground">
                    <Star className="w-3 h-3 fill-current" />
                    <span>New</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-1">{pkg.destination}</p>
                <p className="text-sm text-gray-500">{pkg.duration_days} days</p>
                <p className="text-sm text-[#222] pt-0.5 dark:text-foreground">
                  <span className="font-semibold">{pkg.currency || '$'}{pkg.price_per_person?.toLocaleString()}</span>
                  <span className="text-gray-500 font-normal"> / person</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <PackageDetailDialog pkg={viewing} onClose={() => setViewing(null)} />
      <PackingListDialog pkg={packingFor} open={!!packingFor} onClose={() => setPackingFor(null)} />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Package' : 'New Package'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Name *</label>
                <Input value={form.name} onChange={e => field('name', e.target.value)} required />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={form.description} onChange={e => field('description', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Destination *</label>
                <Input value={form.destination} onChange={e => field('destination', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (days) *</label>
                <Input type="number" value={form.duration_days} onChange={e => field('duration_days', e.target.value)} required min={1} />
              </div>
              <div>
                <label className="text-sm font-medium">Price per Person *</label>
                <Input type="number" value={form.price_per_person} onChange={e => field('price_per_person', e.target.value)} required min={0} />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <CurrencySelect value={form.currency || 'USD'} onValueChange={v => field('currency', v)} />
              </div>
              <div>
                <label className="text-sm font-medium">Max Guests</label>
                <Input type="number" value={form.max_guests} onChange={e => field('max_guests', e.target.value)} min={1} />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={v => field('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="mid_range">Mid Range</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={v => field('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Package Image</label>
                <div className="mt-1 space-y-2">
                  {form.image_url && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                      <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => field('image_url', '')} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-border rounded-lg py-3 cursor-pointer hover:border-primary transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Includes (comma separated)</label>
                <Input value={form.includes} onChange={e => field('includes', e.target.value)} placeholder="Accommodation, Meals, Game drives..." />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Excludes (comma separated)</label>
                <Input value={form.excludes} onChange={e => field('excludes', e.target.value)} placeholder="Flights, Visa fees..." />
              </div>
            </div>

            {form.duration_days > 0 && (
              <div>
                <label className="text-sm font-medium">Itinerary</label>
                <PackageItineraryEditor
                  durationDays={Number(form.duration_days)}
                  value={form.itinerary_days}
                  onChange={v => field('itinerary_days', v)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Save Changes' : 'Create Package'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}