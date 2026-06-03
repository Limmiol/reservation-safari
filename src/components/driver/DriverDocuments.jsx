import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate } from '@/lib/helpers';
import { FileText, Upload, Download, Eye, Trash2, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function DriverDocuments({ driverId }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_type: '',
    title: '',
    expiry_date: '',
    file: null,
  });

  const queryClient = useQueryClient();

  // Mock documents data - in real app this would come from API
  const { data: documents = [
    {
      id: 1,
      driver_id: driverId,
      document_type: 'license',
      title: 'Driving License',
      file_name: 'license.pdf',
      expiry_date: '2025-12-31',
      status: 'active',
      uploaded_date: '2024-01-15',
    },
    {
      id: 2,
      driver_id: driverId,
      document_type: 'insurance',
      title: 'Vehicle Insurance',
      file_name: 'insurance.pdf',
      expiry_date: '2024-08-15',
      status: 'expiring_soon',
      uploaded_date: '2024-02-01',
    },
    {
      id: 3,
      driver_id: driverId,
      document_type: 'certification',
      title: 'Tour Guide Certification',
      file_name: 'certification.pdf',
      expiry_date: '2026-03-20',
      status: 'active',
      uploaded_date: '2024-03-10',
    },
  ] } = useQuery({
    queryKey: ['driver-documents', driverId],
    queryFn: () => [], // Replace with actual API call
  });

  const uploadMutation = useMutation({
    mutationFn: (data) => {
      // Mock upload - replace with actual API call
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] });
      setIsUploadOpen(false);
      setUploadForm({ document_type: '', title: '', expiry_date: '', file: null });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      // Mock delete - replace with actual API call
      return new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] });
    },
  });

  const handleUpload = (e) => {
    e.preventDefault();
    uploadMutation.mutate(uploadForm);
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'license': return '🚗';
      case 'insurance': return '🛡️';
      case 'certification': return '🏆';
      case 'medical': return '🏥';
      case 'id': return '🆔';
      default: return '📄';
    }
  };

  const getStatusBadge = (status, expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (status === 'expired' || daysUntilExpiry < 0) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Expires Soon</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Active</Badge>;
    }
  };

  const expiringSoonCount = documents.filter(doc => {
    const expiry = new Date(doc.expiry_date);
    const daysUntilExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;

  const expiredCount = documents.filter(doc => {
    const expiry = new Date(doc.expiry_date);
    return expiry < new Date();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Driver Documents</h3>
          <p className="text-sm text-muted-foreground">Manage licenses, certifications, and other important documents</p>
        </div>
        <div className="flex items-center gap-4">
          {expiringSoonCount > 0 && (
            <div className="flex items-center gap-2 text-orange-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {expiringSoonCount} expiring soon
            </div>
          )}
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {expiredCount} expired
            </div>
          )}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Driver Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Document Type</label>
                    <Select
                      value={uploadForm.document_type}
                      onValueChange={(val) => setUploadForm({...uploadForm, document_type: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="license">Driving License</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="certification">Certification</SelectItem>
                        <SelectItem value="medical">Medical Record</SelectItem>
                        <SelectItem value="id">ID Document</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Title</label>
                    <Input
                      placeholder="Document title"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Expiry Date</label>
                    <Input
                      type="date"
                      value={uploadForm.expiry_date}
                      onChange={(e) => setUploadForm({...uploadForm, expiry_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">File</label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploadMutation.isPending} className="flex-1">
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getDocumentIcon(doc.document_type)}</div>
                  <div>
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                  </div>
                </div>
                {getStatusBadge(doc.status, doc.expiry_date)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded:</span>
                  <span>{formatDate(doc.uploaded_date)}</span>
                </div>
                {doc.expiry_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className={
                      new Date(doc.expiry_date) < new Date() ? 'text-red-600 font-medium' :
                      new Date(doc.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-600 font-medium' :
                      ''
                    }>
                      {formatDate(doc.expiry_date)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(doc.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents uploaded</h3>
          <p className="text-muted-foreground mb-4">Upload important driver documents like licenses and certifications</p>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Upload First Document
          </Button>
        </div>
      )}
    </div>
  );
}