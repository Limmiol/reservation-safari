import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { Search, History as HistoryIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatDate } from '@/lib/helpers';

export default function History() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: bookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 500),
  });

  const filtered = bookings.filter(b => {
    const matchSearch = (b.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.booking_ref || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.package_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title={t('booking_history')} description={t('history_description')}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('search_bookings')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_status')}</SelectItem>
            <SelectItem value="inquiry">{t('inquiry')}</SelectItem>
            <SelectItem value="quoted">{t('quoted')}</SelectItem>
            <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
            <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
            <SelectItem value="completed">{t('completed')}</SelectItem>
            <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState icon={HistoryIcon} title={t('no_bookings_history')} description="Adjust your search or filters." />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => window.location.href = `/bookings/${b.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                    {(b.client_name || '?')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{b.client_name}</p>
                      <span className="text-xs text-muted-foreground font-mono">{b.booking_ref}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.package_name} · {formatDate(b.start_date)} — {formatDate(b.end_date)} · {b.num_guests} guest{b.num_guests > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(b.total_amount)}</p>
                    {b.amount_paid > 0 && <p className="text-xs text-green-600">Paid: {formatCurrency(b.amount_paid)}</p>}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}