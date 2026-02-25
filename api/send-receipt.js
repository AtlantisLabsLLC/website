/**
 * Vercel serverless function: POST order data, send receipt email via Resend.
 * Set RESEND_API_KEY and RECEIPT_FROM_EMAIL in Vercel env (e.g. orders@yourdomain.com).
 */
const { Resend } = require('resend');

function buildReceiptHtml(payload) {
  const { email, address, items, subtotal, discount, shipping, total, couponCode } = payload;
  const lines = (items || []).map(
    (i) => `<tr><td>${escapeHtml(i.name || 'Item')}</td><td>${i.quantity || 1}</td><td>$${(i.price || 0).toFixed(2)}</td><td>$${((i.quantity || 1) * (i.price || 0)).toFixed(2)}</td></tr>`
  ).join('');
  const discountRow = discount > 0 ? `<tr><td colspan="3">Discount</td><td>-$${discount.toFixed(2)}</td></tr>` : '';
  const couponRow = couponCode ? `<tr><td colspan="3">Coupon</td><td>${escapeHtml(couponCode)}</td></tr>` : '';
  const addr = [address?.street, [address?.city, address?.state, address?.zip].filter(Boolean).join(', ')].filter(Boolean).join(', ');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order receipt</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h1 style="font-size: 1.35rem; margin-bottom: 8px;">Atlantis Labs</h1>
  <p style="color: #666; margin-bottom: 24px;">Order receipt — for research use only. Not for human consumption.</p>
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
  <p><strong>Ship to</strong><br>${escapeHtml(addr || '—')}</p>
  <p style="margin-top: 32px; font-size: 0.9rem; color: #666;">If you have questions, reply to this email or contact hello@atlantislabs.com.</p>
</body>
</html>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  const resend = new Resend(apiKey);
  const payload = {
    email,
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
