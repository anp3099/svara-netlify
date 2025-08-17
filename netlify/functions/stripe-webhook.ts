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
    const sig = event.headers['stripe-signature'] as string
    const secret = process.env.STRIPE_WEBHOOK_SECRET as string

    if (!sig || !secret) {
      return { statusCode: 400, body: 'Missing webhook signature/secret' }
    }

    const body = event.body ?? ''
    const typedBody = typeof body === 'string' ? body : JSON.stringify(body)

    const stripeEvent = stripe.webhooks.constructEvent(typedBody, sig, secret)

    // TODO: add your handling per event type
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        // handle subscription start
        break
      case 'invoice.payment_succeeded':
        // handle recurring payment success
        break
      default:
        break
    }

    return { statusCode: 200, body: 'ok' }
  } catch (err: any) {
    return { statusCode: 400, body: `Webhook error: ${err?.message || 'invalid'}` }
  }
}
