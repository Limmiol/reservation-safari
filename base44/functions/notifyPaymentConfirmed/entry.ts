import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BRAND_COLOR = '#2e9e4f';
const BRAND_DARK = '#1a6b32';
const BRAND_LIGHT = '#f0faf3';
const LOGO_URL = 'https://media.base44.com/images/public/69c43e66e5136fec0c861d0c/e2dd8978d_OEX.png';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const formatCurrency = (n) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const iconSvg = (name) => {
  const icons = {
    checkmark: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    creditCard: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
  };
  return icons[name] || '';
};

const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_DARK} 0%,${BRAND_COLOR} 100%);border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
              <img src="${LOGO_URL}" alt="Reservation Safari" style="height:50px;width:auto;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
              <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Safari Express</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Premium Safari Management</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
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

const infoRow = (label, value) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888888;font-size:13px;width:45%;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#222222;font-size:13px;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;

const sectionTitle = (title) => `
  <div style="margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid ${BRAND_COLOR};">
    <span style="font-size:14px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:1px;">${title}</span>
  </div>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data: payment } = payload;

    if (!payment) return Response.json({ skipped: true, reason: 'No payment data' });

    let clientEmail = null;
    let clientName = payment.client_name || 'Valued Guest';

    if (payment.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: payment.client_id });
      const client = clients[0];
      if (client) {
        clientEmail = client.email;
        clientName = client.full_name || clientName;
      }
    }

    if (!clientEmail) return Response.json({ skipped: true, reason: 'No client email found' });

    let booking = null;
    if (payment.booking_id) {
      const bookings = await base44.asServiceRole.entities.Booking.filter({ id: payment.booking_id });
      booking = bookings[0] || null;
    }

    const totalPaid = booking?.amount_paid ?? payment.amount;
    const totalAmount = booking?.total_amount ?? null;
    const balance = totalAmount != null ? totalAmount - (booking?.amount_paid ?? 0) : null;
    const isFullyPaid = balance !== null && balance <= 0;

    const subject = `Payment Confirmed — ${payment.payment_ref || payment.invoice_number || 'Receipt'}`;

    const html = emailWrapper(`
      <!-- Success banner -->
      <div style="background:${BRAND_LIGHT};border-radius:10px;padding:24px;text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:10px;color:${BRAND_COLOR};">
          ${iconSvg('checkmark')}
        </div>
        <div style="font-size:22px;font-weight:700;color:${BRAND_COLOR};margin-bottom:6px;">Payment Received!</div>
        <div style="font-size:15px;color:#555555;">Thank you, <strong>${clientName}</strong>. Your payment has been successfully processed.</div>
      </div>

      <!-- Amount highlight -->
      <div style="background:#1a1a1a;border-radius:10px;padding:24px;text-align:center;margin-bottom:32px;">
        <div style="font-size:13px;color:#aaaaaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Amount Paid</div>
        <div style="font-size:36px;font-weight:800;color:#ffffff;">${formatCurrency(payment.amount)}</div>
        <div style="font-size:13px;color:#888888;margin-top:4px;">${formatDate(payment.payment_date)} · ${cap(payment.method || '—')}</div>
      </div>

      ${sectionTitle('Payment Details')}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${infoRow('Payment Reference', payment.payment_ref || '—')}
        ${infoRow('Invoice Number', payment.invoice_number || '—')}
        ${infoRow('Booking Reference', payment.booking_ref || '—')}
        ${infoRow('Payment Method', cap(payment.method || '—'))}
        ${infoRow('Payment Date', formatDate(payment.payment_date))}
        ${infoRow('Status', '<span style="color:#10b981;font-weight:700;">CONFIRMED</span>')}
      </table>

      ${booking ? `
      ${sectionTitle('Booking Summary')}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${infoRow('Package', booking.package_name || '—')}
        ${infoRow('Travel Dates', `${formatDate(booking.start_date)} — ${formatDate(booking.end_date)}`)}
        ${infoRow('Total Amount', formatCurrency(booking.total_amount))}
        ${infoRow('Amount Paid', formatCurrency(booking.amount_paid))}
        ${balance !== null ? infoRow('Outstanding Balance', isFullyPaid ? '<span style="color:#10b981;font-weight:700;">FULLY PAID ✓</span>' : `<span style="color:#ef4444;font-weight:700;">${formatCurrency(balance)}</span>`) : ''}
      </table>
      ` : ''}

      ${isFullyPaid ? `
      <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#1a6b32;font-weight:600;line-height:1.6;">
          Your booking is fully paid! We look forward to welcoming you on your safari adventure.
        </p>
      </div>
      ` : `
      <div style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;padding:16px 20px;margin-top:28px;">
        <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">
          A balance of <strong>${formatCurrency(balance)}</strong> remains on your booking. Please ensure full payment is made before your travel date.
        </p>
      </div>
      `}
    `);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: clientEmail,
      subject,
      body: html,
      from_name: 'Safari Express',
    });

    return Response.json({ success: true, to: clientEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});