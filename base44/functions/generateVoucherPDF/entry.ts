import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

const BRAND_COLOR = [46, 158, 79];
const BRAND_DARK = [26, 107, 50];
const LOGO_URL = 'https://media.base44.com/images/public/69c43e66e5136fec0c861d0c/e2dd8978d_OEX.png';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voucher_id } = await req.json();

    if (!voucher_id) {
      return Response.json({ error: 'Missing voucher_id' }, { status: 400 });
    }

    const vouchers = await base44.asServiceRole.entities.Voucher.filter({ id: voucher_id });
    if (vouchers.length === 0) {
      return Response.json({ error: 'Voucher not found' }, { status: 404 });
    }

    const voucher = vouchers[0];

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Header with gradient effect
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 25, pageWidth, 5, 'F');

    // Logo & Title
    try {
      doc.addImage(LOGO_URL, 'PNG', margin, 8, 12, 10);
    } catch (e) {}

    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('HOTEL VOUCHER', margin + 15, 15);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Voucher #: ${voucher.voucher_number}`, pageWidth - margin - 60, 15);
    doc.text(`Booking: ${voucher.booking_ref}`, pageWidth - margin - 60, 21);

    doc.setTextColor(0, 0, 0);
    yPos = 40;

    // Hotel info
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${voucher.hotel_name}`, margin, yPos);
    yPos += 12;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const details = [
      ['Guest Name:', voucher.client_name],
      ['Check-in:', voucher.check_in],
      ['Check-out:', voucher.check_out],
      ['Room Type:', voucher.room_type],
      ['Meal Plan:', voucher.meal_plan],
      ['Number of Guests:', String(voucher.num_guests)]
    ];

    details.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(String(value || ''), margin + 50, yPos);
      yPos += 8;
    });

    if (voucher.special_instructions) {
      yPos += 5;
      doc.setFont(undefined, 'bold');
      doc.text('Special Instructions:', margin, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(voucher.special_instructions, pageWidth - 2 * margin);
      doc.text(lines, margin, yPos);
    }

    // Footer
    yPos = pageHeight - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('This voucher is valid only for the guest and dates specified above.', margin, yPos);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Voucher-${voucher.voucher_number}.pdf"`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});