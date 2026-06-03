import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Phone, Mail, MapPin, Edit2, Trash2, Star } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

export default function Agents() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', specialization: '', status: 'active' });
  const queryClient = useQueryClient();

  // Fetch agents (safari guides/staff)
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      // For now, return empty - user can create agents through the form
      return [];
    },
  });

  const handleSubmit = () => {
    if (formData.name && formData.email) {
      // Would create/update agent in DB
      setFormData({ name: '', email: '', phone: '', specialization: '', status: 'active' });
      setEditingAgent(null);
      setIsOpen(false);
    }
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setFormData(agent);
    setIsOpen(true);
  };

  const handleDelete = (agentId) => {
    // Would delete agent from DB
    queryClient.invalidateQueries({ queryKey: ['agents'] });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t('safari_guides')}</h1>
            <p className="text-muted-foreground mt-1">{t('manage_guides')}</p>
          </div>
          <Button onClick={() => { setEditingAgent(null); setFormData({ name: '', email: '', phone: '', specialization: '', status: 'active' }); setIsOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> {t('add_guide')}
          </Button>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
          </div>
        ) : agents.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('no_guides_yet')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map(agent => (
              <Card key={agent.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.specialization}</p>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {agent.email}
                  </div>
                  {agent.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {agent.phone}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => handleEdit(agent)}>
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(agent.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Guide Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAgent ? t('edit_guide') : t('add_safari_guide')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('full_name')}</label>
                <Input
                  placeholder="e.g., James Kipchoge"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('email')}</label>
                <Input
                  type="email"
                  placeholder="guide@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('phone')}</label>
                <Input
                  placeholder="+254 7xx xxx xxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('specialization')}</label>
                <Input
                  placeholder="e.g., Wildlife Photography, Bird Watching"
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                {editingAgent ? t('update_guide') : t('add_guide')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}