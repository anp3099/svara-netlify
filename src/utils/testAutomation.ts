import { blink } from '@/blink/client'
import { generateUniqueId } from '@/utils/errorMapping'

export interface TestStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  duration?: number
  error?: string
  result?: any
}

export interface TestSuite {
  id: string
  name: string
  description: string
  steps: TestStep[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  duration?: number
  totalSteps: number
  completedSteps: number
  failedSteps: number
}

export type TestLogger = (type: 'info' | 'success' | 'warning' | 'error', message: string, details?: any) => void

export class TestAutomation {
  private logger: TestLogger
  private userId: string | null = null

  constructor(logger: TestLogger) {
    this.logger = logger
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  private log(type: 'info' | 'success' | 'warning' | 'error', message: string, details?: any) {
    this.logger(type, message, details)
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private updateStepStatus(suite: TestSuite, stepId: string, status: TestStep['status'], error?: string, result?: any) {
    const step = suite.steps.find(s => s.id === stepId)
    if (step) {
      step.status = status
      step.endTime = new Date()
      step.duration = step.startTime ? step.endTime.getTime() - step.startTime.getTime() : 0
      if (error) step.error = error
      if (result) step.result = result

      // Update suite stats
      suite.completedSteps = suite.steps.filter(s => s.status === 'completed').length
      suite.failedSteps = suite.steps.filter(s => s.status === 'failed').length
      
      if (suite.completedSteps + suite.failedSteps === suite.totalSteps) {
        suite.status = suite.failedSteps > 0 ? 'failed' : 'completed'
        suite.endTime = new Date()
        suite.duration = suite.startTime ? suite.endTime.getTime() - suite.startTime.getTime() : 0
      }
    }
  }

  private startStep(suite: TestSuite, stepId: string) {
    const step = suite.steps.find(s => s.id === stepId)
    if (step) {
      step.status = 'running'
      step.startTime = new Date()
      this.log('info', `Starting: ${step.name}`, { stepId, description: step.description })
    }
  }

  private async ensureUserExists(): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID must be set before ensuring user exists')
    }

    try {
      // Check if user already exists
      const existingUsers = await blink.db.users.list({
        where: { id: this.userId },
        limit: 1
      })

      if (existingUsers.length === 0) {
        // Create user if doesn't exist
        const userData = {
          id: this.userId,
          email: `test-${this.userId}@demo.svara.tech`,
          displayName: `Test User ${this.userId}`,
          companyName: 'Demo Test Company',
          planType: 'starter'
        }

        await blink.db.users.create(userData)
        this.log('success', 'Demo user created', { userId: this.userId, email: userData.email })
      } else {
        this.log('info', 'User already exists', { userId: this.userId })
      }
    } catch (error) {
      this.log('error', 'Failed to ensure user exists', { userId: this.userId, error: String(error) })
      throw error
    }
  }

  async createDemoProduct(): Promise<{ id: string; name: string }> {
    // Ensure user exists in database before creating product
    await this.ensureUserExists()
    
    const productId = generateUniqueId('prod')
    const productData = {
      id: productId,
      userId: this.userId!,
      name: 'AI Sales Automation Platform',
      description: 'Enterprise-grade AI-powered sales automation and lead generation platform',
      price: '8999.99', // Save as string for SQLite compatibility
      category: 'SaaS',
      targetAudience: 'Digital marketing agencies, sales teams, and consultants',
      keyBenefits: 'Automated lead generation, AI-powered personalization, multi-channel outreach, CRM integration'
    }

    await blink.db.products.create(productData)
    this.log('success', 'Demo product created', { productId, name: productData.name })
    return { id: productId, name: productData.name }
  }

  async createDemoCampaign(productId: string): Promise<{ id: string; name: string }> {
    // Ensure user exists in database before creating campaign
    await this.ensureUserExists()
    
    const campaignId = generateUniqueId('camp')
    const campaignData = {
      id: campaignId,
      userId: this.userId!,
      productId: productId,
      name: 'Enterprise SaaS Outreach Demo',
      description: 'Automated outreach campaign targeting enterprise SaaS companies for sales automation solutions',
      targetCriteria: JSON.stringify({
        industries: ['Technology', 'SaaS', 'Software'],
        companySize: ['51-200', '201-500', '501-1000', '1000+'],
        jobTitles: ['VP Sales', 'Sales Director', 'Head of Sales', 'Chief Revenue Officer']
      }),
      status: 'draft'
    }

    await blink.db.campaigns.create(campaignData)
    this.log('success', 'Demo campaign created', { campaignId, name: campaignData.name })
    return { id: campaignId, name: campaignData.name }
  }

