import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id } = await req.json();

    // Fetch booking details
    const booking = await base44.asServiceRole.entities.Booking.read(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if invoice already exists for this booking
    const existingInvoices = await base44.asServiceRole.entities.Invoice.filter({
      booking_id: booking_id
    });

    if (existingInvoices.length > 0) {
      return Response.json({
        success: false,
        message: 'Invoice already exists for this booking',
        invoice_id: existingInvoices[0].id
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Prepare line items from booking
    const items = [
      {
        description: `${booking.package_name} (${booking.num_guests} guests)`,
        quantity: 1,
        unit_price: booking.total_amount,
        amount: booking.total_amount
      }
    ];

    // Calculate taxes and totals
    const subtotal = booking.total_amount;
    const taxRate = 0.16; // 16% VAT
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    // Create invoice record
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: invoiceNumber,
      booking_id: booking_id,
      booking_ref: booking.booking_ref,
      client_id: booking.client_id,
      client_name: booking.client_name,
      client_email: booking.client_email,
      items: JSON.stringify(items),
      subtotal: subtotal,
      tax: tax,
      discount: 0,
      total: total,
      amount_paid: booking.amount_paid || 0,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: booking.amount_paid > 0 ? 'partially_paid' : 'draft',
      notes: `Invoice for booking ${booking.booking_ref}`
    });

    return Response.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      total: total,
      tax: tax,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});