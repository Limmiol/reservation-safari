import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BRAND_COLOR = '#2e9e4f';
const BRAND_DARK = '#1a6b32';
const BRAND_LIGHT = '#f0faf3';
const LOGO_URL = 'https://media.base44.com/images/public/69c43e66e5136fec0c861d0c/e2dd8978d_OEX.png';

const STATUS_LABELS = {
  inquiry: 'Inquiry Received',
  quoted: 'Quote Sent',
  confirmed: 'Booking Confirmed',
  in_progress: 'Trip In Progress',
  completed: 'Trip Completed',
  cancelled: 'Booking Cancelled',
};

const STATUS_COLORS = {
  inquiry: '#3b82f6',
  quoted: '#8b5cf6',
  confirmed: '#10b981',
  in_progress: '#f59e0b',
  completed: '#6b7280',
  cancelled: '#ef4444',
};

const STATUS_MESSAGES = {
  inquiry: 'We\'ve received your safari inquiry. Our team is reviewing your request and will prepare a personalised quote for you.',
  quoted: 'Great news — we\'ve prepared a detailed quote for your safari adventure. Please review it and let us know if you have any questions.',
  confirmed: 'Your safari is officially confirmed! We\'re excited to welcome you on what promises to be an unforgettable journey.',
  in_progress: 'Your safari adventure is underway! We hope you\'re enjoying every extraordinary moment.',
  completed: 'Thank you for embarking on a safari with us. We hope it was a truly magical and memorable experience.',
  cancelled: 'Your booking has been cancelled. If this was unexpected or you\'d like to rebook, please don\'t hesitate to reach out.',
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const formatCurrency = (n) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const iconSvg = (name) => {
  const icons = {
    clipboard: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
    calendar: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    mapPin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    users: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
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

const infoRow = (label, value, icon) => `
  <tr>
    <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:middle;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:20px;height:20px;color:${BRAND_COLOR};flex-shrink:0;">${icon || ''}</div>
        <div>
          <div style="color:#888888;font-size:12px;">${label}</div>
          <div style="color:#222222;font-size:13px;font-weight:600;">${value}</div>
        </div>
      </div>
    </td>
  </tr>`;

const sectionTitle = (title) => `
  <div style="margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid ${BRAND_COLOR};">
    <span style="font-size:14px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:1px;">${title}</span>
  </div>`;

const itineraryHtml = (customItinerary) => {
  if (!customItinerary) return '';
  try {
    const days = JSON.parse(customItinerary);
    if (!Array.isArray(days) || days.length === 0) return '';
    const rows = days.map(day => {
      const activities = (day.activities || []).filter(a => a.title)
        .map(a => `<div style="padding:4px 0 4px 12px;border-left:2px solid ${BRAND_COLOR};margin:4px 0;font-size:13px;color:#444444;">
          <strong>${a.title}</strong>${a.notes ? `<br/><span style="color:#888888;">${a.notes}</span>` : ''}
        </div>`).join('');
      return `
        <div style="margin-bottom:20px;">
          <div style="font-size:13px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
            Day ${day.day}${day.title ? ` — ${day.title}` : ''}
          </div>
          ${activities || '<div style="font-size:13px;color:#aaaaaa;">Activities TBD</div>'}
        </div>`;
    }).join('');
    return `${sectionTitle('Your Itinerary')}<div style="background:#f9f9f9;border-radius:8px;padding:20px;">${rows}</div>`;
  } catch {
    return '';
  }
};

const includesHtml = (list, isIncluded) => {
  if (!list) return '';
  const items = list.split(',').map(s => s.trim()).filter(Boolean);
  const icon = isIncluded ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  const color = isIncluded ? '#10b981' : '#ef4444';
  const rows = items.map(item => `
    <tr>
      <td style="padding:6px 0;">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <div style="color:${color};font-weight:700;margin-top:2px;width:16px;">${icon}</div>
          <span style="font-size:13px;color:#444444;">${item}</span>
        </div>
      </td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data: booking } = payload;

    if (!booking || !booking.client_email) {
      return Response.json({ skipped: true, reason: 'No client email' });
    }

    const status = booking.status;
    const statusLabel = STATUS_LABELS[status] || cap(status);
    const statusColor = STATUS_COLORS[status] || '#6b7280';
    const statusMessage = STATUS_MESSAGES[status] || 'Your booking status has been updated.';

    let pkg = null;
    if (booking.package_id) {
      try {
        const pkgList = await base44.asServiceRole.entities.Package.filter({ id: booking.package_id });
        pkg = pkgList[0] || null;
      } catch {}
    }

    const html = emailWrapper(`
      <!-- Status Banner -->
      <div style="background:${statusColor}15;border:1px solid ${statusColor}30;border-radius:10px;padding:24px;text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:10px;color:${statusColor};">
          ${iconSvg('check')}
        </div>
        <div style="display:inline-block;background:${statusColor};color:#ffffff;padding:6px 18px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">${statusLabel}</div>
        <div style="font-size:15px;color:#333333;line-height:1.6;max-width:440px;margin:0 auto;">
          Dear <strong>${booking.client_name || 'Valued Guest'}</strong>,<br/>
          ${statusMessage}
        </div>
      </div>

      ${sectionTitle('Booking Summary')}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${infoRow('Booking Reference', `<strong>${booking.booking_ref || '—'}</strong>`, iconSvg('clipboard'))}
        ${infoRow('Package', booking.package_name || '—', iconSvg('calendar'))}
        ${pkg?.destination ? infoRow('Destination', pkg.destination, iconSvg('mapPin')) : ''}
        ${infoRow('Travel Dates', `${formatDate(booking.start_date)} — ${formatDate(booking.end_date)}`, iconSvg('calendar'))}
        ${infoRow('Number of Guests', booking.num_guests || '—', iconSvg('users'))}
        ${infoRow('Total Amount', formatCurrency(booking.total_amount), '')}
        ${booking.special_requests ? infoRow('Special Requests', booking.special_requests, '') : ''}
      </table>

      ${pkg?.includes ? `${sectionTitle('What\'s Included')}<div style="background:${BRAND_LIGHT};border-radius:8px;padding:16px 20px;">${includesHtml(pkg.includes, true)}</div>` : ''}
      ${pkg?.excludes ? `${sectionTitle('Not Included')}<div style="background:#fff5f5;border-radius:8px;padding:16px 20px;">${includesHtml(pkg.excludes, false)}</div>` : ''}
      ${itineraryHtml(booking.custom_itinerary)}

      <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
        <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">
          Questions or special requests? Simply reply to this email and our team will be happy to assist you.
        </p>
      </div>
    `);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.client_email,
      subject: `[${statusLabel}] Your Safari Booking — ${booking.booking_ref || ''}`,
      body: html,
      from_name: 'Safari Express',
    });

    return Response.json({ success: true, to: booking.client_email, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});