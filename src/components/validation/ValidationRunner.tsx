import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Copy, Download, Play } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

type TestHistoryEntry = {
  timestamp: string
  title: string
  payload: any
  ok: boolean
  status: number
  response: any
}

export default function ValidationRunner() {
  const { toast } = useToast()
  const [overrideUrl, setOverrideUrl] = useState<string>('')
  const [payloadText, setPayloadText] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [history, setHistory] = useState<TestHistoryEntry[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [consoleLines, setConsoleLines] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('response')

  useEffect(() => {
    const saved = localStorage.getItem('sequence_test_history')
    if (saved) {
      try { setHistory(JSON.parse(saved)) } catch (e) { setHistory([]) }
    }
    const savedPresets = localStorage.getItem('sequence_test_presets')
    if (savedPresets) {
      try { setPresets(JSON.parse(savedPresets)) } catch (e) { setPresets([]) }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sequence_test_history', JSON.stringify(history.slice(0,20)))
  }, [history])

  useEffect(() => {
    localStorage.setItem('sequence_test_presets', JSON.stringify(presets.slice(0,20)))
  }, [presets])

  const builtInPresets = [
    { id: 'builtin_valid', label: 'Demo - Valid Email Step', payload: { campaign_id: 'camp_demo_1', sequence_type: 'email', step_number: 1, content: 'Hello {{contact_name}}, quick question about {{company_name}}', subject_line: 'Quick question', delay_days: 0 } },
    { id: 'builtin_invalid_campaign', label: 'Demo - Invalid Campaign', payload: { campaign_id: 'nonexistent', sequence_type: 'email', step_number: 1, content: 'This will fail campaign check', subject_line: 'Invalid campaign', delay_days: 0 } },
    { id: 'builtin_malformed', label: 'Demo - Malformed Payload', payload: { campaign_id: 'camp_demo_1', sequence_type: 'email', step_number: 'not_a_number', content: '', subject_line: '', delay_days: -1 } }
  ]

  const pushConsole = (line: string) => {
    setConsoleLines(prev => [line, ...prev].slice(0,200))
  }

  const runTest = async (payload: any) => {
    setIsRunning(true)
    const base = overrideUrl ? overrideUrl.replace(/\/$/, '') : 'https://68hyt0cq--validate-sequence.functions.blink.new' // default endpoint; override with FUNCTION_BASE_URL for local testing

    pushConsole(`[${new Date().toLocaleTimeString()}] Sending request to ${base}/validate-sequence`)
    pushConsole(`Payload: ${JSON.stringify(payload)}`)

    try {
      const res = await fetch(`${base}/validate-sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const text = await res.text()
      let parsed: any = null
      try { parsed = text ? JSON.parse(text) : null } catch (e) { parsed = text }

      const entry: TestHistoryEntry = {
        timestamp: new Date().toISOString(),
        title: payload?.campaign_id || payload?.title || 'Test',
        payload,
        ok: res.ok,
        status: res.status,
        response: parsed
      }

      setHistory(prev => [entry, ...prev].slice(0,20))
      setSelectedIndex(0)

      pushConsole(`[${new Date().toLocaleTimeString()}] Response HTTP ${res.status}`)
      pushConsole(`Response body: ${JSON.stringify(parsed)}`)

      toast({ title: res.ok ? 'Validation success' : 'Validation failed', description: `HTTP ${res.status}` })
    } catch (err: any) {
      const errStr = String(err)
      pushConsole(`[${new Date().toLocaleTimeString()}] Network error: ${errStr}`)
      toast({ title: 'Network error', description: errStr, variant: 'destructive' })
      const entry: TestHistoryEntry = {
        timestamp: new Date().toISOString(),
        title: payload?.campaign_id || 'Test',
        payload,
        ok: false,
        status: 0,
        response: String(err)
      }
      setHistory(prev => [entry, ...prev].slice(0,20))
      setSelectedIndex(0)
    } finally {
      setIsRunning(false)
    }
  }

  const handleRunFromTextarea = async () => {
    try {
      const parsed = payloadText ? JSON.parse(payloadText) : null
      await runTest(parsed)
    } catch (e:any) {
      toast({ title: 'Invalid JSON', description: String(e), variant: 'destructive' })
    }
  }

  const selected = history[selectedIndex]

  const getSanitizedFromResponse = (resp: any) => {
    if (!resp) return null
    // Try common fields
    return resp.sanitizedPayload || resp.sanitized || resp.normalized || resp.payload || resp.data || null
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 space-y-2">
          <label className="text-sm font-medium">Function Base URL (override)</label>
          <Input value={overrideUrl} onChange={(e) => setOverrideUrl(e.target.value)} placeholder="https://localhost:8000 or production URL" />
          <p className="text-xs text-gray-500">Optional. If set, used as base for /validate-sequence</p>

          <div className="mt-3">
            <label className="text-sm font-medium">Quick Presets</label>
            <div className="space-y-2 mt-2">
              {builtInPresets.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm">{p.label}</div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setPayloadText(JSON.stringify(p.payload, null, 2)) }}>
                      Load
                    </Button>
                    <Button size="sm" onClick={() => runTest(p.payload)}>
                      <Play className="w-4 h-4 mr-1" /> Run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-2">
          <label className="text-sm font-medium">Preset Tests</label>
          <Select onValueChange={(value) => { setSelectedPreset(value); const parsed = JSON.parse(value); setPayloadText(JSON.stringify(parsed, null, 2)) }}>
            <SelectTrigger>
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              {builtInPresets.map(p => <SelectItem key={p.id} value={JSON.stringify(p.payload)}>{p.label}</SelectItem>)}
              {presets.map((p:any) => <SelectItem key={p.id} value={JSON.stringify(p.payload)}>{p.name || p.id}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="mt-3">
            <label className="text-sm font-medium">Manual JSON Payload</label>
            <Textarea rows={6} value={payloadText} onChange={(e) => setPayloadText(e.target.value)} placeholder='{"campaign_id":"camp_demo_1","sequence_type":"email","step_number":1,"content":"Hello"}' />
            <div className="flex items-center space-x-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => {
                try {
                  const parsed = payloadText ? JSON.parse(payloadText) : null
                  const name = prompt('Preset name (e.g. My Valid Test)')
                  if (!name) return
                  const list = [ { id: `preset_${Date.now()}`, name, payload: parsed }, ...presets ]
                  setPresets(list.slice(0,20))
                  toast({ title: 'Preset saved', description: `Saved preset "${name}"` })
                } catch (e) {
                  toast({ title: 'Save failed', description: 'Ensure JSON is valid before saving preset', variant: 'destructive' })
                }
              }}>Save Preset</Button>

              <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem('sequence_test_history'); setHistory([]); toast({ title: 'Cleared history' }) }}>Clear History</Button>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-2">
          <label className="text-sm font-medium">Actions</label>
          <div className="flex flex-col gap-2">
            <Button onClick={() => {
              try {
                const payload = payloadText ? JSON.parse(payloadText) : { campaign_id: 'camp_demo_1', sequence_type: 'email', step_number: 1, content: 'Hello {{contact_name}}', subject_line: 'Quick question', delay_days: 0 }
                setPayloadText(JSON.stringify(payload, null, 2))
                toast({ title: 'Payload loaded' })
              } catch (e:any) {
                toast({ title: 'Invalid JSON', description: String(e), variant: 'destructive' })
              }
            }} variant="outline">Load Payload</Button>

            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleRunFromTextarea} disabled={isRunning}>{isRunning ? 'Running...' : <><Play className="w-4 h-4 mr-2"/> Run Test</>}</Button>

            <Button variant="ghost" onClick={() => {
              // copy current payload text
              try {
                navigator.clipboard.writeText(payloadText)
                toast({ title: 'Payload copied' })
              } catch (e) {
                toast({ title: 'Copy failed', variant: 'destructive' })
              }
            }}>Copy Payload</Button>

            <div className="mt-4">
              <h4 className="font-medium mb-2">History (click an item to inspect)</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {history.map((r, i) => (
                  <div key={i} onClick={() => { setSelectedIndex(i); setActiveTab('response') }} className={`p-2 rounded border cursor-pointer ${i === selectedIndex ? 'ring-2 ring-indigo-300' : ''} ${r.ok ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{r.title || r.payload?.campaign_id || 'Test'}</div>
                        <div className="text-xs text-gray-600">{new Date(r.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="text-xs font-medium">{r.ok ? 'OK' : 'FAIL'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
            <TabsList>
              <TabsTrigger value="response">Response</TabsTrigger>
              <TabsTrigger value="sanitized">Sanitized Payload</TabsTrigger>
              <TabsTrigger value="errors">Error Log</TabsTrigger>
              <TabsTrigger value="console">Console</TabsTrigger>
            </TabsList>

            <TabsContent value="response">
              <div className="p-3 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Raw Response</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(JSON.stringify(selected?.response, null, 2) || '') }}><Copy className="w-4 h-4 mr-1"/> Copy</Button>
                    <Button size="sm" variant="ghost" onClick={() => { const blob = new Blob([JSON.stringify(selected?.response, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${(selected?.title || 'test').replace(/\s+/g, '_')}_response.json`; a.click(); URL.revokeObjectURL(url); }}><Download className="w-4 h-4 mr-1"/> Download</Button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap max-h-80 overflow-y-auto">{JSON.stringify(selected?.response, null, 2)}</pre>
              </div>
            </TabsContent>

            <TabsContent value="sanitized">
              <div className="p-3 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Sanitized / Normalized Payload</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { const sanitized = getSanitizedFromResponse(selected?.response); navigator.clipboard.writeText(JSON.stringify(sanitized, null, 2) || '') }}><Copy className="w-4 h-4 mr-1"/> Copy</Button>
                    <Button size="sm" variant="ghost" onClick={() => { const sanitized = getSanitizedFromResponse(selected?.response); const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${(selected?.title || 'test').replace(/\s+/g, '_')}_sanitized.json`; a.click(); URL.revokeObjectURL(url); }}><Download className="w-4 h-4 mr-1"/> Download</Button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap max-h-80 overflow-y-auto">{JSON.stringify(getSanitizedFromResponse(selected?.response), null, 2)}</pre>
              </div>
            </TabsContent>

            <TabsContent value="errors">
              <div className="p-3 border rounded bg-white">
                <div className="text-sm font-medium mb-2">Error Log</div>
                <pre className="text-xs whitespace-pre-wrap max-h-80 overflow-y-auto">{JSON.stringify(selected?.response?.errors || selected?.response?.error || selected?.response || null, null, 2)}</pre>
              </div>
            </TabsContent>

            <TabsContent value="console">
              <div className="p-3 border rounded bg-black text-white">
                <div className="text-sm font-medium mb-2">Live Console</div>
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {consoleLines.map((line, i) => (
                    <div key={i} className="text-xs font-mono">{line}</div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <h4 className="font-medium mb-2">Selected Payload</h4>
          <div className="border rounded bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">Payload JSON</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(JSON.stringify(selected?.payload, null, 2) || '') }}><Copy className="w-4 h-4 mr-1"/> Copy</Button>
                <Button size="sm" variant="ghost" onClick={() => { const blob = new Blob([JSON.stringify(selected?.payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${(selected?.title || 'test').replace(/\s+/g, '_')}_payload.json`; a.click(); URL.revokeObjectURL(url); }}><Download className="w-4 h-4 mr-1"/> Download</Button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">{JSON.stringify(selected?.payload, null, 2)}</pre>
          </div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Actions</h4>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => {
                if (!selected) return
                setPayloadText(JSON.stringify(selected.payload, null, 2))
                toast({ title: 'Loaded payload into editor' })
              }}>Load into editor</Button>

              <Button variant="ghost" onClick={() => {
                if (!selected) return
                const sanitized = getSanitizedFromResponse(selected.response)
                const payloadToCopy = sanitized || selected.payload
                navigator.clipboard.writeText(JSON.stringify(payloadToCopy, null, 2))
                toast({ title: 'Copied sanitized payload' })
              }}>Copy Sanitized</Button>

              <Button variant="ghost" onClick={() => {
                if (!selected) return
                // Re-run using selected payload
                runTest(selected.payload)
              }}>Re-run Test</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
