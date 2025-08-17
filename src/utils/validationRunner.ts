export type TestHistoryEntry = {
  timestamp: string
  title: string
  payload: any
  ok: boolean
  status: number
  response: any
}

export const loadTestHistory = (key = 'sequence_test_history'): TestHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw) as TestHistoryEntry[]
  } catch (e) {
    console.warn('Failed to load test history', e)
    return []
  }
}

export const saveTestHistory = (entries: TestHistoryEntry[], key = 'sequence_test_history') => {
  try {
    localStorage.setItem(key, JSON.stringify(entries.slice(0,20)))
  } catch (e) {
    console.warn('Failed to save test history', e)
  }
}

export const loadPresets = (key = 'sequence_test_presets') => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to load presets', e)
    return []
  }
}

export const savePresets = (presets: any[], key = 'sequence_test_presets') => {
  try {
    localStorage.setItem(key, JSON.stringify(presets.slice(0,20)))
  } catch (e) {
    console.warn('Failed to save presets', e)
  }
}