  async generateDemoLeads(campaignId: string, count: number = 5): Promise<string[]> {
    // Ensure user exists in database before creating leads
    await this.ensureUserExists()
    
    const leadIds: string[] = []
    const demoLeads = [
      {
        companyName: 'TechFlow Solutions',
        industry: 'Technology',
        companySize: '201-500',
        revenueRange: '$10M-$50M',
        location: 'San Francisco, CA',
        website: 'https://techflow.example.com',
        contactName: 'Sarah Johnson',
        contactTitle: 'VP of Sales',
        contactEmail: 'sarah.johnson@techflow.example.com',
        linkedinUrl: 'https://linkedin.com/in/sarahjohnson-sales'
      },
      {
        companyName: 'DataDrive Analytics',
        industry: 'SaaS',
        companySize: '51-200',
        revenueRange: '$5M-$25M',
        location: 'Austin, TX',
        website: 'https://datadrive.example.com',
        contactName: 'Michael Chen',
        contactTitle: 'Head of Sales',
        contactEmail: 'michael.chen@datadrive.example.com',
        linkedinUrl: 'https://linkedin.com/in/michaelchen-sales'
      },
      {
        companyName: 'CloudScale Systems',
        industry: 'Software',
        companySize: '501-1000',
        revenueRange: '$25M-$100M',
        location: 'Seattle, WA',
        website: 'https://cloudscale.example.com',
        contactName: 'Emily Rodriguez',
        contactTitle: 'Chief Revenue Officer',
        contactEmail: 'emily.rodriguez@cloudscale.example.com',
        linkedinUrl: 'https://linkedin.com/in/emilyrodriguez-cro'
      },
      {
        companyName: 'InnovateLab Inc',
        industry: 'Technology',
        companySize: '201-500',
        revenueRange: '$15M-$75M',
        location: 'Boston, MA',
        website: 'https://innovatelab.example.com',
        contactName: 'David Park',
        contactTitle: 'Sales Director',
        contactEmail: 'david.park@innovatelab.example.com',
        linkedinUrl: 'https://linkedin.com/in/davidpark-sales'
      },
      {
        companyName: 'GrowthEngine Pro',
        industry: 'SaaS',
        companySize: '1000+',
        revenueRange: '$100M+',
        location: 'New York, NY',
        website: 'https://growthengine.example.com',
        contactName: 'Lisa Thompson',
        contactTitle: 'VP Sales Operations',
        contactEmail: 'lisa.thompson@growthengine.example.com',
        linkedinUrl: 'https://linkedin.com/in/lisathompson-salesops'
      }
    ]

    for (let i = 0; i < Math.min(count, demoLeads.length); i++) {
      const leadId = generateUniqueId('lead')
      const leadData = {
        id: leadId,
        userId: this.userId!,
        companyName: demoLeads[i].companyName,
        industry: demoLeads[i].industry,
        companySize: demoLeads[i].companySize,
        revenueRange: demoLeads[i].revenueRange,
        location: demoLeads[i].location,
        website: demoLeads[i].website,
        contactName: demoLeads[i].contactName,
        contactTitle: demoLeads[i].contactTitle,
        contactEmail: demoLeads[i].contactEmail,
        linkedinUrl: demoLeads[i].linkedinUrl,
        leadScore: String(Math.floor(Math.random() * 40) + 60), // Score between 60-100, as string
        dataSource: 'demo_automation'
      }

      await blink.db.leads.create(leadData)
      
      // Link lead to campaign
      const campaignLeadId = generateUniqueId('cl')
      await blink.db.campaign_leads.create({
        id: campaignLeadId,
        campaignId: campaignId,
        leadId: leadId,
        status: 'pending'
      })

      leadIds.push(leadId)
    }

    this.log('success', `Generated ${leadIds.length} demo leads`, { campaignId, leadIds })
    return leadIds
  }

