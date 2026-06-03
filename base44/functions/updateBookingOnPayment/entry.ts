import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, payment_amount, invoice_id } = await req.json();

    // Fetch booking and invoice
    const booking = await base44.asServiceRole.entities.Booking.read(booking_id);
    const invoice = await base44.asServiceRole.entities.Invoice.read(invoice_id);

    if (!booking || !invoice) {
      return Response.json({ error: 'Booking or invoice not found' }, { status: 404 });
    }

    // Calculate remaining balance
    const remaining = invoice.total - (invoice.amount_paid + payment_amount);

    // Update booking status based on payment
    let newStatus = booking.status;
    if (remaining <= 0) {
      newStatus = 'confirmed'; // Full payment received
    } else if (invoice.amount_paid + payment_amount > 0) {
      newStatus = 'confirmed'; // At least deposit received
    }

    // Update booking
    if (newStatus !== booking.status) {
      await base44.asServiceRole.entities.Booking.update(booking_id, {
        status: newStatus,
        amount_paid: (booking.amount_paid || 0) + payment_amount
      });
    }

    // Update invoice
    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      amount_paid: invoice.amount_paid + payment_amount,
      status: remaining <= 0 ? 'paid' : 'partially_paid'
    });

    return Response.json({
      success: true,
      booking_status: newStatus,
      amount_paid: invoice.amount_paid + payment_amount,
      remaining_balance: Math.max(0, remaining)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});