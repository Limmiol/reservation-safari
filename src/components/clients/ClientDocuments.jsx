import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, Trash2, Plus, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/helpers';

const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'vaccination', label: 'Vaccination Card' },
  { value: 'travel_permit', label: 'Travel Permit' },
  { value: 'other', label: 'Other' },
];

const DOC_ICONS = {
  passport: '🛂',
  visa: '📋',
  insurance: '🛡️',
  vaccination: '💉',
  travel_permit: '📜',
  other: '📄',
};

export default function ClientDocuments({ client }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ document_type: '', document_name: '', expiry_date: '', notes: '' });
  const [file, setFile] = useState(null);

  const { data: docs = [] } = useQuery({
    queryKey: ['client-documents', client.id],
    queryFn: () => base44.entities.ClientDocument.filter({ client_id: client.id }, '-created_date'),
    enabled: !!client.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientDocument.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-documents', client.id] }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !form.document_type || !form.document_name) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ClientDocument.create({
      client_id: client.id,
      client_name: client.full_name,
      file_url,
      ...form,
    });
    qc.invalidateQueries({ queryKey: ['client-documents', client.id] });
    setForm({ document_type: '', document_name: '', expiry_date: '', notes: '' });
    setFile(null);
    setUploading(false);
    setShowForm(false);
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="bg-card rounded-2xl border border-border mt-6">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h2 className="text-base font-semibold">Travel Documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} on file</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No documents uploaded yet</p>
          <p className="text-xs mt-1">Upload passports, visas, insurance forms, and more</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 px-6 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{DOC_ICONS[doc.document_type] || '📄'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.document_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{doc.document_type?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {doc.expiry_date && (
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    isExpired(doc.expiry_date) ? 'bg-red-50 text-red-600' :
                    isExpiringSoon(doc.expiry_date) ? 'bg-amber-50 text-amber-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {(isExpired(doc.expiry_date) || isExpiringSoon(doc.expiry_date)) && (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {isExpired(doc.expiry_date) ? 'Expired' : `Expires ${formatDate(doc.expiry_date)}`}
                  </div>
                )}
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(doc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Travel Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Document Type</label>
              <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Document Name</label>
              <Input
                placeholder="e.g. John's Passport, Schengen Visa..."
                value={form.document_name}
                onChange={(e) => setForm({ ...form, document_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">File</label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('doc-file-input').click()}>
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                {file ? (
                  <p className="text-sm text-foreground font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to select a file (PDF, JPG, PNG)</p>
                )}
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Expiry Date <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 gap-2" disabled={uploading || !file || !form.document_type || !form.document_name}>
                {uploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}