import type { Handler } from '@netlify/functions'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  if (!webhookSecret) {
    return { statusCode: 500, body: 'Missing STRIPE_WEBHOOK_SECRET' }
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature']

  try {
    const payload = event.body || ''
    const stripeEvent = stripe.webhooks.constructEvent(payload, sig as string, webhookSecret)

    switch (stripeEvent.type) {
      case 'checkout.session.completed':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // TODO: persist subscription state in your DB / Blink backend
        break
      default:
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) }
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err?.message || err)
    return { statusCode: 400, body: 'Bad signature' }
  }
}
