export async function startCheckout(opts: {
  priceId: string
  email?: string
  trialPeriodDays?: number
  successUrl?: string
  cancelUrl?: string
}) {
  const r = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: opts.priceId,
      customerEmail: opts.email,
      trialPeriodDays: opts.trialPeriodDays,
      successUrl: opts.successUrl,
      cancelUrl: opts.cancelUrl,
    }),
  })
  if (!r.ok) throw new Error('Checkout failed')
  const { url } = await r.json()
  window.location.href = url
}