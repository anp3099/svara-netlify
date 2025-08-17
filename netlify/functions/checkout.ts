import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };
}

function rsp(statusCode: number, body: unknown) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') return rsp(405, { error: 'Method Not Allowed' });

  try {
    const {
      priceId,
      customerEmail,
      trialPeriodDays = 0,
      successUrl,
      cancelUrl,
    } = JSON.parse(event.body || '{}');

    if (!priceId) return rsp(400, { error: 'missing_price_id' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      subscription_data: trialPeriodDays ? { trial_period_days: trialPeriodDays } : undefined,
      success_url: successUrl ?? `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl ?? `${process.env.APP_URL}/cancelled`,
      allow_promotion_codes: true,
    });

    return rsp(200, { id: session.id, url: session.url });
  } catch (err: any) {
    console.error('checkout error', err);
    return rsp(500, { error: err.message || 'internal_error' });
  }
};
