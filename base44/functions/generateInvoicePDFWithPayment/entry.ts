import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import jsPDF from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    // Fetch invoice
    const invoice = await base44.asServiceRole.entities.Invoice.read(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Parse items
    const items = JSON.parse(invoice.items || '[]');

    // Create PDF
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.text('INVOICE', 20, yPos);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 150, yPos);
    yPos += 10;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, yPos);
    yPos += 5;
    doc.text(`Due: ${invoice.due_date}`, 150, yPos);

    // Client Details
    yPos += 15;
    doc.setFontSize(12);
    doc.text('Bill To:', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.text(invoice.client_name, 20, yPos);
    yPos += 5;
    doc.text(invoice.client_email, 20, yPos);

    // Items Table
    yPos += 10;
    doc.setFillColor(220, 53, 69);
    doc.setTextColor(255, 255, 255);
    doc.rect(20, yPos - 5, 170, 7, 'F');
    doc.text('Description', 25, yPos);
    doc.text('Qty', 130, yPos);
    doc.text('Unit Price', 150, yPos);
    doc.text('Amount', 175, yPos);
    
    doc.setTextColor(0, 0, 0);
    yPos += 7;
    items.forEach(item => {
      doc.text(item.description.substring(0, 40), 25, yPos);
      doc.text(String(item.quantity), 130, yPos);
      doc.text(`$${item.unit_price.toFixed(2)}`, 150, yPos);
      doc.text(`$${item.amount.toFixed(2)}`, 175, yPos);
      yPos += 7;
    });

    yPos += 8;

    // Totals
    doc.setFontSize(10);
    doc.text('Subtotal:', 150, yPos);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 180, yPos);

    yPos += 7;
    doc.text('Tax (16%):', 150, yPos);
    doc.text(`$${invoice.tax.toFixed(2)}`, 180, yPos);

    if (invoice.discount > 0) {
      yPos += 7;
      doc.text('Discount:', 150, yPos);
      doc.text(`-$${invoice.discount.toFixed(2)}`, 180, yPos);
    }

    yPos += 10;
    doc.setFontSize(12);
    doc.text('Total:', 150, yPos);
    doc.text(`$${invoice.total.toFixed(2)}`, 180, yPos);

    // Amount Paid
    yPos += 7;
    doc.setFontSize(10);
    doc.text('Amount Paid:', 150, yPos);
    doc.text(`$${(invoice.amount_paid || 0).toFixed(2)}`, 180, yPos);

    // Balance
    const balance = invoice.total - (invoice.amount_paid || 0);
    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(220, 53, 69);
    doc.text('Balance Due:', 150, yPos);
    doc.text(`$${balance.toFixed(2)}`, 180, yPos);
    doc.setTextColor(0, 0, 0);

    // Payment Link Section
    if (balance > 0) {
      yPos += 20;
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos - 5, 170, 25, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(220, 53, 69);
      doc.text('PAYMENT INSTRUCTIONS', 25, yPos);
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Click the link below to pay securely via our payment gateway:', 25, yPos);
      
      yPos += 6;
      doc.setTextColor(0, 100, 200);
      doc.textWithLink('Click here to pay now →', 25, yPos, { pageNumber: 1, y: yPos });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 15, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Invoice-${invoice.invoice_number}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});