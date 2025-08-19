import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const plan = (body.plan as string) || "starter";

  const price =
    plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_STARTER;

  if (!price) return { statusCode: 500, body: "Missing price id" };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${process.env.APP_BASE_URL || "https://svara.tech"}/app?checkout=success`,
    cancel_url: `${process.env.APP_BASE_URL || "https://svara.tech"}/pricing?checkout=cancel`,
  });

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: session.url }),
  };
};