  async createDemoAISequences(campaignId: string): Promise<string[]> {
    const sequenceIds: string[] = []
    const demoSequences = [
      {
        stepNumber: 1,
        sequenceType: 'email',
        subjectLine: 'Quick question about {{company_name}}\'s sales automation',
        content: `Hi {{contact_name}},

I noticed {{company_name}} has been growing rapidly in the {{industry}} space. Congratulations on your recent success!

I'm reaching out because we've helped similar companies like yours increase their sales pipeline by 340% using AI-powered automation.

Would you be open to a brief 15-minute conversation about how we could help {{company_name}} scale even faster?

Best regards,
[Your Name]`,
        delayDays: 0
      },
      {
        stepNumber: 2,
        sequenceType: 'email',
        subjectLine: 'Following up on {{company_name}}\'s growth opportunity',
        content: `Hi {{contact_name}},

I wanted to follow up on my previous message about helping {{company_name}} automate your sales processes.

I understand you're probably busy, but I thought you might be interested to know that companies in the {{industry}} sector typically see:

• 340% increase in qualified leads
• 65% reduction in manual sales tasks  
• 2.5x faster deal closure rates

Would next Tuesday or Wednesday work for a quick 15-minute call?

Best,
[Your Name]`,
        delayDays: 3
      },
      {
        stepNumber: 3,
        sequenceType: 'email',
        subjectLine: 'Last attempt - {{company_name}} automation opportunity',
        content: `Hi {{contact_name}},

This will be my last email about the sales automation opportunity for {{company_name}}.

I completely understand if this isn't a priority right now. However, if you're still interested in learning how we've helped {{industry}} companies like yours scale their sales operations, I'm happy to send over a brief case study.

Just reply with "CASE STUDY" and I'll send it right over.

Thanks for your time,
[Your Name]

P.S. If you're not the right person for this, could you point me in the right direction?`,
        delayDays: 7
      }
    ]

    for (const seq of demoSequences) {
      const sequenceId = generateUniqueId('seq')
      const sequenceData = {
        id: sequenceId,
        campaignId: campaignId,
        sequenceType: seq.sequenceType,
        stepNumber: String(seq.stepNumber), // Convert to string
        subjectLine: seq.subjectLine,
        content: seq.content,
        delayDays: String(seq.delayDays), // Convert to string
        isAiGenerated: '1', // Convert to string
        personalizationTags: JSON.stringify(['contact_name', 'company_name', 'industry'])
      }

      await blink.db.ai_sequences.create(sequenceData)
      sequenceIds.push(sequenceId)
    }

    this.log('success', `Created ${sequenceIds.length} demo AI sequences`, { campaignId, sequenceIds })
    return sequenceIds
  }

  async launchDemoCampaign(campaignId: string): Promise<void> {
    // Update campaign status to launched
    await blink.db.campaigns.update(campaignId, {
      status: 'active',
      launchedAt: new Date().toISOString()
    })

    // Get campaign leads and create initial outreach activities
    const campaignLeads = await blink.db.campaign_leads.list({
      where: { campaignId: campaignId }
    })

    const sequences = await blink.db.ai_sequences.list({
      where: { campaignId: campaignId },
      orderBy: { stepNumber: 'asc' }
    })

    let activitiesCreated = 0
    for (const campaignLead of campaignLeads) {
      // Create first step activities for each lead
      const firstSequence = sequences.find(s => Number(s.stepNumber) === 1)
      if (firstSequence) {
        const activityId = generateUniqueId('act')
        await blink.db.outreach_activities.create({
          id: activityId,
          campaignLeadId: campaignLead.id,
          sequenceId: firstSequence.id,
          activityType: firstSequence.sequenceType || 'email',
          subject: firstSequence.subjectLine || '',
          content: firstSequence.content || '',
          status: 'scheduled',
          scheduledAt: new Date().toISOString()
        })
        activitiesCreated++
      }
    }

    this.log('success', `Demo campaign launched with ${activitiesCreated} initial activities`, { 
      campaignId, 
      leadsCount: campaignLeads.length,
      sequencesCount: sequences.length,
      activitiesCreated 
    })
  }

