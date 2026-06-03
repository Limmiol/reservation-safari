import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Mail, Phone, Globe, Building2, User as UserIcon, Briefcase, Star } from 'lucide-react';
import { celebrate } from '@/lib/confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { cn } from '@/lib/utils';

const TYPE_ICONS = {
  individual:   UserIcon,
  group:        Users,
  corporate:    Building2,
  travel_agent: Briefcase,
};

const TYPE_COLORS = {
  individual:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  group:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  corporate:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  travel_agent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function Clients() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formData, setFormData] = useState({});
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date', 100);
      return user?.role === 'admin' ? allClients : allClients.filter(c => c.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings_for_clients'],
    queryFn: () => base44.entities.Booking.list('-created_date', 500),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      celebrate();
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setFormData({});
    },
  });

  // Build booking count map
  const bookingCountByClient = bookings.reduce((acc, b) => {
    if (b.client_id) acc[b.client_id] = (acc[b.client_id] || 0) + 1;
    return acc;
  }, {});

  // Stats
  const typeCounts = clients.reduce((acc, c) => {
    const type = c.type || 'individual';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const TYPE_TABS = [
    { value: 'all', label: 'All', count: clients.length },
    { value: 'individual', label: 'Individual', count: typeCounts.individual || 0 },
    { value: 'group', label: 'Group', count: typeCounts.group || 0 },
    { value: 'corporate', label: 'Corporate', count: typeCounts.corporate || 0 },
    { value: 'travel_agent', label: 'Travel Agent', count: typeCounts.travel_agent || 0 },
  ].filter(tab => tab.value === 'all' || tab.count > 0);

  const filtered = clients.filter(c => {
    const matchType = typeFilter === 'all' || (c.type || 'individual') === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.nationality || '').toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <PageHeader title={t('clients')} description={t('manage_safari_clients')}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('search_clients')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> {t('new_client_btn')}
        </Button>
      </PageHeader>

      {/* Summary stats */}
      {clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Clients', value: clients.length, icon: Users, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
            { label: 'Individuals', value: typeCounts.individual || 0, icon: UserIcon, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
            { label: 'Corporate', value: typeCounts.corporate || 0, icon: Building2, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
            { label: 'Travel Agents', value: typeCounts.travel_agent || 0, icon: Briefcase, color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.color)}>
                <stat.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold leading-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Type filter tabs */}
      {clients.length > 0 && (
        <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit flex-wrap">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                typeFilter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span className={cn(
                "ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full",
                typeFilter === tab.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        clients.length === 0
          ? <EmptyState icon={Users} title={t('no_clients_yet')} description={t('add_first_client_booking')} actionLabel={t('new_client_btn')} onAction={() => setShowForm(true)} />
          : <EmptyState icon={Search} title="No matching clients" description="Try adjusting your search or filter." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const TypeIcon = TYPE_ICONS[client.type] || UserIcon;
            const bCount = bookingCountByClient[client.id] || 0;
            const avatarColor = getAvatarColor(client.full_name);
            return (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0", avatarColor)}>
                      {(client.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{client.full_name}</p>
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5", TYPE_COLORS[client.type] || TYPE_COLORS.individual)}>
                        <TypeIcon className="w-2.5 h-2.5" />
                        {(client.type || 'individual').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {bCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-full flex-shrink-0">
                      <Star className="w-3 h-3" />
                      {bCount} booking{bCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1.5">
                  {client.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.nationality && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{client.nationality}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-1 border-t border-border pt-3 italic">
                    {client.notes}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('create_client')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('full_name')} *</Label>
              <Input required value={formData.full_name || ''} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('email')} *</Label>
              <Input type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('phone')}</Label>
                <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('type')}</Label>
                <Select value={formData.type || 'individual'} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t('individual')}</SelectItem>
                    <SelectItem value="group">{t('group')}</SelectItem>
                    <SelectItem value="corporate">{t('corporate')}</SelectItem>
                    <SelectItem value="travel_agent">{t('travel_agent_type')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('nationality')}</Label>
                <Input value={formData.nationality || ''} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('passport_number')}</Label>
                <Input value={formData.passport_number || ''} onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select value={formData.language || 'en'} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Kiswahili</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Emails and SMS will be sent in this language.</p>
            </div>
            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Input value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('creating') : t('create_client')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
