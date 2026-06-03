import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';
import 'npm:jspdf-autotable@3.5.31';

const BRAND_COLOR = [46, 158, 79];
const LOGO_URL = 'https://media.base44.com/images/public/69c43e66e5136fec0c861d0c/e2dd8978d_OEX.png';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id } = await req.json();
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    if (!invoices.length) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const invoice = invoices[0];
    const items = invoice.items ? JSON.parse(invoice.items) : [];

    const doc = new jsPDF();
    const margin = 10;
    let y = margin;

    // Logo & Header
    try {
      doc.addImage(LOGO_URL, 'PNG', margin, y, 15, 12);
    } catch (e) {}
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text('INVOICE', margin + 18, y + 7);
    doc.setTextColor(0, 0, 0);
    y += 16;

    // Invoice info
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Invoice #: ${invoice.invoice_number} | Date: ${new Date().toLocaleDateString()} | Due: ${invoice.due_date}`, margin, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.text('CLIENT:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${invoice.client_name} | ${invoice.client_email}`, margin + 15, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.text('BOOKING:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${invoice.booking_ref}`, margin + 15, y);
    y += 7;

    // Items table
    const tableBody = items.map(item => [
      item.description || '',
      String(item.qty || 1),
      `${(item.unit_price || 0).toFixed(2)}`,
      `${(item.total || 0).toFixed(2)}`
    ]);

    doc.autoTable({
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      startY: y,
      margin: margin,
      headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    y = doc.lastAutoTable.finalY + 4;

    // Summary
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Subtotal: ${(invoice.subtotal || 0).toFixed(2)}`, margin, y);
    if (invoice.discount) doc.text(`Discount: -${invoice.discount.toFixed(2)}`, 80, y);
    if (invoice.tax) doc.text(`Tax: +${invoice.tax.toFixed(2)}`, 140, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL: ${(invoice.total || 0).toFixed(2)}`, margin, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Paid: ${(invoice.amount_paid || 0).toFixed(2)}`, margin, y);
    y += 4;

    doc.setFont(undefined, 'bold');
    doc.text(`Due: ${((invoice.total || 0) - (invoice.amount_paid || 0)).toFixed(2)}`, margin, y);

    if (invoice.notes) {
      y += 10;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text('NOTES:', margin, y);
      doc.setFont(undefined, 'normal');
      const noteLines = doc.splitTextToSize(invoice.notes, 180);
      doc.text(noteLines, margin, y + 4);
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});