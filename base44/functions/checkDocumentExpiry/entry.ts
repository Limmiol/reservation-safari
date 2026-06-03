import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BRAND_COLOR = '#2e9e4f';
const BRAND_DARK = '#1a6b32';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const DOC_TYPE_LABELS = {
  passport: 'Passport',
  visa: 'Visa',
  insurance: 'Travel Insurance',
  vaccination: 'Vaccination Card',
  travel_permit: 'Travel Permit',
  other: 'Document',
};

const iconSvg = (name) => {
  const icons = {
    alertTriangle: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    document: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
    clock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  };
  return icons[name] || '';
};

const emailWrapper = (content, isUrgent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Document Expiry Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_DARK} 0%,${BRAND_COLOR} 100%);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
              <div style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">🌍 Safari Pasle</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:6px;letter-spacing:2px;text-transform:uppercase;">${isUrgent ? 'Urgent Document Alert' : 'Document Expiry Reminder'}</div>
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
                <strong style="color:#ffffff;">Safari Pasle Team</strong><br/>
                Questions? Reply to this email or contact us anytime.<br/>
                <span style="color:#555555;">© ${new Date().getFullYear()} Safari Pasle. All rights reserved.</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const docCard = (doc) => {
  const isUrgent = doc.daysUntilExpiry <= 7;
  const isVeryUrgent = doc.daysUntilExpiry <= 1;
  const borderColor = isVeryUrgent ? '#ef4444' : isUrgent ? '#f59e0b' : '#3b82f6';
  const bgColor = isVeryUrgent ? '#fff5f5' : isUrgent ? '#fffbeb' : '#eff6ff';
  const labelColor = isVeryUrgent ? '#dc2626' : isUrgent ? '#d97706' : '#2563eb';
  const label = DOC_TYPE_LABELS[doc.document_type] || 'Document';
  const urgencyText = isVeryUrgent ? 'EXPIRES TOMORROW' :
    doc.daysUntilExpiry <= 7 ? `Expires in ${doc.daysUntilExpiry} days` :
    `Expires in ${doc.daysUntilExpiry} days`;
  const iconName = isVeryUrgent || isUrgent ? 'alertTriangle' : 'info';

  return `
    <div style="background:${bgColor};border-left:4px solid ${borderColor};border-radius:8px;padding:16px 20px;margin-bottom:14px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="color:${labelColor};flex-shrink:0;margin-top:2px;">${iconSvg(iconName)}</div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">${doc.document_name}</div>
          <div style="font-size:12px;color:#666666;margin-bottom:8px;">${label}</div>
          <div style="display:inline-block;background:${borderColor};color:#ffffff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${urgencyText}</div>
          <div style="font-size:13px;color:#555555;margin-top:8px;">Expiry date: <strong>${formatDate(doc.expiry_date)}</strong></div>
        </div>
      </div>
    </div>`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allDocs = await base44.asServiceRole.entities.ClientDocument.list('-expiry_date', 500);
    const docsWithExpiry = allDocs.filter(d => d.expiry_date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const WARN_DAYS = [60, 30, 14, 7, 1];

    const clientDocMap = {};
    for (const doc of docsWithExpiry) {
      const expiry = new Date(doc.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
      if (!WARN_DAYS.includes(daysUntilExpiry)) continue;

      if (!clientDocMap[doc.client_id]) {
        clientDocMap[doc.client_id] = { client_name: doc.client_name, docs: [] };
      }
      clientDocMap[doc.client_id].docs.push({ ...doc, daysUntilExpiry });
    }

    let emailsSent = 0;
    const results = [];

    for (const [clientId, { client_name, docs }] of Object.entries(clientDocMap)) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      const client = clients[0];
      if (!client?.email) continue;

      const soonestDays = Math.min(...docs.map(d => d.daysUntilExpiry));
      const isUrgent = soonestDays <= 7;
      const displayName = client.full_name || client_name || 'Valued Guest';

      const docCardsHtml = docs.map(d => docCard(d)).join('');

      const html = emailWrapper(`
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:48px;height:48px;background:${isUrgent ? '#fef2f2' : '#f0f9ff'};border-radius:10px;display:flex;align-items:center;justify-content:center;color:${isUrgent ? '#dc2626' : '#2563eb'};flex-shrink:0;">
            ${iconSvg(isUrgent ? 'alertTriangle' : 'info')}
          </div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0;">
              ${isUrgent ? 'Action Required' : 'Document Reminder'}
            </div>
          </div>
        </div>

        <p style="font-size:15px;color:#555555;margin:0 0 28px;line-height:1.6;">
          Dear <strong>${displayName}</strong>,<br/><br/>
          ${isUrgent
            ? 'One or more of your travel documents are expiring <strong>very soon</strong>. Please take immediate action to avoid any disruption to your travel plans.'
            : 'This is a friendly reminder that some of your travel documents will be expiring in the coming weeks. We recommend renewing them well in advance.'
          }
        </p>

        <div style="margin-bottom:8px;font-size:14px;font-weight:700;color:#333333;text-transform:uppercase;letter-spacing:0.5px;">
          Documents Requiring Attention (${docs.length})
        </div>

        ${docCardsHtml}

        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-top:28px;">
          <div style="font-size:14px;font-weight:700;color:#333333;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <div style="color:#2563eb;">${iconSvg('info')}</div>
            Next Steps
          </div>
          <div style="font-size:13px;color:#555555;line-height:1.8;">
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <div style="width:20px;flex-shrink:0;color:#10b981;">${iconSvg('check')}</div>
              <div>Contact your nearest embassy or consulate to begin renewal</div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <div style="width:20px;flex-shrink:0;color:#10b981;">${iconSvg('check')}</div>
              <div>Allow sufficient processing time (some documents take 4–8 weeks)</div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <div style="width:20px;flex-shrink:0;color:#10b981;">${iconSvg('check')}</div>
              <div>Once renewed, please send us a copy so we can update your records</div>
            </div>
            <div style="display:flex;gap:8px;">
              <div style="width:20px;flex-shrink:0;color:#10b981;">${iconSvg('check')}</div>
              <div>Reply to this email if you need assistance or have any questions</div>
            </div>
          </div>
        </div>
      `, isUrgent);

      const subject = isUrgent
        ? `Document Expiring ${soonestDays <= 1 ? 'Tomorrow' : `in ${soonestDays} Days`} — Action Required`
        : `Reminder: Your Travel Document Expires in ${soonestDays} Days`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        subject,
        body: html,
        from_name: 'Safari Pasle',
      });

      emailsSent++;
      results.push({ client: client.email, docs: docs.length, soonestDays });
    }

    return Response.json({ success: true, emailsSent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});