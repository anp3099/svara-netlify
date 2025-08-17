import type { Handler } from '@netlify/functions'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20'
})

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const {
      priceId,
      customerEmail,
      trialPeriodDays,
      successUrl,
      cancelUrl
    } = body

    if (!priceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'missing_price_id' })
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL}/app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/pricing`,
      customer_email: customerEmail,
      subscription_data: trialPeriodDays ? { trial_period_days: trialPeriodDays } : undefined
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id, url: session.url })
    }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'server_error' }) }
  }
}
