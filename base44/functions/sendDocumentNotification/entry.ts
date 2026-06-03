import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BRAND_COLOR = '#2e9e4f';
const BRAND_DARK = '#1a6b32';
const BRAND_LIGHT = '#f0faf3';
const LOGO_URL = 'https://media.base44.com/images/public/69c43e66e5136fec0c861d0c/e2dd8978d_OEX.png';

const formatCurrency = (n) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event, data, entity_type } = await req.json();

    if (!data || !data.client_email) {
      return Response.json({ error: 'Missing client email' }, { status: 400 });
    }

    const isInvoice = entity_type === 'Invoice';
    const docType = isInvoice ? 'Invoice' : 'Quote';
    const docNumber = data.invoice_number || data.quote_number;
    const clientName = data.client_name || 'Valued Client';
    const total = data.total || 0;
    const currency = data.currency || 'USD';
    const action = event === 'create' ? 'created' : 'updated';

    const html = emailWrapper(`
      <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Hello ${clientName},</p>
      <p style="font-size:15px;color:#555555;margin:0 0 28px;line-height:1.6;">
        We're pleased to inform you that a new ${docType.toLowerCase()} has been ${action} for your booking.
      </p>
      ${sectionTitle(docType + ' Details')}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${infoRow(docType + ' Number', docNumber)}
        ${infoRow('Booking Reference', data.booking_ref || '—')}
        ${infoRow('Total Amount', formatCurrency(total))}
        ${isInvoice ? infoRow('Due Date', data.due_date || '—') : infoRow('Valid Until', data.valid_until || '—')}
        ${infoRow('Status', data.status || 'Draft')}
      </table>
      ${data.notes ? `
        <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
          <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;"><strong>Notes:</strong> ${data.notes}</p>
        </div>
      ` : ''}
      <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:16px 20px;margin-top:28px;">
        <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">
          Please review the attached ${docType.toLowerCase()} and contact us if you have any questions.
        </p>
      </div>
    `);

    // Send email using Base44 integration
    await base44.integrations.Core.SendEmail({
      to: data.client_email,
      subject: `${docType} ${docNumber} - ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      body: html,
      from_name: 'Safari Express'
    });

    return Response.json({ 
      success: true, 
      message: `Email sent to ${data.client_email}` 
    });
  } catch (error) {
    console.error('Email notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});