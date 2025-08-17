import React, { useState, useEffect } from 'react'
import { Wand2, Mail, MessageSquare, Linkedin, Plus, Edit, Trash2, Copy, Bug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { blink } from '@/blink/client'
import { planRestrictionService } from '@/services/planRestrictions'
import { safeToUpper, safeCapitalize } from '@/lib/utils'
import { ensureCampaignExists } from '@/services/leadDatabase'
import { useToast } from '@/hooks/use-toast'
import { createSafeErrorLogPayload, generateUniqueId, safeParseJSON } from '@/utils/errorMapping'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { createTestAutomation, TestSuite, TestStep, PRESET_TEST_CONFIGS } from '@/utils/testAutomation'

const ValidationRunner = React.lazy(() => import('@/components/validation/ValidationRunner'))

interface AISequence {
  id: string
  campaign_id: string
  campaign_name: string
  sequence_type: string
  step_number: number
  subject_line: string
  content: string
  delay_days: number
  is_ai_generated: boolean
  personalization_tags: string[]
}

interface Campaign {
  id: string
  name: string
  description: string
}

const sampleSequences: AISequence[] = [
  {
    id: 'seq_1',
    campaign_id: 'camp_demo_1',
    campaign_name: 'Enterprise SaaS Outreach',
    sequence_type: 'email',
    step_number: 1,
    subject_line: 'Quick question about {{company_name}}\'s sales automation',
    content: `Hi {{contact_name}},

I noticed {{company_name}} has been growing rapidly in the {{industry}} space. Congratulations on your recent success!

I'm reaching out because we've helped similar companies like yours increase their sales pipeline by 340% using AI-powered automation.

Would you be open to a brief 15-minute conversation about how we could help {{company_name}} scale even faster?

Best regards,
[Your Name]`,
    delay_days: 0,
    is_ai_generated: true,
    personalization_tags: ['contact_name', 'company_name', 'industry']
  }
]

const sampleCampaigns: Campaign[] = [
  { id: 'camp_demo_1', name: 'Enterprise SaaS Outreach', description: 'Target enterprise SaaS companies for sales automation' },
  { id: 'camp_demo_2', name: 'Agency Partnership Program', description: 'Partner with marketing agencies for white-label solutions' },
  { id: 'camp_demo_3', name: 'Consultant Outreach', description: 'Generate leads for consultants and coaches' }
]

export default function AISequences() {
  const [sequences, setSequences] = useState<AISequence[]>(sampleSequences)
  const [campaigns, setCampaigns] = useState<Campaign[]>(sampleCampaigns)
  const [selectedCampaign, setSelectedCampaign] = useState('all')
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSequence, setEditingSequence] = useState<AISequence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [generationSettings, setGenerationSettings] = useState({
    campaign_id: '',
    sequence_type: 'email',
    num_steps: 3,
    tone: 'professional',
    focus: 'value_proposition'
  })
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)
  const [debugLogs, setDebugLogs] = useState<Array<{
    timestamp: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    details?: any
  }>>([])
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null)
  const [isRunningFullTest, setIsRunningFullTest] = useState(false)
  const [testHistory, setTestHistory] = useState<TestSuite[]>([])
  const [showBatchTestModal, setShowBatchTestModal] = useState(false)

  const { toast } = useToast()

  const addDebugLog = (type: 'success' | 'error' | 'warning' | 'info', message: string, details?: any) => {
    const log = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    }
    setDebugLogs(prev => [log, ...prev.slice(0, 49)])
  }

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  // Load test history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('full_test_history')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        setTestHistory(Array.isArray(parsed) ? parsed.slice(0, 10) : [])
      } catch (e) {
        console.warn('Failed to parse test history:', e)
      }
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)

        const campaignsList = await blink.db.campaigns.list({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          limit: 50
        })

        if (campaignsList.length > 0) {
          const formattedCampaigns = campaignsList.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || ''
          }))
          setCampaigns(formattedCampaigns)
        }

        const sequencesList = await blink.db.ai_sequences.list({
          orderBy: { stepNumber: 'asc' },
          limit: 100
        })

        if (sequencesList.length > 0) {
          const formattedSequences = sequencesList.map(seq => {
            const campaignId = seq.campaign_id || seq.campaignId || ''
            const seqType = seq.sequence_type || seq.sequenceType || 'email'
            const stepNum = seq.step_number ?? seq.stepNumber ?? 1
            const subject = seq.subject_line || seq.subjectLine || ''
            const delay = seq.delay_days ?? seq.delayDays ?? 0
            const personalization = seq.personalization_tags || seq.personalizationTags || '[]'

            return {
              id: seq.id,
              campaign_id: campaignId,
              campaign_name: campaignsList.find(c => c.id === campaignId)?.name || 'Unknown Campaign',
              sequence_type: seqType,
              step_number: Number(stepNum),
              subject_line: subject,
              content: seq.content || '',
              delay_days: Number(delay),
              is_ai_generated: Boolean(Number(seq.is_ai_generated ?? seq.isAiGenerated ?? 0)),
              personalization_tags: safeParseJSON(personalization, [])
            }
          })
          setSequences(formattedSequences)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setError('Failed to load data from database. Showing sample data.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  const generateAISequence = async () => {
    const campaign = campaigns.find(c => c.id === generationSettings.campaign_id)
    if (!campaign) {
      alert('Please select a campaign first')
      return
    }

    if (user?.id) {
      const exists = await ensureCampaignExists(generationSettings.campaign_id, user.id)
      if (!exists) {
        toast({ title: 'Invalid campaign', description: 'Selected campaign does not exist or you do not have access.', variant: 'destructive' })
        addDebugLog('error', 'Campaign existence check failed', { campaignId: generationSettings.campaign_id })
        return
      }
    }

    if (user?.id) {
      const planCheck = await planRestrictionService.canCreateSequence(user.id)
      if (!planCheck.allowed) {
        alert(planCheck.message || 'Sequence limit reached for your current plan.')
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      const prompt = `Generate a ${generationSettings.num_steps}-step ${generationSettings.sequence_type} outreach sequence for "${campaign.name}".\n\nCampaign Description: ${campaign.description || 'Professional outreach campaign'}\nTone: ${generationSettings.tone}\nFocus: ${generationSettings.focus}\n\nRequirements:\n- Each step should have a compelling subject line (for emails) or opening message\n- Include personalization tags like {{contact_name}}, {{company_name}}, {{industry}}\n- Progressive follow-up strategy with increasing urgency/value\n- Professional but engaging tone\n- Clear call-to-action in each step\n\nFormat each step as:\nStep X:\nSubject: [Subject line here]\nContent: [Message content here]\n\nPlease provide exactly ${generationSettings.num_steps} distinct steps.`

      const { text } = await blink.ai.generateText({
        prompt,
        model: 'gpt-4o-mini',
        maxTokens: 2000
      })

      const steps = text.split(/Step \d+:/i).filter(step => step.trim())
      const newSequences: AISequence[] = []

      for (let i = 0; i < Math.min(steps.length, generationSettings.num_steps); i++) {
        const step = steps[i].trim()
        const subjectMatch = step.match(/Subject:\s*(.+?)(?:\n|Content:|$)/i)
        const contentMatch = step.match(/Content:\s*([\s\S]+?)(?:\n\nStep|\n\n$|$)/i)

        const subject = subjectMatch ? subjectMatch[1].trim() : `${generationSettings.sequence_type} Step ${i + 1}`
        const content = contentMatch ? contentMatch[1].trim() : step.replace(/Subject:.*?\n/i, '').trim()

        let sequenceId = generateUniqueId('seq')
        if (sequences.find(s => s.id === sequenceId)) {
          sequenceId = generateUniqueId('seq')
        }
        const sequencePayload = {
          id: sequenceId,
          campaign_id: generationSettings.campaign_id,
          sequence_type: generationSettings.sequence_type,
          step_number: i + 1,
          subject_line: subject,
          content: content || `AI-generated ${generationSettings.sequence_type} content for step ${i + 1}`,
          delay_days: i === 0 ? 0 : (i * 3),
          is_ai_generated: 1,
          personalization_tags: ['contact_name', 'company_name', 'industry']
        }

        if (user?.id) {
          try {
            addDebugLog('info', `Validating sequence step ${i + 1}`, { sequenceId, campaignId: generationSettings.campaign_id })

            const VALIDATE_URL = (typeof FUNCTION_BASE_URL !== 'undefined' && FUNCTION_BASE_URL) ? `${FUNCTION_BASE_URL}/validate-sequence` : 'https://68hyt0cq--validate-sequence.functions.blink.new'
            const validateResponse = await fetch(VALIDATE_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sequencePayload)
            })

            const validateText = await validateResponse.text()
            let validateResult: any = null
            try {
              validateResult = validateText ? JSON.parse(validateText) : null
            } catch (parseErr) {
              console.warn('validate-sequence returned non-JSON response:', validateText, parseErr)
              addDebugLog('warning', 'Non-JSON response from validation endpoint', { response: validateText, error: parseErr })
              validateResult = { error: 'Non-JSON response from validation endpoint', details: validateText }
            }

            if (!validateResponse.ok) {
              console.warn('Validation failed:', validateResult)
              const details = Array.isArray(validateResult.details) ? validateResult.details.join(', ') : (typeof validateResult.details === 'string' ? validateResult.details : JSON.stringify(validateResult.details || {}))

              addDebugLog('error', `Validation failed for step ${i + 1}`, {
                status: validateResponse.status,
                error: validateResult.error,
                details: validateResult.details
              })

              toast({
                title: 'Validation failed',
                description: details || validateResult.error || 'Validation error',
                variant: 'destructive'
              })

              try {
                const safeDetails = Array.isArray(validateResult.details) ? validateResult.details : [validateResult.details]
                const errorPayload = createSafeErrorLogPayload({
                  userId: user.id,
                  operation: 'validate_ai_sequence',
                  errorType: 'validation_error',
                  message: validateResult.error || 'Sequence validation failed',
                  context: { sequenceId, campaignId: generationSettings.campaign_id, validationErrors: safeDetails }
                })
                await blink.db.error_logs.create(errorPayload)
              } catch (logErr) {
                console.error('Failed to log validation error:', logErr)
                addDebugLog('error', 'Failed to log validation error', logErr)
              }
              continue
            }

            if (!validateResult || typeof validateResult !== 'object') {
              addDebugLog('error', 'Invalid validation response structure', validateResult)
              toast({ title: 'Validation failed', description: 'Unexpected validation response from server.', variant: 'destructive' })
              continue
            }

            const validatedData = validateResult.validated_data || sequencePayload
            addDebugLog('success', `Validation successful for step ${i + 1}`, { validatedId: validatedData.id })

            try {
              const safeCreatePayload: any = {
                id: String(validatedData.id),
                campaign_id: String(validatedData.campaign_id),
                sequence_type: String(validatedData.sequence_type),
                step_number: String(validatedData.step_number),
                subject_line: String(validatedData.subject_line).slice(0, 500),
                content: String(validatedData.content).slice(0, 4000),
                delay_days: String(Number(validatedData.delay_days)),
                is_ai_generated: String(validatedData.is_ai_generated || '1'),
                personalization_tags: String(validatedData.personalization_tags || '[]')
              }

              await blink.db.ai_sequences.create(safeCreatePayload)
              addDebugLog('success', `Successfully created sequence step ${i + 1}`, { sequenceId: validatedData.id })
              console.debug('Successfully created sequence:', validatedData.id)
            } catch (createErr) {
              console.warn('Create failed, attempting upsert:', createErr)
              addDebugLog('warning', `Create failed for step ${i + 1}, attempting upsert`, createErr)

              const safeUpsertPayload: any = {
                id: String(validatedData.id),
                campaign_id: String(validatedData.campaign_id),
                sequence_type: String(validatedData.sequence_type),
                step_number: String(validatedData.step_number),
                subject_line: String(validatedData.subject_line).slice(0, 500),
                content: String(validatedData.content).slice(0, 4000),
                delay_days: String(Number(validatedData.delay_days)),
                is_ai_generated: String(validatedData.is_ai_generated || '1'),
                personalization_tags: String(validatedData.personalization_tags || '[]')
              }

              try {
                await blink.db.ai_sequences.upsertMany([safeUpsertPayload])
                addDebugLog('success', `Upsert successful for step ${i + 1}`, { sequenceId: validatedData.id })
              } catch (upsertErr) {
                console.error('Upsert also failed:', upsertErr)
                addDebugLog('error', `Both create and upsert failed for step ${i + 1}`, upsertErr)

                toast({
                  title: 'Save failed',
                  description: 'Could not save sequence. Please contact support.',
                  variant: 'destructive'
                })

                try {
                  const errorPayload = createSafeErrorLogPayload({
                    userId: user.id,
                    operation: 'create_ai_sequence',
                    errorType: 'data_conflict_error',
                    message: upsertErr,
                    context: { sequenceId: validatedData.id, campaignId: generationSettings.campaign_id }
                  })
                  await blink.db.error_logs.create(errorPayload)
                } catch (logErr) {
                  console.error('Failed to log database error:', logErr)
                  addDebugLog('error', 'Failed to log database error', logErr)
                }
                continue
              }
            }
          } catch (networkErr) {
            console.error('Network error during validation:', networkErr)
            addDebugLog('error', `Network error during validation for step ${i + 1}`, networkErr)

            toast({
              title: 'Network error',
              description: 'Unable to validate sequence. Please try again.',
              variant: 'destructive'
            })

            try {
              const errorPayload = createSafeErrorLogPayload({
                userId: user.id,
                operation: 'validate_ai_sequence',
                errorType: 'network_error',
                message: networkErr?.message || String(networkErr),
                context: { sequenceId, campaignId: generationSettings.campaign_id }
              })
              await blink.db.error_logs.create(errorPayload)
            } catch (logErr) {
              console.error('Failed to log network error:', logErr)
              addDebugLog('error', 'Failed to log network error', logErr)
            }
            continue
          }
        }

        const newSequence: AISequence = {
          id: sequenceId,
          campaign_id: generationSettings.campaign_id,
          campaign_name: campaign.name,
          sequence_type: generationSettings.sequence_type,
          step_number: i + 1,
          subject_line: subject,
          content: content || `AI-generated ${generationSettings.sequence_type} content for step ${i + 1}`,
          delay_days: i === 0 ? 0 : (i * 3),
          is_ai_generated: true,
          personalization_tags: ['contact_name', 'company_name', 'industry']
        }

        newSequences.push(newSequence)
      }

      setSequences(prev => [...prev, ...newSequences])
      setIsGenerateDialogOpen(false)
      alert(`Successfully generated ${newSequences.length} AI sequences!`)
    } catch (error) {
      console.error('Failed to generate AI sequence:', error)
      setError('Failed to generate AI sequence. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const runFullRegressionTest = async () => {
    if (!user?.id) {
      toast({ title: 'Authentication required', description: 'Please sign in to run the full regression test.', variant: 'destructive' })
      return
    }

    setIsRunningFullTest(true)
    setTestSuite(null)

    try {
      const testAutomation = createTestAutomation(addDebugLog)
      testAutomation.setUserId(user.id)

      addDebugLog('info', 'Starting full regression test', { userId: user.id })
      
      const suite = await testAutomation.runFullRegressionTest()
      setTestSuite(suite)

      // Save to history
      const newHistory = [suite, ...testHistory.slice(0, 9)]
      setTestHistory(newHistory)
      localStorage.setItem('full_test_history', JSON.stringify(newHistory))

      if (suite.status === 'completed') {
        toast({ 
          title: 'Full regression test completed', 
          description: `All ${suite.completedSteps} steps completed successfully in ${Math.round((suite.duration || 0) / 1000)}s` 
        })
      } else {
        toast({ 
          title: 'Full regression test failed', 
          description: `${suite.failedSteps} steps failed. Check debug logs for details.`, 
          variant: 'destructive' 
        })
      }
    } catch (error) {
      addDebugLog('error', 'Full regression test error', error)
      toast({ 
        title: 'Test execution failed', 
        description: 'An error occurred while running the full regression test.', 
        variant: 'destructive' 
      })
    } finally {
      setIsRunningFullTest(false)
    }
  }

  const runBatchTests = async () => {
    if (!user?.id) {
      toast({ title: 'Authentication required', description: 'Please sign in to run batch tests.', variant: 'destructive' })
      return
    }

    setShowBatchTestModal(false)
    setIsRunningFullTest(true)

    try {
      const testAutomation = createTestAutomation(addDebugLog)
      testAutomation.setUserId(user.id)

      addDebugLog('info', 'Starting batch test run', { configCount: PRESET_TEST_CONFIGS.length })
      
      const results = await testAutomation.runBatchTests(PRESET_TEST_CONFIGS)
      
      // Save all results to history
      const newHistory = [...results, ...testHistory].slice(0, 20)
      setTestHistory(newHistory)
      localStorage.setItem('full_test_history', JSON.stringify(newHistory))

      const successCount = results.filter(r => r.status === 'completed').length
      const failCount = results.filter(r => r.status === 'failed').length

      toast({ 
        title: 'Batch tests completed', 
        description: `${successCount} passed, ${failCount} failed out of ${results.length} total tests` 
      })
    } catch (error) {
      addDebugLog('error', 'Batch test execution error', error)
      toast({ 
        title: 'Batch test failed', 
        description: 'An error occurred while running batch tests.', 
        variant: 'destructive' 
      })
    } finally {
      setIsRunningFullTest(false)
    }
  }

  const runValidationTest = async (payload: any) => {
    if (!payload) {
      addDebugLog('error', 'Empty payload provided to test runner')
      toast({ title: 'Empty payload', description: 'Provide a JSON payload to run the test.', variant: 'destructive' })
      return
    }

    addDebugLog('info', 'Running validation test', payload)

    const override = (window as any).__FUNCTION_BASE_URL_OVERRIDE || (typeof FUNCTION_BASE_URL !== 'undefined' ? (FUNCTION_BASE_URL as any) : undefined)
    const baseUrl = override ? String(override).replace(/\/$/, '') : 'https://68hyt0cq--validate-sequence.functions.blink.new'

    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const text = await res.text()
      let parsed: any = null
      try { parsed = text ? JSON.parse(text) : null } catch (e) { parsed = null }

      let safeParsed: any = parsed
      // Sanitize parsed to ensure it's JSON-serializable and not too large
      try {
        if (parsed && typeof parsed === 'object') {
          // Remove circular refs and functions
          safeParsed = JSON.parse(JSON.stringify(parsed))
        }
      } catch (sanitizeErr) {
        safeParsed = { note: 'Could not fully parse response', raw: String(parsed) }
      }

      const entry = {
        timestamp: new Date().toISOString(),
        title: payload?.campaign_id || payload?.title || 'Test',
        payload,
        ok: res.ok,
        status: res.status,
        response: safeParsed ?? text
      }

      const history = JSON.parse(localStorage.getItem('sequence_test_history') || '[]') as any[]
      history.unshift(entry)
      localStorage.setItem('sequence_test_history', JSON.stringify(history.slice(0, 20)))

      addDebugLog(res.ok ? 'success' : 'error', `Validation ${res.ok ? 'succeeded' : 'failed'} (status ${res.status})`, safeParsed ?? text)

      if (!res.ok) {
        toast({ title: 'Validation failed', description: (safeParsed && (safeParsed.error || safeParsed.details)) ? (safeParsed.error || JSON.stringify(safeParsed.details)) : 'See debug logs for details', variant: 'destructive' })
        // Attempt to log to DB for authenticated users
        if (user?.id) {
          try {
            const errPayload = createSafeErrorLogPayload({
              userId: user.id,
              operation: 'test_validate_sequence',
              errorType: 'validation_error',
              message: safeParsed?.error || text,
              context: { payload, response: safeParsed ?? text }
            })
            await blink.db.error_logs.create(errPayload)
          } catch (logErr) {
            console.error('Failed to write test error log:', logErr)
            addDebugLog('error', 'Failed to persist test error log', logErr)
          }
        }
      } else {
        toast({ title: 'Validation success', description: 'Validation endpoint returned OK.' })
      }
    } catch (err) {
      console.error('Network error during test:', err)
      addDebugLog('error', 'Network error during validation test', String(err))
      toast({ title: 'Network error', description: 'Unable to reach validation endpoint.', variant: 'destructive' })

      const history = JSON.parse(localStorage.getItem('sequence_test_history') || '[]') as any[]
      history.unshift({ timestamp: new Date().toISOString(), title: payload.campaign_id || 'Test', payload, ok: false, status: 0, response: String(err) })
      localStorage.setItem('sequence_test_history', JSON.stringify(history.slice(0, 20)))
    }
  }

  const editSequence = async (updatedSequence: AISequence) => {
    try {
      if (user?.id) {
        try {
          await blink.db.ai_sequences.update(updatedSequence.id, {
            subject_line: updatedSequence.subject_line,
            content: updatedSequence.content,
            delay_days: updatedSequence.delay_days,
            personalization_tags: JSON.stringify(updatedSequence.personalization_tags)
          })
        } catch (updateErr) {
          console.error('Update failed:', updateErr)
          toast({ title: 'Update failed', description: 'Unable to update sequence in database.' })
          try {
            const errorPayload = createSafeErrorLogPayload({
              userId: user.id,
              operation: 'update_ai_sequence',
              errorType: 'data_conflict_error',
              message: updateErr,
              context: { sequenceId: updatedSequence.id }
            })
            await blink.db.error_logs.create(errorPayload)
          } catch (e) { console.error('Failed to write error_log:', e) }
        }
      }

      setSequences(prev => prev.map(seq => 
        seq.id === updatedSequence.id ? updatedSequence : seq
      ))
      setIsEditDialogOpen(false)
      setEditingSequence(null)
    } catch (error) {
      console.error('Failed to update sequence:', error)
      setError('Failed to update sequence. Please try again.')
    }
  }

  const deleteSequence = async (sequenceId: string) => {
    try {
      if (user?.id) {
        try {
          await blink.db.ai_sequences.delete(sequenceId)
        } catch (delErr) {
          console.error('Delete failed:', delErr)
          toast({ title: 'Delete failed', description: 'Unable to delete sequence from database.' })
          try {
            const errorPayload = createSafeErrorLogPayload({
              userId: user.id,
              operation: 'delete_ai_sequence',
              errorType: 'data_conflict_error',
              message: delErr,
              context: { sequenceId }
            })
            await blink.db.error_logs.create(errorPayload)
          } catch (e) { console.error('Failed to write error_log:', e) }
        }
      }

      setSequences(prev => prev.filter(seq => seq.id !== sequenceId))
    } catch (error) {
      console.error('Failed to delete sequence:', error)
      setError('Failed to delete sequence. Please try again.')
    }
  }

  const duplicateSequence = async (sequence: AISequence) => {
    try {
      const newSequenceId = generateUniqueId('seq')
      const newSequence = {
        ...sequence,
        id: newSequenceId,
        subject_line: `${sequence.subject_line} (Copy)`,
        is_ai_generated: false
      }

      if (user?.id) {
        try {
          const campaignExists = await ensureCampaignExists(sequence.campaign_id, user.id)
          if (!campaignExists) {
            toast({ title: 'Duplicate failed', description: `Campaign ${sequence.campaign_id} not found.` })
          } else {
            await blink.db.ai_sequences.create({
              id: newSequenceId,
              campaign_id: sequence.campaign_id,
              sequence_type: sequence.sequence_type,
              step_number: sequence.step_number,
              subject_line: newSequence.subject_line,
              content: sequence.content,
              delay_days: sequence.delay_days,
              is_ai_generated: 0,
              personalization_tags: JSON.stringify(sequence.personalization_tags)
            })
          }
        } catch (dupErr) {
          console.error('Duplicate create failed:', dupErr)
          toast({ title: 'Duplicate failed', description: 'Unable to duplicate sequence.' })
          try {
            const errorPayload = createSafeErrorLogPayload({
              userId: user.id,
              operation: 'duplicate_ai_sequence',
              errorType: 'data_conflict_error',
              message: dupErr,
              context: { originalId: sequence.id, newId: newSequenceId }
            })
            await blink.db.error_logs.create(errorPayload)
          } catch (e) { console.error('Failed to write error_log:', e) }
        }
      }

      setSequences(prev => [...prev, newSequence])
    } catch (error) {
      console.error('Failed to duplicate sequence:', error)
      setError('Failed to duplicate sequence. Please try again.')
    }
  }

  const getSequenceIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'sms': return <MessageSquare className="w-4 h-4" />
      case 'linkedin': return <Linkedin className="w-4 h-4" />
      default: return <Mail className="w-4 h-4" />
    }
  }

  const getSequenceTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800'
      case 'sms': return 'bg-green-100 text-green-800'
      case 'linkedin': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredSequences = selectedCampaign && selectedCampaign !== 'all'
    ? sequences.filter(seq => seq.campaign_id === selectedCampaign)
    : sequences

  const groupedSequences = filteredSequences.reduce((acc, seq) => {
    const key = `${seq.campaign_id}_${seq.sequence_type}`
    if (!acc[key]) acc[key] = []
    acc[key].push(seq)
    return acc
  }, {} as Record<string, AISequence[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Sequences</h1>
          <p className="text-gray-600 mt-1">Generate and manage AI-powered outreach sequences</p>
        </div>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Wand2 className="w-4 h-4 mr-2" />
              Generate AI Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate AI Sequence</DialogTitle>
              <DialogDescription>
                Create personalized outreach sequences powered by AI for your campaigns.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-select">Campaign</Label>
                  <Select value={generationSettings.campaign_id} onValueChange={(value) => setGenerationSettings(prev => ({ ...prev, campaign_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sequence-type">Sequence Type</Label>
                  <Select value={generationSettings.sequence_type} onValueChange={(value) => setGenerationSettings(prev => ({ ...prev, sequence_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="num-steps">Number of Steps</Label>
                  <Select value={generationSettings.num_steps.toString()} onValueChange={(value) => setGenerationSettings(prev => ({ ...prev, num_steps: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Steps</SelectItem>
                      <SelectItem value="5">5 Steps</SelectItem>
                      <SelectItem value="7">7 Steps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={generationSettings.tone} onValueChange={(value) => setGenerationSettings(prev => ({ ...prev, tone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="focus">Focus</Label>
                  <Select value={generationSettings.focus} onValueChange={(value) => setGenerationSettings(prev => ({ ...prev, focus: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value_proposition">Value Proposition</SelectItem>
                      <SelectItem value="problem_solving">Problem Solving</SelectItem>
                      <SelectItem value="relationship_building">Relationship Building</SelectItem>
                      <SelectItem value="urgency">Urgency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={generateAISequence} disabled={!generationSettings.campaign_id || loading}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  {loading ? 'Generating...' : 'Generate Sequence'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-4">
        <Label htmlFor="campaign-filter">Filter by Campaign:</Label>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sequences...</p>
          </div>
        </div>
      )}

      {!loading && sequences.length === 0 && (
        <div className="text-center py-12">
          <Wand2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI sequences yet</h3>
          <p className="text-gray-600 mb-4">Create your first AI-powered outreach sequence to get started.</p>
          <Button onClick={() => setIsGenerateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Your First Sequence
          </Button>
        </div>
      )}

      {!loading && sequences.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedSequences).map(([key, sequenceGroup]) => {
          const sequenceType = sequenceGroup[0].sequence_type
          const campaignName = sequenceGroup[0].campaign_name

          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getSequenceTypeColor(sequenceType)}`}>
                      {getSequenceIcon(sequenceType)}
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {campaignName} - {safeCapitalize(sequenceType, 'Unknown')} Sequence
                      </CardTitle>
                      <CardDescription>
                        {sequenceGroup.length} steps • {sequenceGroup.filter(s => !!s.is_ai_generated).length} AI-generated
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getSequenceTypeColor(sequenceType)}>
                    {safeToUpper(sequenceType, 'Unknown')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sequenceGroup
                    .sort((a, b) => a.step_number - b.step_number)
                    .map((sequence) => (
                      <div key={sequence.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                              {sequence.step_number}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {sequence.subject_line}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {sequence.delay_days === 0 ? 'Immediate' : `${sequence.delay_days} days delay`}
                                {sequence.is_ai_generated && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    <Wand2 className="w-3 h-3 mr-1" />
                                    AI Generated
                                  </Badge>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSequence(sequence)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateSequence(sequence)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSequence(sequence.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-md p-3">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                            {sequence.content}
                          </pre>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sequence.personalization_tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {`{{${tag}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Sequence Step</DialogTitle>
            <DialogDescription>
              Customize your AI-generated sequence step with your own messaging.
            </DialogDescription>
          </DialogHeader>
          {editingSequence && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject Line / Opening</Label>
                <Input
                  id="edit-subject"
                  value={editingSequence.subject_line}
                  onChange={(e) => setEditingSequence(prev => prev ? { ...prev, subject_line: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  rows={8}
                  value={editingSequence.content}
                  onChange={(e) => setEditingSequence(prev => prev ? { ...prev, content: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-delay">Delay (days)</Label>
                <Input
                  id="edit-delay"
                  type="number"
                  min="0"
                  value={editingSequence.delay_days}
                  onChange={(e) => setEditingSequence(prev => prev ? { ...prev, delay_days: parseInt(e.target.value) || 0 } : null)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => editSequence(editingSequence)} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Panel */}
      <Collapsible open={debugPanelOpen} onOpenChange={setDebugPanelOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center">
              <Bug className="w-4 h-4 mr-2" />
              Debug Panel ({debugLogs.length} logs)
            </div>
            {debugPanelOpen ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Bug className="w-5 h-5 mr-2" />
                Sequence Save Debug Logs & Test Runner
              </CardTitle>
              <CardDescription>
                Real-time debugging information for sequence validation and saving operations. Run validation tests against the validate-sequence endpoint here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Full Regression Test Controls */}
                <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                  {/* Insert ValidationRunner here */}
                  <div className="mb-4">
                    {/* Lazy load component to avoid build-time cycle */}
                    {typeof window !== 'undefined' && (
                      <React.Suspense fallback={<div className="text-sm text-gray-500">Loading validation runner...</div>}>
                        <ValidationRunner />
                      </React.Suspense>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-lg">Full Regression Test</h4>
                      <p className="text-sm text-gray-600">Complete end-to-end test: Demo Product → Campaign → Leads → AI Sequences → Launch</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={runFullRegressionTest} 
                        disabled={isRunningFullTest || !user?.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isRunningFullTest ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Running Test...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Run Full Test
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowBatchTestModal(true)}
                        disabled={isRunningFullTest || !user?.id}
                      >
                        Batch Tests
                      </Button>
                    </div>
                  </div>

                  {/* Current Test Progress */}
                  {testSuite && (
                    <div className="mt-4 p-3 bg-white rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{testSuite.name}</h5>
                        <Badge className={testSuite.status === 'completed' ? 'bg-green-100 text-green-800' : testSuite.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                          {testSuite.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {testSuite.steps.map((step) => (
                          <div key={step.id} className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              step.status === 'completed' ? 'bg-green-500' : 
                              step.status === 'failed' ? 'bg-red-500' : 
                              step.status === 'running' ? 'bg-blue-500' : 'bg-gray-300'
                            }`}>
                              {step.status === 'completed' && <CheckCircle className="w-3 h-3 text-white" />}
                              {step.status === 'failed' && <XCircle className="w-3 h-3 text-white" />}
                              {step.status === 'running' && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{step.name}</div>
                              <div className="text-xs text-gray-500">{step.description}</div>
                              {step.error && <div className="text-xs text-red-600 mt-1">{step.error}</div>}
                              {step.duration && <div className="text-xs text-gray-400">{step.duration}ms</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {testSuite.duration && (
                        <div className="mt-3 text-sm text-gray-600">
                          Total Duration: {Math.round(testSuite.duration / 1000)}s | 
                          Completed: {testSuite.completedSteps}/{testSuite.totalSteps} | 
                          Failed: {testSuite.failedSteps}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test History */}
                  {testHistory.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Recent Test Runs ({testHistory.length})</h5>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {testHistory.slice(0, 5).map((suite, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                            <div>
                              <span className="font-medium">{suite.name}</span>
                              <span className="text-gray-500 ml-2">{suite.startTime ? new Date(suite.startTime).toLocaleString() : ''}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={suite.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {suite.completedSteps}/{suite.totalSteps}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {suite.duration ? `${Math.round(suite.duration / 1000)}s` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Validation Test Runner Controls */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-2">
                    <Label>Function Base URL (override)</Label>
                    <Input value={(window as any).__FUNCTION_BASE_URL_OVERRIDE || ''} onChange={(e) => { (window as any).__FUNCTION_BASE_URL_OVERRIDE = e.target.value }} placeholder="https://localhost:8000 or production URL" />
                    <p className="text-xs text-gray-500">Optional. If set, used as base for /validate-sequence</p>
                  </div>

                  <div className="col-span-1 space-y-2">
                    <Label>Preset Tests</Label>
                    <Select onValueChange={(value) => {
                      try {
                        const parsed = JSON.parse(value);
                        (window as any).__TEST_PAYLOAD = parsed;
                      } catch (e) {
                        (window as any).__TEST_PAYLOAD = null
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Load built-in presets + custom saved presets from localStorage */}
                        {(() => {
                          const saved = JSON.parse(localStorage.getItem('sequence_test_presets') || '[]') as any[]
                          const builtIn = [
                            { id: 'builtin_valid', label: 'Demo - Valid Email Step', payload: { campaign_id: 'camp_demo_1', sequence_type: 'email', step_number: 1, content: 'Hello {{contact_name}}, quick question about {{company_name}}', subject_line: 'Quick question', delay_days: 0 } },
                            { id: 'builtin_invalid_campaign', label: 'Demo - Invalid Campaign', payload: { campaign_id: 'nonexistent', sequence_type: 'email', step_number: 1, content: 'This will fail campaign check', subject_line: 'Invalid campaign', delay_days: 0 } },
                            { id: 'builtin_malformed', label: 'Demo - Malformed Payload', payload: { campaign_id: 'camp_demo_1', sequence_type: 'email', step_number: 'not_a_number', content: '', subject_line: '', delay_days: -1 } }
                          ]
                          const all = [...builtIn, ...saved]
                          return all.map(p => (
                            <SelectItem key={p.id || p.label} value={JSON.stringify(p.payload)}>
                              {p.label || p.name}
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 space-y-2">
                    <Label>Manual JSON Payload</Label>
                    <Textarea id="test-json-input" rows={6} placeholder='{"campaign_id":"camp_demo_1","sequence_type":"email","step_number":1,"content":"Hello"}' defaultValue={(window as any).__TEST_PAYLOAD ? JSON.stringify((window as any).__TEST_PAYLOAD, null, 2) : ''} onChange={(e) => { try { (window as any).__TEST_PAYLOAD = JSON.parse(e.target.value) } catch (err) { (window as any).__TEST_PAYLOAD = null } }} />
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        try {
                          const input = document.getElementById('test-json-input') as HTMLTextAreaElement
                          const parsed = input.value ? JSON.parse(input.value) : null
                          const presets = JSON.parse(localStorage.getItem('sequence_test_presets') || '[]') as any[]
                          const name = prompt('Preset name (e.g. My Valid Test)')
                          if (!name) return
                          presets.unshift({ id: `preset_${Date.now()}`, name, payload: parsed })
                          localStorage.setItem('sequence_test_presets', JSON.stringify(presets.slice(0,20)))
                          toast({ title: 'Preset saved', description: `Saved preset "${name}" to local presets` })
                        } catch (err) {
                          toast({ title: 'Save failed', description: 'Ensure your JSON is valid before saving as preset', variant: 'destructive' })
                        }
                      }}>
                        Save Preset
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem('sequence_test_history'); toast({ title: 'Cleared history' }) }}>Clear History</Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    const payload = (window as any).__TEST_PAYLOAD || { campaign_id: campaigns[0]?.id || 'camp_demo_1', sequence_type: 'email', step_number: 1, content: 'Hello {{contact_name}}', subject_line: 'Quick question', delay_days: 0 };
                    const input = document.getElementById('test-json-input') as HTMLTextAreaElement;
                    input.value = JSON.stringify(payload, null, 2);
                    (window as any).__TEST_PAYLOAD = payload;
                  }}>Load Payload</Button>
                  <Button onClick={async () => {
                    const input = document.getElementById('test-json-input') as HTMLTextAreaElement
                    const raw = input.value
                    try {
                      const parsed = raw ? JSON.parse(raw) : null
                      await runValidationTest(parsed)
                    } catch (e) {
                      addDebugLog('error', 'Invalid JSON in test payload', { error: String(e), raw })
                      toast({ title: 'Invalid JSON', description: 'Please provide valid JSON payload for testing.', variant: 'destructive' })
                    }
                  }} className="bg-indigo-600 hover:bg-indigo-700">
                    Run Test
                  </Button>
                </div>

                {/* Result Tabs & Logs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Recent Test Runs</h4>
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {(JSON.parse(localStorage.getItem('sequence_test_history') || '[]') as any[]).slice(0,20).map((r, i) => (
                        <div key={i} className={`p-2 rounded border ${r.ok ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <div className="font-medium">{r.title || r.payload?.campaign_id || 'Test'}</div>
                              <div className="text-xs text-gray-600">{new Date(r.timestamp).toLocaleString()}</div>
                            </div>
                            <div className="text-xs font-medium">{r.ok ? 'OK' : 'FAIL'}</div>
                          </div>

                          {/* Result detail tabs and actions */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-gray-600">Status: {r.ok ? 'OK' : 'FAIL'} • HTTP {r.status}</div>
                              <div className="flex items-center space-x-2">
                                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(JSON.stringify(r.response, null, 2)) }}>
                                  <Copy className="w-4 h-4 mr-1" /> Copy
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { const blob = new Blob([JSON.stringify(r.response, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${(r.title || 'test').replace(/\s+/g, '_')}_result.json`; a.click(); URL.revokeObjectURL(url); }}>
                                  Download
                                </Button>
                              </div>
                            </div>

                            <div className="border rounded bg-white p-2">
                              <div className="flex space-x-2 mb-2">
                                <Button size="sm" variant="outline" onClick={(e:any)=>{ const container = e.currentTarget.closest('div'); const pre = container.querySelector('pre'); pre && (pre.textContent = JSON.stringify(r.response, null, 2))}}>Response</Button>
                                <Button size="sm" variant="outline" onClick={(e:any)=>{ const container = e.currentTarget.closest('div'); const pre = container.querySelector('pre'); pre && (pre.textContent = JSON.stringify(r.payload, null, 2))}}>Payload</Button>
                                <Button size="sm" variant="outline" onClick={(e:any)=>{ const container = e.currentTarget.closest('div'); const pre = container.querySelector('pre'); pre && (pre.textContent = r.error ? JSON.stringify(r.error, null, 2) : (r.response && r.response.error ? JSON.stringify(r.response.error, null, 2) : 'No error'))}}>Errors</Button>
                              </div>
                              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r.response, null, 2)}</pre>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Live Debug Logs</h4>
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {debugLogs.slice(0,10).map((log, idx) => (
                        <div key={idx} className={`p-2 rounded ${log.type === 'error' ? 'bg-red-50' : log.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                          <div className="text-sm font-medium">{log.message}</div>
                          <div className="text-xs text-gray-600">{new Date(log.timestamp).toLocaleString()}</div>
                          {log.details && <pre className="text-xs mt-1">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}</pre>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Batch Test Modal */}
      <Dialog open={showBatchTestModal} onOpenChange={setShowBatchTestModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Test Runner</DialogTitle>
            <DialogDescription>
              Run multiple test configurations sequentially to validate different scenarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Available Test Configurations:</h4>
              {PRESET_TEST_CONFIGS.map((config, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="font-medium">{config.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Products: {config.config.productCount} | 
                    Campaigns: {config.config.campaignCount} | 
                    Leads: {config.config.leadCount} | 
                    Sequence Steps: {config.config.sequenceSteps}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Batch tests will create multiple demo datasets in your account. 
                  This may take several minutes to complete and will generate test data that you may want to clean up afterward.
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBatchTestModal(false)}>
                Cancel
              </Button>
              <Button onClick={runBatchTests} disabled={isRunningFullTest}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Run Batch Tests ({PRESET_TEST_CONFIGS.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
