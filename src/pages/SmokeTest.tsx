import React, { useState } from 'react'
import { blink } from '@/blink/client'
import { validateSequence } from '@/services/validateSequenceService'

export default function SmokeTest() {
  const [status, setStatus] = useState<string>('idle')
  const [message, setMessage] = useState('')

  const runSmoke = async () => {
    setStatus('running')
    setMessage('Creating product...')

    try {
      // 1. Create product
      const user = await blink.auth.me()
      const product = await blink.db.products.create({
        userId: user.id,
        name: 'Smoke product ' + Date.now(),
        description: 'Auto-created smoke test product',
      })

      setMessage('Creating campaign...')
      const campaign = await blink.db.campaigns.create({
        userId: user.id,
        productId: product.id,
        name: 'Smoke campaign ' + Date.now(),
        description: 'Auto-created smoke test campaign',
        targetCriteria: '{}'
      })

      setMessage('Generating AI sequence...')
      const seqPayload = {
        campaign_id: campaign.id,
        sequence_type: 'email',
        step_number: 1,
        subject_line: 'Hello from smoke test',
        content: 'This is a smoke test content',
      }

      // 4. Call AI generator (simulate via validateSequence for now)
      const res = await validateSequence(seqPayload)
      if (!res.ok) throw new Error('Validate sequence failed: ' + (res.raw || res.status))

      setMessage('All core flows completed successfully')
      setStatus('success')
    } catch (err: any) {
      console.error('smoke test failed', err)
      setMessage(String(err?.message || err))
      setStatus('failed')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Production Smoke Test</h2>
      <p className="mb-4 text-sm text-muted-foreground">Runs a minimal end-to-end test of core flows (product → campaign → sequence validation).</p>

      <div className="mb-4">
        <button onClick={runSmoke} className="px-4 py-2 bg-indigo-600 text-white rounded">Run Smoke Test</button>
      </div>

      <div className="p-4 border rounded">
        <div>Status: <strong>{status}</strong></div>
        <div className="mt-2 text-sm text-gray-700">{message}</div>
      </div>
    </div>
  )
}
