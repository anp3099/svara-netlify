import type { Handler } from '@netlify/functions'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const { priceId, customerEmail, trialPeriodDays, successUrl, cancelUrl } = body

    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'missing_price_id' }) }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      allow_promotion_codes: true,
      subscription_data: trialPeriodDays ? { trial_period_days: trialPeriodDays } : undefined,
      success_url: successUrl ?? `${process.env.APP_URL}/dashboard?success=true`,
      cancel_url:  cancelUrl  ?? `${process.env.APP_URL}/pricing`,
    })

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: session.id, url: session.url, status: session.status }),
    }
  } catch (err) {
    console.error('checkout failed', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'checkout_failed' }) }
  }
}
