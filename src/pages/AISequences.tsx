import React, { useState, useEffect } from 'react'
import { Wand2, Mail, MessageSquare, Linkedin, Plus, Edit, Trash2, Copy } from 'lucide-react'
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

// Sample sequences for immediate display
const sampleSequences: AISequence[] = [
  {
    id: 'seq_1',
    campaign_id: 'camp_1',
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
  },
  {
    id: 'seq_2',
    campaign_id: 'camp_1',
    campaign_name: 'Enterprise SaaS Outreach',
    sequence_type: 'email',
    step_number: 2,
    subject_line: 'Following up on {{company_name}}\'s growth opportunity',
    content: `Hi {{contact_name}},

I wanted to follow up on my previous message about helping {{company_name}} automate your sales outreach.

I understand you're probably busy, but I thought you might be interested in seeing how companies in {{industry}} are achieving:

• 78% higher response rates
• 420% ROI on outreach campaigns  
• 50% reduction in manual sales work

Would a quick 10-minute call work for you this week?

Best,
[Your Name]`,
    delay_days: 3,
    is_ai_generated: true,
    personalization_tags: ['contact_name', 'company_name', 'industry']
  },
  {
    id: 'seq_3',
    campaign_id: 'camp_2',
    campaign_name: 'Agency Partnership Program',
    sequence_type: 'linkedin',
    step_number: 1,
    subject_line: 'Partnership opportunity for {{company_name}}',
    content: `Hi {{contact_name}},

I came across {{company_name}} and was impressed by your work in the {{industry}} space.

We're launching a white-label AI sales automation platform that agencies like yours are using to:

✓ Add $50K+ monthly recurring revenue
✓ Offer enterprise-grade AI automation to clients
✓ Scale without hiring additional staff

Interested in learning more about our partnership program?`,
    delay_days: 0,
    is_ai_generated: true,
    personalization_tags: ['contact_name', 'company_name', 'industry']
  }
]

