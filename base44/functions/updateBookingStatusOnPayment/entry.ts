import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { booking_id, payment_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    // Get booking
    const bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Determine new booking status based on current state and payment
    let newStatus = booking.status;

    if (booking.status === 'inquiry' || booking.status === 'quoted') {
      // Payment received for inquiry/quote - move to confirmed
      newStatus = 'confirmed';
    } else if (booking.status === 'confirmed') {
      // Already confirmed, no change needed
      newStatus = 'confirmed';
    }

    // Get all payments for this booking to check if fully paid
    const allPayments = await base44.asServiceRole.entities.Payment.filter({ booking_id });
    const totalPaid = allPayments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const isPaid = totalPaid >= booking.total_amount;

    // Update booking
    await base44.asServiceRole.entities.Booking.update(booking_id, {
      status: newStatus,
      amount_paid: totalPaid
    });

    console.log(`Booking ${booking_id} updated - Status: ${newStatus}, Paid: ${totalPaid}/${booking.total_amount}`);

    // Send confirmation email to client
    await base44.integrations.Core.SendEmail({
      to: booking.client_email,
      subject: `Payment Confirmed - Booking ${booking.booking_ref}`,
      body: generateConfirmationEmail(booking, newStatus, totalPaid, isPaid)
    });

    return Response.json({
      success: true,
      booking_id,
      status: newStatus,
      amount_paid: totalPaid,
      is_fully_paid: isPaid
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});

function generateConfirmationEmail(booking, status, amountPaid, isPaid) {
  const outstanding = booking.total_amount - amountPaid;
  
  return `
    <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1a6b32;">Payment Received ✓</h2>
        <p>Dear ${booking.client_name || 'Valued Guest'},</p>
        
        <p>We've received your payment of <strong>$${amountPaid.toFixed(2)}</strong> for booking <strong>${booking.booking_ref}</strong>.</p>
        
        <div style="background: #f0faf3; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Booking Status:</strong> ${status.replace(/_/g, ' ').toUpperCase()}</p>
          <p style="margin: 10px 0 0 0;"><strong>Package:</strong> ${booking.package_name}</p>
          <p style="margin: 10px 0 0 0;"><strong>Trip Dates:</strong> ${booking.start_date} to ${booking.end_date}</p>
          <p style="margin: 10px 0 0 0;"><strong>Guests:</strong> ${booking.num_guests}</p>
        </div>

        <div style="background: #fff9e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Payment Summary:</strong></p>
          <p style="margin: 10px 0 0 0;">Total Amount: $${booking.total_amount.toFixed(2)}</p>
          <p style="margin: 10px 0 0 0;">Amount Paid: $${amountPaid.toFixed(2)}</p>
          ${outstanding > 0 ? `<p style="margin: 10px 0 0 0; color: #d97706;">Outstanding: $${outstanding.toFixed(2)}</p>` : ''}
        </div>

        ${isPaid ? `
          <p style="color: #1a6b32;"><strong>✓ Your booking is fully paid and confirmed!</strong></p>
        ` : `
          <p style="color: #d97706;">Please note: A balance of $${outstanding.toFixed(2)} is still due.</p>
        `}

        <p style="margin-top: 20px; color: #666;">If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>Safari Pulse Team</p>
      </div>
    </div>
  `;
}