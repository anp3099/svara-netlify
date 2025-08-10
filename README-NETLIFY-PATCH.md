# Svara — Netlify Functions Patch

This adds:
- `netlify/functions/checkout.ts` (Stripe Checkout)
- `netlify/functions/stripe-webhook.ts` (Stripe webhook)
- Root `netlify.toml` with redirects

## How to apply
1. Unzip this into your project root (same level as `package.json`). It should create a `netlify/` folder and a `netlify.toml` file.
2. In Netlify, set env vars:
   - `VITE_BLINK_PROJECT_ID=spark-ai-sales-outreach-saas-platform-68hyt0cq`
   - `APP_URL=https://svara.tech`
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`

3. Redeploy the site in Netlify.
4. In Stripe → Webhooks, set endpoint to `https://svara.tech/api/stripe-webhook`.