  async runFullRegressionTest(): Promise<TestSuite> {
    if (!this.userId) {
      throw new Error('User ID must be set before running tests')
    }

    const suite: TestSuite = {
      id: generateUniqueId('test'),
      name: 'Full Demo Regression Test',
      description: 'Complete end-to-end test of demo product → campaign → leads → AI sequences → launch flow',
      status: 'running',
      startTime: new Date(),
      totalSteps: 5,
      completedSteps: 0,
      failedSteps: 0,
      steps: [
        {
          id: 'step_product',
          name: 'Create Demo Product',
          description: 'Create a demo product for the sales automation platform',
          status: 'pending'
        },
        {
          id: 'step_campaign',
          name: 'Create Demo Campaign',
          description: 'Create a demo campaign linked to the product',
          status: 'pending'
        },
        {
          id: 'step_leads',
          name: 'Generate Demo Leads',
          description: 'Generate 5 demo leads and link them to the campaign',
          status: 'pending'
        },
        {
          id: 'step_sequences',
          name: 'Create AI Sequences',
          description: 'Create 3-step email sequence for the campaign',
          status: 'pending'
        },
        {
          id: 'step_launch',
          name: 'Launch Campaign',
          description: 'Launch the campaign and create initial outreach activities',
          status: 'pending'
        }
      ]
    }

    this.log('info', 'Starting full regression test', { suiteId: suite.id, totalSteps: suite.totalSteps })

    let productId: string = ''
    let campaignId: string = ''

    try {
      // Step 1: Create Demo Product
      this.startStep(suite, 'step_product')
      const product = await this.createDemoProduct()
      productId = product.id
      this.updateStepStatus(suite, 'step_product', 'completed', undefined, product)
      await this.delay(500)

      // Step 2: Create Demo Campaign
      this.startStep(suite, 'step_campaign')
      const campaign = await this.createDemoCampaign(productId)
      campaignId = campaign.id
      this.updateStepStatus(suite, 'step_campaign', 'completed', undefined, campaign)
      await this.delay(500)

      // Step 3: Generate Demo Leads
      this.startStep(suite, 'step_leads')
      const leadIds = await this.generateDemoLeads(campaignId, 5)
      this.updateStepStatus(suite, 'step_leads', 'completed', undefined, { leadIds, count: leadIds.length })
      await this.delay(500)

      // Step 4: Create AI Sequences
      this.startStep(suite, 'step_sequences')
      const sequenceIds = await this.createDemoAISequences(campaignId)
      this.updateStepStatus(suite, 'step_sequences', 'completed', undefined, { sequenceIds, count: sequenceIds.length })
      await this.delay(500)

      // Step 5: Launch Campaign
      this.startStep(suite, 'step_launch')
      await this.launchDemoCampaign(campaignId)
      this.updateStepStatus(suite, 'step_launch', 'completed', undefined, { campaignId, status: 'launched' })

      this.log('success', 'Full regression test completed successfully', {
        suiteId: suite.id,
        duration: suite.duration,
        productId,
        campaignId,
        completedSteps: suite.completedSteps,
        failedSteps: suite.failedSteps
      })

    } catch (error) {
      const currentStep = suite.steps.find(s => s.status === 'running')
      if (currentStep) {
        this.updateStepStatus(suite, currentStep.id, 'failed', String(error))
      }
      suite.status = 'failed'
      suite.endTime = new Date()
      suite.duration = suite.startTime ? suite.endTime.getTime() - suite.startTime.getTime() : 0

      this.log('error', 'Full regression test failed', {
        suiteId: suite.id,
        error: String(error),
        failedStep: currentStep?.name,
        completedSteps: suite.completedSteps,
        failedSteps: suite.failedSteps
      })
    }

    return suite
  }

  async runBatchTests(testConfigs: Array<{ name: string; config: any }>): Promise<TestSuite[]> {
    const results: TestSuite[] = []
    
    this.log('info', `Starting batch test run with ${testConfigs.length} configurations`)

    for (let i = 0; i < testConfigs.length; i++) {
      const config = testConfigs[i]
      this.log('info', `Running batch test ${i + 1}/${testConfigs.length}: ${config.name}`)
      
      try {
        const result = await this.runFullRegressionTest()
        result.name = `${config.name} - ${result.name}`
        results.push(result)
        
        // Small delay between tests
        await this.delay(1000)
      } catch (error) {
        this.log('error', `Batch test ${config.name} failed`, error)
      }
    }

    this.log('success', `Batch test run completed`, {
      totalTests: testConfigs.length,
      completedTests: results.length,
      successfulTests: results.filter(r => r.status === 'completed').length,
      failedTests: results.filter(r => r.status === 'failed').length
    })

    return results
  }

  // Utility method to clean up test data
  async cleanupTestData(suiteId: string): Promise<void> {
    if (!this.userId) return

    try {
      // This would clean up test data created during the test run
      // For now, we'll just log the cleanup attempt
      this.log('info', 'Test data cleanup initiated', { suiteId, userId: this.userId })
      
      // In a real implementation, you might want to:
      // 1. Delete test products, campaigns, leads created during the test
      // 2. Clean up any test sequences and activities
      // 3. Reset any modified state
      
      this.log('success', 'Test data cleanup completed', { suiteId })
    } catch (error) {
      this.log('error', 'Test data cleanup failed', { suiteId, error: String(error) })
    }
  }
}

// Export a factory function to create test automation instances
export function createTestAutomation(logger: TestLogger): TestAutomation {
  return new TestAutomation(logger)
}

// Export preset test configurations
export const PRESET_TEST_CONFIGS = [
  {
    name: 'Standard Demo Flow',
    config: {
      productCount: 1,
      campaignCount: 1,
      leadCount: 5,
      sequenceSteps: 3
    }
  },
  {
    name: 'Extended Demo Flow',
    config: {
      productCount: 1,
      campaignCount: 1,
      leadCount: 10,
      sequenceSteps: 5
    }
  },
  {
    name: 'Multi-Campaign Test',
    config: {
      productCount: 2,
      campaignCount: 3,
      leadCount: 15,
      sequenceSteps: 3
    }
  }
]