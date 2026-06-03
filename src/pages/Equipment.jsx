import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import { Plus, Trash2, Pencil } from 'lucide-react';

export default function Equipment() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'camping',
    item_code: '',
    quantity_total: '',
    quantity_available: '',
    condition: 'good',
    unit_cost: '',
    location: '',
    is_critical: false,
  });

  const queryClient = useQueryClient();
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list('-updated_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      quantity_total: parseInt(formData.quantity_total),
      quantity_available: parseInt(formData.quantity_available),
      unit_cost: parseFloat(formData.unit_cost),
    };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'camping',
      item_code: '',
      quantity_total: '',
      quantity_available: '',
      condition: 'good',
      unit_cost: '',
      location: '',
      is_critical: false,
    });
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      category: item.category,
      item_code: item.item_code || '',
      quantity_total: item.quantity_total?.toString() || '',
      quantity_available: item.quantity_available?.toString() || '',
      condition: item.condition,
      unit_cost: item.unit_cost?.toString() || '',
      location: item.location || '',
      is_critical: item.is_critical || false,
    });
    setEditingId(item.id);
    setIsOpen(true);
  };

  const filtered = equipment.filter(e =>
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">{t('equipment')}</h1>
          <p className="text-muted-foreground mt-1">{t('manage_inventory')}</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              {t('add_equipment')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? t('edit') : t('add')} {t('equipment')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Equipment Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="col-span-2"
                />
                <Input
                  placeholder="Item Code/SKU"
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                />
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camping">Camping</SelectItem>
                    <SelectItem value="camera">Camera</SelectItem>
                    <SelectItem value="binoculars">Binoculars</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="tools">Tools</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Total Qty"
                  value={formData.quantity_total}
                  onChange={(e) => setFormData({ ...formData, quantity_total: e.target.value })}
                  required
                />
                <Input
                  type="number"
                  placeholder="Available Qty"
                  value={formData.quantity_available}
                  onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Unit Cost"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                />
                <Input
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
                <Select value={formData.condition} onValueChange={(val) => setFormData({ ...formData, condition: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} size="sm">{t('cancel')}</Button>
                <Button type="submit" size="sm">{editingId ? t('update') : t('create')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-accent">
              <tr>
                <th className="text-left p-4 font-medium">{t('name')}</th>
                <th className="text-left p-4 font-medium">{t('serial_number')}</th>
                <th className="text-left p-4 font-medium">{t('category')}</th>
                <th className="text-left p-4 font-medium">{t('quantity')}</th>
                <th className="text-left p-4 font-medium">{t('available')}</th>
                <th className="text-left p-4 font-medium">{t('condition')}</th>
                <th className="text-left p-4 font-medium">{t('address')}</th>
                <th className="text-right p-4 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-xs">{item.item_code || '-'}</td>
                  <td className="p-4 text-sm capitalize">{item.category}</td>
                  <td className="p-4">{item.quantity_total}</td>
                  <td className="p-4">{item.quantity_available}</td>
                  <td className="p-4"><StatusBadge status={item.condition} /></td>
                  <td className="p-4 text-xs">{item.location || '-'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-primary hover:text-primary/80 mr-4 inline-block"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="text-destructive hover:text-destructive/80 inline-block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">{t('no_equipment')}</div>
        )}
      </div>
    </div>
  );
}