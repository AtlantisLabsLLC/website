/**
 * Vercel serverless function: POST order data, send receipt email via Resend.
 * Set RESEND_API_KEY and RECEIPT_FROM_EMAIL in Vercel env (e.g. orders@yourdomain.com).
 */
const { Resend } = require('resend');

function buildReceiptHtml(payload) {
  const { orderNumber, email, name, address, items, subtotal, discount, shipping, total, couponCode, logoUrl } = payload;
  const lines = (items || []).map(
    (i) => `<tr><td>${escapeHtml(i.name || 'Item')}</td><td>${i.quantity || 1}</td><td>$${(i.price || 0).toFixed(2)}</td><td>$${((i.quantity || 1) * (i.price || 0)).toFixed(2)}</td></tr>`
  ).join('');
  const discountRow = discount > 0 ? `<tr><td colspan="3">Discount</td><td>-$${discount.toFixed(2)}</td></tr>` : '';
  const couponRow = couponCode ? `<tr><td colspan="3">Coupon</td><td>${escapeHtml(couponCode)}</td></tr>` : '';
  const addr = [address?.street, [address?.city, address?.state, address?.zip].filter(Boolean).join(', ')].filter(Boolean).join(', ');
  const shipToLines = [];
  if (name) shipToLines.push(`<strong>Name:</strong> ${escapeHtml(name)}`);
  if (addr) shipToLines.push(`<strong>Shipping address:</strong><br>${escapeHtml(addr)}`);
  const shipTo = shipToLines.length ? shipToLines.join('<br><br>') : '—';
  const logoBlock = logoUrl ? `<p style="margin-bottom: 16px;"><img src="${logoUrl}" alt="Atlantis Labs" width="160" height="auto" style="max-width: 200px; height: auto; display: block;" /></p>` : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order receipt</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  ${logoBlock}
  <h1 style="font-size: 1.35rem; margin-bottom: 8px;">Atlantis Labs</h1>
  <p style="color: #666; margin-bottom: 4px;">Order receipt — for research use only. Not for human consumption.</p>
  <p style="font-size: 1rem; font-weight: 600; margin-bottom: 24px; color: #1a1a1a;">Order #${escapeHtml(orderNumber || '—')}</p>
  <p>Thank you for your order. We'll follow up with payment and shipping details.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="border-bottom: 2px solid #eee;"><th style="text-align: left; padding: 8px 0;">Item</th><th style="text-align: right; padding: 8px 0;">Qty</th><th style="text-align: right; padding: 8px 0;">Price</th><th style="text-align: right; padding: 8px 0;">Total</th></tr>
    </thead>
    <tbody>
      ${lines}
      ${discountRow}
      <tr><td colspan="3">Shipping</td><td style="text-align: right;">$${shipping.toFixed(2)}</td></tr>
      ${couponRow}
      <tr style="font-weight: 700; border-top: 2px solid #333;"><td colspan="3">Total</td><td style="text-align: right;">$${total.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <p><strong>Ship to</strong><br><br>${shipTo}</p>
  ${couponCode ? `<p><strong>Affiliate/Coupon code used:</strong> ${escapeHtml(couponCode)}</p>` : ''}
  <p style="margin-top: 32px; font-size: 0.9rem; color: #666;">If you have questions, reply to this email or contact hello@atlantislabs.com.</p>
  <p style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.85rem; color: #555; line-height: 1.5;"><strong>Refund policy:</strong> We do not offer refunds except when a shipment never reaches its destination. In that case, we will work with you to either issue a refund or reship the package. This policy is in place for safety and quality control, as we cannot accept returns of research materials once they have left our facility.</p>
</body>
</html>`;
}

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ATL-${timestamp}-${random}`;
}

function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map((o) => o.trim().toLowerCase()).filter(Boolean);
}

function isAllowedOrigin(req) {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true;
  const raw = (req.headers.origin || req.headers.referer || '').trim();
  if (!raw) return false;
  let originHost;
  try {
    originHost = new URL(raw).origin.toLowerCase();
  } catch {
    originHost = raw.toLowerCase().replace(/\/$/, '');
  }
  return allowed.some((a) => {
    const base = a.replace(/\/$/, '');
    return originHost === base;
  });
}

module.exports = async function handler(req, res) {
  const allowed = getAllowedOrigins();
  const origin = (req.headers.origin || '').trim();
  if (allowed.length > 0 && allowed.includes(origin.replace(/\/$/, '').toLowerCase())) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (allowed.length > 0 && !isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RECEIPT_FROM_EMAIL || 'Atlantis Labs <onboarding@resend.dev>';

  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '').replace(/["'<>]/g, '');
  const logoUrl = siteUrl ? `${siteUrl}/atlantis-labs-logo.png` : '';
  const resend = new Resend(apiKey);
  const orderNumber = generateOrderNumber();
  const payload = {
    orderNumber,
    logoUrl,
    email,
    name: (body.name || '').trim(),
    address: body.address || {},
    items: Array.isArray(body.items) ? body.items : [],
    subtotal: Number(body.subtotal) || 0,
    discount: Number(body.discount) || 0,
    shipping: Number(body.shipping) != null ? Number(body.shipping) : 15,
    total: Number(body.total) || 0,
    couponCode: body.couponCode || null
  };

  const html = buildReceiptHtml(payload);

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Your Atlantis Labs order receipt',
      html
    });
    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', detail: error.message });
    }
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('Send receipt error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
