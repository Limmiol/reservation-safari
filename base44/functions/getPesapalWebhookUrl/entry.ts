import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Helper function to get the PesaPal webhook URL
 * Returns the full URL for configuring in PesaPal dashboard
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get app base URL from environment or construct it
    const appBaseUrl = Deno.env.get('VITE_BASE44_APP_BASE_URL') || 'https://your-app-domain.com';
    
    const webhookUrl = `${appBaseUrl}/api/functions/pesapalWebhookHandler`;

    return Response.json({
      webhook_url: webhookUrl,
      method: 'POST',
      events: ['payment.completed', 'payment.failed'],
      instructions: `
        1. Log in to your PesaPal Dashboard
        2. Go to Settings > API > Webhooks
        3. Add a new webhook endpoint with this URL: ${webhookUrl}
        4. Select events: payment.completed, payment.failed
        5. Test the webhook connection
        6. Make sure PESAPAL_CONSUMER_SECRET is configured in your environment
      `
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});