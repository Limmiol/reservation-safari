import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BRAND_COLOR = '#2e9e4f';
const BRAND_DARK = '#1a6b32';
const BRAND_LIGHT = '#f0faf3';
const LOGO_URL = 'https://media.base44.com/images/public/69c43e66e5136fec0c861d0c/e2dd8978d_OEX.png';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const formatCurrency = (n) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'TBD';
const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const iconSvg = (name) => {
  const icons = {
    checkmark: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    clipboard: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
    refresh: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2-8.83"></path></svg>',
    arrowRight: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
  };
  return icons[name] || '';
};

const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Safari Pasle</title>
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
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888888;font-size:13px;width:40%;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#222222;font-size:13px;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;

const sectionTitle = (title) => `
  <div style="margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid ${BRAND_COLOR};">
    <span style="font-size:14px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:1px;">${title}</span>
  </div>`;

const statusBadge = (status) => {
  const colors = {
    inquiry: '#3b82f6',
    quoted: '#8b5cf6',
    confirmed: '#10b981',
    in_progress: '#f59e0b',
    completed: '#6b7280',
    cancelled: '#ef4444',
  };
  const bg = colors[status] || '#6b7280';
  return `<span style="background:${bg};color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${cap(status)}</span>`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    const booking = data || old_data;
    if (!booking) return Response.json({ error: 'No booking data' }, { status: 400 });

    const adminEmail = 'admin@safarireservations.com';

    // ── NEW BOOKING ──
    if (event.type === 'create') {
      const clientHtml = emailWrapper(`
        <p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Thank You, ${booking.client_name}!</p>
        <p style="font-size:15px;color:#555555;margin:0 0 28px;line-height:1.6;">
          We've received your safari inquiry and are thrilled to help you plan an unforgettable adventure. 
          Our team will review your request and send you a detailed quote shortly.
        </p>
        ${sectionTitle('Booking Details')}
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${infoRow('Booking Reference', booking.booking_ref || '—')}
          ${infoRow('Package', booking.package_name || '—')}
          ${infoRow('Start Date', formatDate(booking.start_date))}
          ${infoRow('Number of Guests', booking.num_guests || '—')}
          ${infoRow('Status', statusBadge('inquiry'))}
          ${booking.special_requests ? infoRow('Special Requests', booking.special_requests) : ''}
        </table>
        <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
          <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">
            <strong>What's next?</strong> Our safari experts will prepare a personalised quote for you within 24 hours. 
            Keep an eye on your inbox!
          </p>
        </div>
      `);

      await base44.integrations.Core.SendEmail({
        to: booking.client_email,
        subject: `Safari Booking Received — ${booking.booking_ref}`,
        body: clientHtml,
        from_name: 'Safari Express',
      });

      // Admin plain notification
      const adminHtml = emailWrapper(`
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:36px;height:36px;background:${BRAND_LIGHT};border-radius:8px;display:flex;align-items:center;justify-content:center;color:${BRAND_COLOR};">
            ${iconSvg('clipboard')}
          </div>
          <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0;">New Booking Received</p>
        </div>
        ${sectionTitle('Booking Information')}
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${infoRow('Reference', booking.booking_ref || '—')}
          ${infoRow('Client', booking.client_name)}
          ${infoRow('Email', booking.client_email)}
          ${infoRow('Package', booking.package_name || '—')}
          ${infoRow('Start Date', formatDate(booking.start_date))}
          ${infoRow('Guests', booking.num_guests || '—')}
          ${infoRow('Total Amount', formatCurrency(booking.total_amount))}
          ${booking.special_requests ? infoRow('Special Requests', booking.special_requests) : ''}
        </table>
        <div style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;padding:16px 20px;margin-top:28px;">
          <p style="margin:0;font-size:14px;color:#333333;">Please review and create a quote for this client.</p>
        </div>
      `);

      await base44.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `New Booking: ${booking.booking_ref} — ${booking.client_name}`,
        body: adminHtml,
        from_name: 'Safari Express',
      });
    }

    // ── STATUS CHANGE ──
    else if (event.type === 'update' && old_data && old_data.status !== booking.status) {
      const statusMessages = {
        quoted: 'Great news — a personalised quote has been prepared for your safari booking.',
        confirmed: 'Your booking is officially confirmed! We can\'t wait to welcome you on safari.',
        in_progress: 'Your safari adventure is beginning! Enjoy every moment.',
        completed: 'Thank you for travelling with us. We hope your safari was truly extraordinary.',
        cancelled: 'Your booking has been cancelled. If this was unexpected, please contact us.',
      };

      const clientHtml = emailWrapper(`
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:36px;height:36px;background:${BRAND_LIGHT};border-radius:8px;display:flex;align-items:center;justify-content:center;color:${BRAND_COLOR};">
            ${iconSvg('refresh')}
          </div>
          <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0;">Booking Update — ${booking.booking_ref}</p>
        </div>
        <p style="font-size:15px;color:#555555;margin:0 0 20px;line-height:1.6;">${statusMessages[booking.status] || `Your booking status has been updated.`}</p>
        <div style="text-align:center;margin:20px 0;">
          ${statusBadge(booking.status)}
        </div>
        ${sectionTitle('Booking Summary')}
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${infoRow('Booking Reference', booking.booking_ref || '—')}
          ${infoRow('Package', booking.package_name || '—')}
          ${infoRow('Travel Dates', `${formatDate(booking.start_date)} — ${formatDate(booking.end_date)}`)}
          ${infoRow('Guests', booking.num_guests || '—')}
          ${infoRow('Total Amount', formatCurrency(booking.total_amount))}
        </table>
        <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
          <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">
            Questions about your booking? Simply reply to this email and our team will assist you promptly.
          </p>
        </div>
      `);

      await base44.integrations.Core.SendEmail({
        to: booking.client_email,
        subject: `[${cap(booking.status)}] Your Safari Booking — ${booking.booking_ref}`,
        body: clientHtml,
        from_name: 'Safari Express',
      });

      // Admin notification
      const adminHtml = emailWrapper(`
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:36px;height:36px;background:${BRAND_LIGHT};border-radius:8px;display:flex;align-items:center;justify-content:center;color:${BRAND_COLOR};">
            ${iconSvg('refresh')}
          </div>
          <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0;">Booking Status Updated</p>
        </div>
        ${sectionTitle('Status Change')}
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${infoRow('Reference', booking.booking_ref || '—')}
          ${infoRow('Client', booking.client_name)}
          ${infoRow('Package', booking.package_name || '—')}
          ${infoRow('Previous Status', statusBadge(old_data.status))}
          ${infoRow('New Status', statusBadge(booking.status))}
          ${infoRow('Total Amount', formatCurrency(booking.total_amount))}
          ${infoRow('Amount Paid', formatCurrency(booking.amount_paid))}
        </table>
      `);

      await base44.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `Status Update: ${booking.booking_ref} → ${cap(booking.status)}`,
        body: adminHtml,
        from_name: 'Safari Express',
      });
    }

    return Response.json({ success: true, message: 'Notifications sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});