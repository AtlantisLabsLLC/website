# Receipt API

Serverless endpoint that sends an order receipt email when checkout is completed.

## Setup

1. **Resend**
   - Sign up at [resend.com](https://resend.com) and create an API key.
   - (Optional) Add and verify your domain so receipts come from e.g. `orders@yourdomain.com`.

2. **Environment variables** (set in Vercel → Project → Settings → Environment Variables)
   - `RESEND_API_KEY` — your Resend API key (required).
   - `RECEIPT_FROM_EMAIL` — optional; e.g. `Atlantis Labs <orders@yourdomain.com>`. If unset, uses Resend’s onboarding address (for testing only).
   - `SITE_URL` — optional; your live site URL (e.g. `https://atlantislabs.shop`) so the receipt email can show your logo. No trailing slash.
   - `ALLOWED_ORIGINS` — optional but recommended; comma-separated list of origins that may call the API (e.g. `https://atlantislabs.shop,https://www.atlantislabs.shop`). If set, requests from other origins (e.g. curl, other sites) are rejected with 403. Reduces API abuse.

## Deploy

- **Site + API on Vercel:** Deploy the whole project. The checkout page will call `/api/send-receipt` on the same origin.
- **Site on Porkbun (or elsewhere), API on Vercel:** Deploy this repo to Vercel, then in `checkout.html` set `RECEIPT_API_URL` to your Vercel API URL, e.g. `'https://your-project.vercel.app/api/send-receipt'`.

## Local test

```bash
npm install
npx vercel dev
```

Open the site, go through checkout, and click a payment button. The receipt is sent to the email entered at checkout.
