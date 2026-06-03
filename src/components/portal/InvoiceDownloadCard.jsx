import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/lib/helpers';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf/dist/jspdf.umd.min.js';

export default function InvoiceDownloadCard({ bookingId }) {
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ['portal-invoices', bookingId],
    queryFn: () => base44.entities.Invoice.filter({ booking_id: bookingId }),
    enabled: !!bookingId,
  });

  const handleDownloadInvoice = (invoice) => {
    setDownloadingId(invoice.id);
    
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(24);
      doc.text('INVOICE', 20, 20);
      
      // Invoice details
      doc.setFontSize(10);
      doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 35);
      doc.text(`Date: ${formatDate(invoice.created_date)}`, 20, 42);
      doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 20, 49);
      
      // Client info
      doc.setFontSize(11);
      doc.text('Bill To:', 20, 65);
      doc.setFontSize(10);
      doc.text(invoice.client_name, 20, 72);
      doc.text(invoice.client_email, 20, 79);
      
      // Line items
      let yPos = 95;
      doc.setFont(undefined, 'bold');
      doc.text('Description', 20, yPos);
      doc.text('Qty', 120, yPos);
      doc.text('Unit Price', 140, yPos);
      doc.text('Total', 170, yPos);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      yPos += 8;
      
      if (invoice.items) {
        try {
          const items = JSON.parse(invoice.items);
          items.forEach((item) => {
            doc.text(item.description.substring(0, 40), 20, yPos);
            doc.text(String(item.qty), 120, yPos);
            doc.text(formatCurrency(item.unit_price), 140, yPos);
            doc.text(formatCurrency(item.total), 170, yPos);
            yPos += 6;
          });
        } catch { }
      }
      
      // Totals
      yPos += 5;
      doc.setFont(undefined, 'bold');
      doc.text(`Subtotal: ${formatCurrency(invoice.subtotal || 0)}`, 140, yPos);
      yPos += 7;
      
      if (invoice.discount > 0) {
        doc.text(`Discount: -${formatCurrency(invoice.discount)}`, 140, yPos);
        yPos += 7;
      }
      
      if (invoice.tax > 0) {
        doc.text(`Tax: ${formatCurrency(invoice.tax)}`, 140, yPos);
        yPos += 7;
      }
      
      doc.setFontSize(12);
      doc.text(`Total: ${formatCurrency(invoice.total)}`, 140, yPos);
      yPos += 8;
      
      if (invoice.amount_paid > 0) {
        doc.setFontSize(10);
        doc.text(`Paid: ${formatCurrency(invoice.amount_paid)}`, 140, yPos);
        yPos += 7;
      }
      
      const balance = (invoice.total || 0) - (invoice.amount_paid || 0);
      if (balance > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Balance Due: ${formatCurrency(balance)}`, 140, yPos);
        doc.setTextColor(0, 0, 0);
      }
      
      // Notes
      if (invoice.notes) {
        yPos = 250;
        doc.setFontSize(9);
        doc.text('Notes:', 20, yPos);
        doc.text(invoice.notes, 20, yPos + 5, { maxWidth: 170 });
      }
      
      doc.save(`Invoice-${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Invoices</h2>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices available yet.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-4 bg-secondary/40 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-semibold">{invoice.invoice_number}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">{formatDate(invoice.created_date)}</p>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
              <div className="text-right mr-4">
                <p className="text-sm font-semibold">{formatCurrency(invoice.total)}</p>
                {(invoice.total - (invoice.amount_paid || 0)) > 0 && (
                  <p className="text-xs text-red-500">Balance: {formatCurrency(invoice.total - (invoice.amount_paid || 0))}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownloadInvoice(invoice)}
                disabled={downloadingId === invoice.id}
              >
                {downloadingId === invoice.id ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}