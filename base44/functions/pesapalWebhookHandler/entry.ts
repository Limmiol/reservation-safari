import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    // Verify this is a POST request
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const data = JSON.parse(body);

    // Validate PesaPal signature
    const signature = req.headers.get('pesapal-signature');
    if (!signature) {
      console.log('No signature provided');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Get PesaPal credentials from environment
    const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET');
    if (!consumerSecret) {
      console.error('PESAPAL_CONSUMER_SECRET not configured');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify signature using HMAC-SHA256
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(body + consumerSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const expectedSignature = btoa(hashHex);

    if (signature !== expectedSignature) {
      console.log('Signature verification failed');
      return Response.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    // Process payment notification
    const { id: pesapalOrderId, status: pesapalStatus, amount, reference, order_tracking_id } = data;

    if (!pesapalOrderId) {
      return Response.json({ error: 'Missing order ID' }, { status: 400 });
    }

    console.log(`Processing PesaPal payment: ${pesapalOrderId} - Status: ${pesapalStatus}`);

    // Find payment by reference
    const payments = await base44.asServiceRole.entities.Payment.filter({ payment_ref: pesapalOrderId });
    
    if (payments.length === 0) {
      console.log(`Payment not found for reference: ${pesapalOrderId}`);
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = payments[0];

    // Update payment status based on PesaPal status
    let newPaymentStatus = 'pending';
    if (pesapalStatus === 'COMPLETED') {
      newPaymentStatus = 'confirmed';
    } else if (pesapalStatus === 'FAILED') {
      newPaymentStatus = 'failed';
    }

    // Update payment record
    await base44.asServiceRole.entities.Payment.update(payment.id, {
      status: newPaymentStatus,
      notes: `PesaPal Order: ${pesapalOrderId}, Status: ${pesapalStatus}`
    });

    console.log(`Payment ${payment.id} updated to status: ${newPaymentStatus}`);

    // If payment is confirmed, update booking status
    if (newPaymentStatus === 'confirmed' && payment.booking_id) {
      await base44.asServiceRole.functions.invoke('updateBookingStatusOnPayment', {
        booking_id: payment.booking_id,
        payment_id: payment.id
      });
    }

    return Response.json({
      success: true,
      message: 'Payment processed successfully',
      payment_id: payment.id,
      status: newPaymentStatus
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});