import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig =
    (event.headers['stripe-signature'] as string) ||
    (event.headers['Stripe-Signature'] as unknown as string);

  if (!sig || !webhookSecret) {
    return { statusCode: 400, body: 'Missing signature or secret' };
  }

  try {
    const rawBody = event.body as string; // Netlify provides raw string
    const stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        console.log('checkout.session.completed', session.id);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        console.log(`subscription event: ${stripeEvent.type}`, sub.id, sub.status);
        break;
      }
      default:
        console.log(`Unhandled event type ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err: any) {
    console.error('Webhook signature verification failed', err);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
};
