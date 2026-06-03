import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Globe, FileText, MapPin, Calendar, DollarSign, Users, FileCheck, Plus, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/helpers';
import ClientDocuments from '@/components/clients/ClientDocuments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ClientDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = window.location.pathname.split('/').pop();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const list = await base44.entities.Client.filter({ id });
      return list[0] ?? null;
    },
    enabled: !!id,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['client-bookings', id],
    queryFn: () => base44.entities.Booking.filter({ client_id: id }, '-created_date'),
    enabled: !!id,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['client-payments', id],
    queryFn: () => base44.entities.Payment.filter({ client_id: id }, '-created_date'),
    enabled: !!id,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['client-documents', id],
    queryFn: () => base44.entities.ClientDocument.filter({ client_id: id }, '-created_date'),
    enabled: !!id,
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['client-feedback', id],
    queryFn: () => base44.entities.Feedback.filter({ client_id: id }, '-created_date'),
    enabled: !!id,
  });

  if (clientLoading) return <div className="p-8"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto mt-20" /></div>;

  if (!client) return <div className="p-8 text-center text-muted-foreground">Client not found</div>;

  const totalSpent = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const activeBookings = bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      {/* Client Header Card */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
            {(client.full_name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{client.full_name}</h1>
            <p className="text-sm text-muted-foreground capitalize mt-1">{client.type || 'individual'} client</p>
            <div className="flex flex-wrap gap-6 mt-4">
              {client.email && <span className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4" />{client.email}</span>}
              {client.phone && <span className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4" />{client.phone}</span>}
              {client.nationality && <span className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4" />{client.nationality}</span>}
              {client.passport_number && <span className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4" />{client.passport_number}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Spent</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalSpent)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary/20" />
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Bookings</p>
              <p className="text-2xl font-bold mt-1">{bookings.length}</p>
            </div>
            <Users className="w-8 h-8 text-primary/20" />
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Completed Trips</p>
              <p className="text-2xl font-bold mt-1">{completedBookings}</p>
            </div>
            <Calendar className="w-8 h-8 text-primary/20" />
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Documents</p>
              <p className="text-2xl font-bold mt-1">{documents.length}</p>
            </div>
            <FileCheck className="w-8 h-8 text-primary/20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {['overview', 'bookings', 'documents', 'feedback', 'notes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-semibold mb-4">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{client.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Phone</p>
                  <p className="font-medium">{client.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Nationality</p>
                  <p className="font-medium">{client.nationality || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Passport Number</p>
                  <p className="font-medium">{client.passport_number || 'N/A'}</p>
                </div>
                {client.address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Bookings Preview */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Recent Bookings</h2>
                <Link to="/bookings" className="text-xs text-primary hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {bookings.slice(0, 3).map((b) => (
                  <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{b.package_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.start_date)} - {formatDate(b.end_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(b.total_amount)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                  </Link>
                ))}
                {bookings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No bookings found</p>}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Activity Summary */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-base font-semibold mb-4">Activity</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Bookings</span>
                  <span className="font-semibold">{activeBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed Trips</span>
                  <span className="font-semibold">{completedBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Documents</span>
                  <span className="font-semibold">{documents.length}</span>
                </div>
                {feedback.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviews</span>
                    <span className="font-semibold">{feedback.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-base font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link to={`/bookings?client=${id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" /> New Booking
                  </Button>
                </Link>
                <Link to={`/messages?client=${id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-card rounded-2xl border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-base font-semibold">All Bookings ({bookings.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {bookings.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No bookings found.</p>}
            {bookings.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between p-4 px-6 hover:bg-accent/50 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium">{b.package_name || 'Package'}</p>
                  <p className="text-xs text-muted-foreground">{b.booking_ref} · {formatDate(b.start_date)} - {formatDate(b.end_date)} · {b.num_guests} guests</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(b.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(b.amount_paid)} paid</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          <ClientDocuments client={client} />
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="bg-card rounded-2xl border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-base font-semibold">Client Reviews ({feedback.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {feedback.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No reviews yet.</p>}
            {feedback.map((f) => (
              <div key={f.id} className="p-6 hover:bg-accent/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">{f.review_title}</p>
                    <p className="text-xs text-muted-foreground">{f.package_name} · {formatDate(f.created_date)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {'⭐'.repeat(f.rating)}<span className="text-xs text-muted-foreground ml-2">({f.rating}/5)</span>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 line-clamp-3">{f.review_text}</p>
                {f.would_recommend && <p className="text-xs text-primary mt-2">✓ Would recommend</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Client Notes</h2>
            {!editingNotes && <Button size="sm" variant="outline" onClick={() => setEditingNotes(true)}>Edit Notes</Button>}
          </div>
          {editingNotes ? (
            <div className="space-y-3">
              <Textarea value={client.notes || ''} placeholder="Add internal notes about this client..." className="min-h-32" readOnly />
              <p className="text-xs text-muted-foreground">Edit notes from the client detail form</p>
              <Button size="sm" onClick={() => setEditingNotes(false)}>Done</Button>
            </div>
          ) : (
            <div className="p-4 bg-accent/10 rounded-lg min-h-32">
              <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes || 'No notes added yet'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}