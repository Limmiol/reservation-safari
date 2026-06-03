import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentUpload({ driverName, driverId }) {
  const [docType, setDocType] = useState('fuel_receipt');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['driver-documents', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const messages = await base44.entities.Message.filter({
        client_id: driverId,
      });
      return messages.filter(m => m.subject?.includes('Document Upload'));
    },
    enabled: !!driverId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Upload file
      const uploadedFile = await base44.integrations.Core.UploadFile({
        file: file,
      });

      // Store document record
      return base44.entities.Message.create({
        conversation_id: `driver-${driverId}-documents`,
        booking_id: '',
        client_id: driverId,
        client_name: driverName,
        client_email: '',
        sender_type: 'admin',
        sender_name: driverName,
        sender_email: '',
        subject: `Document Upload - ${getDocTypeLabel(docType)}`,
        body: `Document Type: ${getDocTypeLabel(docType)}\nFile: ${file.name}\nURL: ${uploadedFile.file_url}`,
        is_read: false,
        status: 'open',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents'] });
      setSelectedFile(null);
      setUploading(false);
      toast.success('Document uploaded successfully');
    },
    onError: (error) => {
      setUploading(false);
      toast.error('Failed to upload document');
    },
  });

  const getDocTypeLabel = (type) => {
    const labels = {
      fuel_receipt: 'Fuel Receipt',
      inspection_checklist: 'Inspection Checklist',
      maintenance_log: 'Maintenance Log',
      incident_report: 'Incident Report',
    };
    return labels[type] || type;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    setUploading(true);
    uploadMutation.mutate(selectedFile);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Upload fuel receipts, inspection checklists, and other trip documents
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Document Type</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel_receipt">Fuel Receipt</SelectItem>
                <SelectItem value="inspection_checklist">Inspection Checklist</SelectItem>
                <SelectItem value="maintenance_log">Maintenance Log</SelectItem>
                <SelectItem value="incident_report">Incident Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-6">
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <label htmlFor="file-input" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:underline">
                    Click to upload
                  </span>
                  <span className="text-sm text-muted-foreground"> or drag and drop</span>
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
              <p className="text-xs text-muted-foreground">PDF, images, or documents (max 5MB)</p>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-accent/30 rounded">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-destructive hover:text-destructive/80"
                disabled={uploading}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Uploaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-accent/30 rounded">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={doc.body.split('URL: ')[1]?.split('\n')[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}