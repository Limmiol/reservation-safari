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

    const { quote_id } = await req.json();
    const quotes = await base44.asServiceRole.entities.Quote.filter({ id: quote_id });
    if (!quotes.length) return Response.json({ error: 'Quote not found' }, { status: 404 });

    const quote = quotes[0];
    const items = quote.items ? JSON.parse(quote.items) : [];
    
    // Fetch booking to get dates and package data
    let startDate = '';
    let endDate = '';
    let inclusions = quote.inclusions || '';
    let exclusions = quote.exclusions || '';
    let itineraryDays = [];
    
    try {
      const bookings = await base44.asServiceRole.entities.Booking.filter({ id: quote.booking_id });
      if (bookings.length > 0) {
        startDate = bookings[0].start_date || '';
        endDate = bookings[0].end_date || '';
        
        if (bookings[0].package_id) {
          const packages = await base44.asServiceRole.entities.Package.filter({ id: bookings[0].package_id });
          if (packages.length > 0) {
            inclusions = packages[0].includes || inclusions;
            exclusions = packages[0].excludes || exclusions;
            if (packages[0].itinerary_days) {
              try {
                itineraryDays = JSON.parse(packages[0].itinerary_days);
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      // If fetch fails, use quote defaults
    }
    
    // Clean up text (remove trailing commas, extra spaces)
    inclusions = String(inclusions).replace(/,\s*$/, '').trim();
    exclusions = String(exclusions).replace(/,\s*$/, '').replace(/,{2,}/g, ',').trim();
    
    const doc = new jsPDF();
    const margin = 10;
    let y = margin;

    // Logo - top left
    try {
      doc.addImage(LOGO_URL, 'PNG', margin, y, 15, 12);
      y += 15;
    } catch (e) {}

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text('QUOTATION', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Quote info - compact layout
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Quote #: ${quote.quote_number} | Date: ${new Date().toLocaleDateString()} | Valid: ${quote.valid_until}`, margin, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.text('CLIENT:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${quote.client_name} | ${quote.client_email}`, margin + 15, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.text('PACKAGE:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${quote.highlights || 'Safari Package'} | ${startDate} to ${endDate}`, margin + 15, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.text('BOOKING:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${quote.booking_ref} | Payment: ${quote.payment_terms}`, margin + 15, y);
    y += 7;

    // Pricing table
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
    doc.text(`Subtotal: ${quote.currency} ${(quote.subtotal || 0).toFixed(2)}`, margin, y);
    if (quote.discount) doc.text(`Discount: -${quote.currency} ${quote.discount.toFixed(2)}`, 80, y);
    if (quote.tax) doc.text(`Tax: +${quote.currency} ${quote.tax.toFixed(2)}`, 140, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL: ${quote.currency} ${(quote.total || 0).toFixed(2)}`, margin, y);
    y += 7;

    // Inclusions & Exclusions - side by side
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.text('INCLUSIONS:', margin, y);
    doc.setFont(undefined, 'normal');
    const incLines = doc.splitTextToSize(inclusions, 60);
    doc.text(incLines.slice(0, 3), margin, y + 3);

    doc.setFont(undefined, 'bold');
    doc.text('EXCLUSIONS:', 90, y);
    doc.setFont(undefined, 'normal');
    const excLines = doc.splitTextToSize(exclusions, 60);
    doc.text(excLines.slice(0, 3), 90, y + 3);
    
    y += 12;

    // Itinerary summary
    if (itineraryDays.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text('ITINERARY', margin, y);
      y += 4;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      itineraryDays.slice(0, 5).forEach((day, idx) => {
        const dayText = `Day ${idx + 1}: ${day.description || day.destination || ''} - ${day.accommodation || ''} - ${day.meals || ''}`;
        const lines = doc.splitTextToSize(dayText, 180);
        doc.text(lines, margin, y);
        y += lines.length * 2.5 + 1;
        if (y > 270) return;
      });
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote-${quote.quote_number}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});