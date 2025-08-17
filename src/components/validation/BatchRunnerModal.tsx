import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type BatchResult = {
  index: number
  ok: boolean
  status: number
  response: any
  payload: any
}

export default function BatchRunnerModal({ onComplete }: { onComplete: (results: BatchResult[]) => void }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<BatchResult[]>([])
  const { toast } = useToast()

  const runBatch = async () => {
    // parse newline-separated JSON
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { toast({ title: 'No payloads detected' }); return }

    setIsRunning(true)
    const resArr: BatchResult[] = []
    for (let i = 0; i < lines.length; i++) {
      let payload: any = null
      try { payload = JSON.parse(lines[i]) } catch (e) {
        resArr.push({ index: i, ok: false, status: 0, response: `Invalid JSON at line ${i+1}`, payload: lines[i] })
        continue
      }

      try {
        const base = 'https://68hyt0cq--validate-sequence.functions.blink.new' // default; consider overriding with FUNCTION_BASE_URL for local testing
        const resp = await fetch(`${base}/validate-sequence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const text = await resp.text()
        let parsed:any = null
        try { parsed = text ? JSON.parse(text) : null } catch (e) { parsed = text }
        resArr.push({ index: i, ok: resp.ok, status: resp.status, response: parsed, payload })
      } catch (err:any) {
        resArr.push({ index: i, ok: false, status: 0, response: String(err), payload })
      }
    }

    setResults(resArr)
    setIsRunning(false)
    onComplete(resArr)
    toast({ title: 'Batch run complete', description: `${resArr.length} tests executed` })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Batch Runner</Button>
      </DialogTrigger>
      <DialogContent>
        <h3 className="text-lg font-medium mb-2">Batch Test Runner</h3>
        <p className="text-sm text-gray-600 mb-2">Paste newline-separated JSON payloads (one per line) or multiple payloads separated by blank line.</p>
        <Textarea rows={8} value={input} onChange={(e) => setInput(e.target.value)} placeholder='{"campaign_id":"camp1","sequence_type":"email"}\n{"campaign_id":"camp2","sequence_type":"email"}' />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={runBatch} disabled={isRunning}>{isRunning ? 'Running...' : 'Run Batch'}</Button>
        </div>

        {results.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium">Results</h4>
            <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
              {results.map(r => (
                <div key={r.index} className={`p-2 rounded border ${r.ok ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Test #{r.index+1}</div>
                    <div className="text-xs">{r.ok ? 'OK' : 'FAIL'} • {r.status}</div>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify(r.response, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
