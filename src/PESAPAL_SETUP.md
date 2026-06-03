# PesaPal Integration & Automatic Booking Status Updates

## Overview
This system automatically updates booking statuses when PesaPal payment notifications are received. The workflow is:

1. **Payment Initiated** → Booking status remains in current state (inquiry/quoted)
2. **Payment Confirmed** → Booking automatically moves to "confirmed"
3. **Status Email** → Client receives payment confirmation email with updated booking details

## Setup Instructions

### 1. Configure Environment Variables
Ensure these secrets are set in your app settings:
- `PESAPAL_API_URL` - Your PesaPal API endpoint
- `PESAPAL_CONSUMER_KEY` - Your PesaPal consumer key
- `PESAPAL_CONSUMER_SECRET` - Your PesaPal consumer secret

### 2. Get Your Webhook URL
Call the helper function to get your webhook URL:
```
GET /api/functions/getPesapalWebhookUrl
```

Response:
```json
{
  "webhook_url": "https://your-app.com/api/functions/pesapalWebhookHandler",
  "method": "POST",
  "events": ["payment.completed", "payment.failed"]
}
```

### 3. Configure PesaPal Webhook
1. Log in to PesaPal Dashboard
2. Go to **Settings → API → Webhooks**
3. Click **Add Webhook**
4. Paste the webhook URL from step 2
5. Select events:
   - `payment.completed`
   - `payment.failed`
6. Click **Save**
7. Test the webhook to ensure it's working

## Functions Involved

### pesapalWebhookHandler.js
- Receives payment notifications from PesaPal
- Validates webhook signature using HMAC-SHA256
- Updates Payment record status
- Triggers booking status update function

**Endpoint:** `POST /api/functions/pesapalWebhookHandler`

### updateBookingStatusOnPayment.js
- Automatically updates booking status based on payment confirmation
- Calculates total amount paid
- Sends confirmation email to client
- Handles partial and full payments

**Called by:** pesapalWebhookHandler

### getPesapalWebhookUrl.js
- Returns the webhook URL for PesaPal configuration
- Admin-only endpoint

**Endpoint:** `GET /api/functions/getPesapalWebhookUrl`

## Booking Status Workflow

```
INQUIRY/QUOTED
    ↓
[Payment Received]
    ↓
CONFIRMED (automatic)
    ↓
[Trip Starts]
    ↓
IN_PROGRESS
    ↓
[Trip Ends]
    ↓
COMPLETED
```

## Payment States

| Status | Meaning |
|--------|---------|
| pending | Payment initiated, awaiting confirmation |
| confirmed | Payment successfully received |
| failed | Payment failed |
| refunded | Payment refunded |

## Client Communication

When a payment is confirmed:
1. Payment record updated
2. Booking status automatically updated
3. Confirmation email sent to client with:
   - Payment amount received
   - New booking status
   - Booking details
   - Outstanding balance (if any)

## Testing

### 1. Manual Test via PesaPal Dashboard
- Go to PesaPal Dashboard
- Initiate a test payment
- Monitor your app's payment records update automatically

### 2. Test via API
```bash
curl -X POST https://your-app.com/api/functions/pesapalWebhookHandler \
  -H "Content-Type: application/json" \
  -H "pesapal-signature: <signature>" \
  -d '{
    "id": "test_order_123",
    "status": "COMPLETED",
    "amount": 100,
    "reference": "booking_ref_123"
  }'
```

## Troubleshooting

### Signature Verification Fails
- Verify `PESAPAL_CONSUMER_SECRET` is correctly set
- Check webhook payload hasn't been modified in transit
- Ensure signature calculation uses exact request body

### Booking Status Not Updating
- Check Payment record was created with correct booking_id
- Verify `updateBookingStatusOnPayment` function executed successfully
- Check function logs for errors

### Email Not Sent
- Verify `SendEmail` integration is configured
- Check client email address is valid
- Verify booking has client_email field populated

## Production Checklist

- [ ] Environment variables configured
- [ ] Webhook registered in PesaPal Dashboard
- [ ] Webhook tested successfully
- [ ] Payment records being created correctly
- [ ] Booking statuses updating automatically
- [ ] Confirmation emails being delivered
- [ ] Error logs monitored
- [ ] Partial payment handling tested