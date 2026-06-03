import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    const balance = invoice.total - (invoice.amount_paid || 0);

    if (balance <= 0) {
      return Response.json({
        success: false,
        message: 'Invoice is already paid',
        paid: true
      });
    }

    // Get PesaPal API credentials from environment
    const pesapalApiUrl = Deno.env.get('PESAPAL_API_URL');
    const pesapalConsumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY');
    const pesapalConsumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET');

    if (!pesapalApiUrl || !pesapalConsumerKey || !pesapalConsumerSecret) {
      return Response.json({
        error: 'PesaPal configuration missing'
      }, { status: 500 });
    }

    // Create payment request
    const paymentData = {
      id: invoice.invoice_number,
      currency: 'USD',
      amount: balance,
      description: `Invoice ${invoice.invoice_number} - ${invoice.client_name}`,
      callback_url: `${pesapalApiUrl}/webhook`,
      notification_id: invoice.id,
      billing_address: {
        email_address: invoice.client_email,
        phone_number: '254700000000'
      }
    };

    // Generate payment URL (simplified - in production use full OAuth flow)
    const paymentUrl = `${pesapalApiUrl}/api/postransaction/request/?consumer_key=${pesapalConsumerKey}&transaction_type=MERCHANT&invoice_number=${invoice.invoice_number}&amount=${balance}&currency=USD&description=${encodeURIComponent(paymentData.description)}&callback_url=${encodeURIComponent(paymentData.callback_url)}`;

    return Response.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount_due: balance,
      payment_url: paymentUrl,
      client_email: invoice.client_email,
      message: 'Payment link generated'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});