// Sample campaigns
const sampleCampaigns: Campaign[] = [
  { id: 'camp_1', name: 'Enterprise SaaS Outreach', description: 'Target enterprise SaaS companies for sales automation' },
  { id: 'camp_2', name: 'Agency Partnership Program', description: 'Partner with marketing agencies for white-label solutions' },
  { id: 'camp_3', name: 'SMB Lead Generation', description: 'Generate leads for small and medium businesses' }
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

  const { toast } = useToast()

  // Initialize auth
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  // Load real campaigns and sequences
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)
        
        // Load campaigns from database
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

        // Load existing sequences from database
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
        // Keep sample data on error
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

    // Check plan restrictions for sequence creation
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
      
      // Generate AI sequences using Blink AI
      const prompt = `Generate a ${generationSettings.num_steps}-step ${generationSettings.sequence_type} outreach sequence for "${campaign.name}".

Campaign Description: ${campaign.description || 'Professional outreach campaign'}
Tone: ${generationSettings.tone}
Focus: ${generationSettings.focus}

Requirements:
- Each step should have a compelling subject line (for emails) or opening message
- Include personalization tags like {{contact_name}}, {{company_name}}, {{industry}}
- Progressive follow-up strategy with increasing urgency/value
- Professional but engaging tone
- Clear call-to-action in each step

Format each step as:
Step X:
Subject: [Subject line here]
Content: [Message content here]

Please provide exactly ${generationSettings.num_steps} distinct steps.`

      const { text } = await blink.ai.generateText({
        prompt,
        model: 'gpt-4o-mini',
        maxTokens: 2000
      })

      // Parse the AI response and create sequences
      const steps = text.split(/Step \d+:/i).filter(step => step.trim())
      const newSequences: AISequence[] = []
      
      for (let i = 0; i < Math.min(steps.length, generationSettings.num_steps); i++) {
        const step = steps[i].trim()
        const subjectMatch = step.match(/Subject:\s*(.+?)(?:\n|Content:|$)/i)
        const contentMatch = step.match(/Content:\s*([\s\S]+?)(?:\n\nStep|\n\n$|$)/i)
        
        const subject = subjectMatch ? subjectMatch[1].trim() : `${generationSettings.sequence_type} Step ${i + 1}`
        const content = contentMatch ? contentMatch[1].trim() : step.replace(/Subject:.*?\n/i, '').trim()
        
        // Generate unique sequence ID
        const sequenceId = generateUniqueId('seq')
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

        // Validate sequence via server-side function
        if (user?.id) {
          try {
            const VALIDATE_URL = 'https://68hyt0cq--validate-sequence.functions.blink.new'
            const validateResponse = await fetch(VALIDATE_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sequencePayload)
            })

            // Read raw text and attempt safe JSON parse. Some errors may return plain text.
            const validateText = await validateResponse.text()
            let validateResult: any = null
            try {
              validateResult = validateText ? JSON.parse(validateText) : null
            } catch (parseErr) {
              console.warn('validate-sequence returned non-JSON response:', validateText, parseErr)
              validateResult = { error: 'Non-JSON response from validation endpoint', details: validateText }
            }

            if (!validateResponse.ok) {
              console.warn('Validation failed:', validateResult)
              const details = Array.isArray(validateResult.details) ? validateResult.details.join(', ') : (typeof validateResult.details === 'string' ? validateResult.details : JSON.stringify(validateResult.details || {}))
              toast({ 
                title: 'Validation failed', 
                description: details || validateResult.error || 'Validation error'
              })

              // Log validation error safely
              try {
                const errorPayload = createSafeErrorLogPayload({
                  userId: user.id,
                  operation: 'validate_ai_sequence',
                  errorType: 'validation_error',
                  message: validateResult.error || 'Sequence validation failed',
                  context: { sequenceId, campaignId: generationSettings.campaign_id, validationErrors: Array.isArray(validateResult.details) ? validateResult.details : [validateResult.details] }
                })
                await blink.db.error_logs.create(errorPayload)
              } catch (logErr) {
                console.error('Failed to log validation error:', logErr)
              }
              continue // Skip this sequence
            }

            // Handle case where validateResult may not be valid JSON
            if (!validateResult || typeof validateResult !== 'object') {
              toast({ title: 'Validation failed', description: 'Unexpected validation response from server.' })
              continue
            }

            // Use validated data from server
            const validatedData = validateResult.validated_data || sequencePayload
            
            // Create sequence with validated data
            try {
              await blink.db.ai_sequences.create({
                id: validatedData.id,
                campaign_id: validatedData.campaign_id,
                sequence_type: validatedData.sequence_type,
                step_number: validatedData.step_number,
                subject_line: validatedData.subject_line,
                content: validatedData.content,
                delay_days: validatedData.delay_days,
                is_ai_generated: validatedData.is_ai_generated,
                personalization_tags: validatedData.personalization_tags
              })
              
              console.debug('Successfully created sequence:', validatedData.id)
            } catch (createErr) {
              console.warn('Create failed, attempting upsert:', createErr)
              try {
                await blink.db.ai_sequences.upsertMany([validatedData])
              } catch (upsertErr) {
                console.error('Upsert also failed:', upsertErr)
                toast({ title: 'Save failed', description: 'Could not save sequence. Please contact support.' })
                
                // Log database error safely
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
                }
                continue // Skip this sequence
              }
            }
          } catch (networkErr) {
            console.error('Network error during validation:', networkErr)
            toast({ title: 'Network error', description: 'Unable to validate sequence. Please try again.' })
            
            // Log network error safely
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
            }
            continue // Skip this sequence
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

  const editSequence = async (updatedSequence: AISequence) => {
    try {
      // Update in database if user is authenticated
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
      
      // Update local state
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
      // Delete from database if user is authenticated
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
      
      // Update local state
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
      
      // Save to database if user is authenticated
      if (user?.id) {
        try {
          // Guard: ensure campaign exists for this user or globally
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
      
      // Update local state
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

      {/* Error Alert */}
      {error && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Campaign Filter */}
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sequences...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
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

      {/* Sequences */}
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

      {/* Edit Sequence Dialog */}
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
    </div>
  )
}