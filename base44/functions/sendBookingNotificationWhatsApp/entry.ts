import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BRAND_COLOR = '#2e9e4f';
const BRAND_DARK = '#1a6b32';
const BRAND_LIGHT = '#f0faf3';
const LOGO_URL = 'https://media.base44.com/images/public/69c43e66e5136fec0c861d0c/e2dd8978d_OEX.png';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const formatCurrency = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reservation Safari</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_DARK} 0%,${BRAND_COLOR} 100%);border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
              <img src="${LOGO_URL}" alt="Reservation Safari" style="height:50px;width:auto;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
              <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Safari Express</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Premium Safari Management</div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#2a2a2a;border-radius:0 0 12px 12px;padding:28px 40px;text-align:center;">
              <div style="color:#aaaaaa;font-size:12px;line-height:1.8;">
                <strong style="color:#ffffff;">Reservation Safari Team</strong><br/>
                Questions? Reply to this email or contact us anytime.<br/>
                <span style="color:#555555;">© ${new Date().getFullYear()} Safari Express. All rights reserved.</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const sectionTitle = (title) => `
  <div style="margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid ${BRAND_COLOR};">
    <span style="font-size:14px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:1px;">${title}</span>
  </div>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888888;font-size:13px;width:40%;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#222222;font-size:13px;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, notification_type, client_phone, client_name } = await req.json();

    // Fetch booking details
    const booking = await base44.asServiceRole.entities.Booking.read(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Build HTML email based on notification type
    let subject = '';
    let content = '';
    
    switch (notification_type) {
      case 'confirmation':
        subject = `Booking Confirmed — ${booking.booking_ref}`;
        content = `
          <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Booking Confirmed! 🎉</p>
          <p style="font-size:15px;color:#555555;margin:0 0 28px;line-height:1.6;">
            Hi ${client_name}, your safari booking has been officially confirmed. We're thrilled to welcome you!
          </p>
          ${sectionTitle('Booking Details')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${infoRow('Booking Reference', booking.booking_ref || '—')}
            ${infoRow('Dates', `${formatDate(booking.start_date)} — ${formatDate(booking.end_date)}`)}
            ${infoRow('Number of Guests', booking.num_guests || '—')}
            ${infoRow('Total Amount', formatCurrency(booking.total_amount))}
          </table>
          <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
            <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">We can't wait to welcome you on an unforgettable safari adventure!</p>
          </div>
        `;
        break;
      case 'payment_reminder':
        const outstanding = booking.total_amount - (booking.amount_paid || 0);
        subject = `Payment Reminder — ${booking.booking_ref}`;
        content = `
          <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Payment Reminder</p>
          <p style="font-size:15px;color:#555555;margin:0 0 28px;line-height:1.6;">
            Hi ${client_name}, we have a balance outstanding on your safari booking. Please arrange payment at your earliest convenience.
          </p>
          <div style="background:#fff8e1;border-radius:10px;padding:20px;margin-bottom:28px;text-align:center;">
            <div style="font-size:13px;color:#666666;margin-bottom:6px;">Outstanding Balance</div>
            <div style="font-size:32px;font-weight:800;color:#f59e0b;">${formatCurrency(outstanding)}</div>
          </div>
          ${sectionTitle('Booking Summary')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${infoRow('Booking Reference', booking.booking_ref || '—')}
            ${infoRow('Total Amount', formatCurrency(booking.total_amount))}
            ${infoRow('Amount Paid', formatCurrency(booking.amount_paid || 0))}
            ${infoRow('Outstanding', formatCurrency(outstanding))}
          </table>
          <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
            <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">Please ensure payment is received before your travel date to confirm your safari dates.</p>
          </div>
        `;
        break;
      case 'pre_trip':
        subject = `Pre-Trip Reminder — ${booking.booking_ref}`;
        content = `
          <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Your Safari Adventure Begins Soon! 🦁</p>
          <p style="font-size:15px;color:#555555;margin:0 0 28px;line-height:1.6;">
            Hi ${client_name}, your safari trip is just around the corner! Here are a few important reminders.
          </p>
          ${sectionTitle('Trip Details')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${infoRow('Departure Date', formatDate(booking.start_date))}
            ${infoRow('Return Date', formatDate(booking.end_date))}
            ${infoRow('Number of Guests', booking.num_guests || '—')}
          </table>
          <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
            <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;"><strong>Preparation Tips:</strong> Pack light, bring sun protection, and prepare any required travel documents. Full trip details will be sent shortly. Safe travels!</p>
          </div>
        `;
        break;
      default:
        subject = `Booking Update — ${booking.booking_ref}`;
        content = `
          <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Booking Update</p>
          <p style="font-size:15px;color:#555555;margin:0 0 28px;line-height:1.6;">
            Hi ${client_name}, your booking status has been updated.
          </p>
          ${infoRow('Status', booking.status)}
        `;
    }

    const html = emailWrapper(content);

    // Send via email with proper branding
    await base44.integrations.Core.SendEmail({
      to: booking.client_email,
      subject,
      body: html,
      from_name: 'Safari Express'
    });

    return Response.json({
      success: true,
      message: `${notification_type} notification sent to ${booking.client_email}`,
      booking_ref: booking.booking_ref
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});