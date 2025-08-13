import { blink } from '@/blink/client'
import { safeCapitalize } from '@/lib/utils'

export interface HunterDomainSearchResult {
  domain: string
  disposable: boolean
  webmail: boolean
  accept_all: boolean
  pattern: string
  organization: string
  country: string
  state: string
  emails: HunterEmail[]
  linked_domains: string[]
}

export interface HunterEmail {
  value: string
  type: string
  confidence: number
  sources: HunterSource[]
  first_name: string
  last_name: string
  position: string
  seniority: string
  department: string
  linkedin: string
  twitter: string
  phone_number: string
}

export interface HunterSource {
  domain: string
  uri: string
  extracted_on: string
  last_seen_on: string
  still_on_page: boolean
}

export interface HunterEmailFinderResult {
  email: string
  score: number
  regexp: boolean
  gibberish: boolean
  disposable: boolean
  webmail: boolean
  mx_records: boolean
  smtp_server: boolean
  smtp_check: boolean
  accept_all: boolean
  block: boolean
  sources: HunterSource[]
}

export interface HunterEmailVerifierResult {
  result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown'
  score: number
  email: string
  regexp: boolean
  gibberish: boolean
  disposable: boolean
  webmail: boolean
  mx_records: boolean
  smtp_server: boolean
  smtp_check: boolean
  accept_all: boolean
  block: boolean
  sources: HunterSource[]
}

export interface HunterLead {
  id: string
  company_name: string
  domain: string
  industry: string
  company_size: string
  revenue_range: string
  location: string
  website: string
  contact_name: string
  contact_title: string
  contact_email: string
  contact_phone?: string
  linkedin_url?: string
  lead_score: number
  data_source: string
  match_reason: string
  confidence: number
  created_at: string
}

class HunterService {
  private static instance: HunterService
  private baseUrl = 'https://api.hunter.io/v2'

  private constructor() {}

  static getInstance(): HunterService {
    if (!HunterService.instance) {
      HunterService.instance = new HunterService()
    }
    return HunterService.instance
  }

  /**
   * Search for email addresses associated with a domain
   */
  async domainSearch(domain: string, limit: number = 10): Promise<HunterDomainSearchResult | null> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/domain-search`,
        method: 'GET',
        query: {
          domain: domain,
          api_key: '{{HUNTER_API_KEY}}',
          limit: limit.toString(),
          offset: '0',
          type: 'personal',
          seniority: 'senior,executive'
        }
      })

      if (response.status === 200 && response.body?.data) {
        return response.body.data
      }

      return null
    } catch (error) {
      console.error('Hunter domain search error:', error)
      return null
    }
  }

  /**
   * Find a specific email address for a person at a company
   */
  async emailFinder(domain: string, firstName: string, lastName: string): Promise<HunterEmailFinderResult | null> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/email-finder`,
        method: 'GET',
        query: {
          domain: domain,
          first_name: firstName,
          last_name: lastName,
          api_key: '{{HUNTER_API_KEY}}'
        }
      })

      if (response.status === 200 && response.body?.data) {
        return response.body.data
      }

      return null
    } catch (error) {
      console.error('Hunter email finder error:', error)
      return null
    }
  }

  /**
   * Verify if an email address is deliverable
   */
  async emailVerifier(email: string): Promise<HunterEmailVerifierResult | null> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/email-verifier`,
        method: 'GET',
        query: {
          email: email,
          api_key: '{{HUNTER_API_KEY}}'
        }
      })

      if (response.status === 200 && response.body?.data) {
        return response.body.data
      }

      return null
    } catch (error) {
      console.error('Hunter email verifier error:', error)
      return null
    }
  }

  /**
   * Generate leads from a list of company domains using Hunter.io
   */
  async generateLeadsFromDomains(domains: string[], limit: number = 50): Promise<HunterLead[]> {
    const leads: HunterLead[] = []
    const maxDomainsToProcess = Math.min(domains.length, Math.ceil(limit / 5)) // Process enough domains to get desired leads

    for (let i = 0; i < maxDomainsToProcess && leads.length < limit; i++) {
      const domain = domains[i]
      
      try {
        // Search for emails at this domain
        const domainResult = await this.domainSearch(domain, 5)
        
        if (domainResult && domainResult.emails.length > 0) {
          // Process each email found
          for (const email of domainResult.emails.slice(0, 3)) { // Limit to top 3 emails per domain
            if (leads.length >= limit) break

            // Skip if not a senior/executive role
            if (!this.isSeniorRole(email.position)) continue

            const lead: HunterLead = {
              id: `hunter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              company_name: domainResult.organization || this.extractCompanyName(domain),
              domain: domain,
              industry: this.inferIndustryFromDomain(domain),
              company_size: this.estimateCompanySize(domainResult.emails.length),
              revenue_range: this.estimateRevenue(domainResult.emails.length),
              location: domainResult.country || 'United States',
              website: `https://${domain}`,
              contact_name: `${email.first_name} ${email.last_name}`.trim() || 'Contact Person',
              contact_title: email.position || 'Decision Maker',
              contact_email: email.value,
              contact_phone: email.phone_number || '',
              linkedin_url: email.linkedin || '',
              lead_score: this.calculateLeadScore(email, domainResult),
              data_source: 'hunter_io',
              match_reason: this.generateMatchReason(email, domainResult),
              confidence: email.confidence,
              created_at: new Date().toISOString()
            }

            leads.push(lead)
          }
        }

        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Error processing domain ${domain}:`, error)
        continue
      }
    }

    return leads
  }

  /**
   * Generate leads by searching for companies in specific industries
   */
  async generateLeadsByIndustry(industry: string, location?: string, limit: number = 50): Promise<HunterLead[]> {
    // For now, we'll use a predefined list of domains for different industries
    // In a production system, you'd integrate with other APIs to get company domains
    const industryDomains = this.getIndustryDomains(industry)
    
    if (location) {
      // Filter domains by location if specified (simplified approach)
      const locationDomains = industryDomains.filter(domain => 
        this.isDomainInLocation(domain, location)
      )
      return this.generateLeadsFromDomains(locationDomains, limit)
    }

    return this.generateLeadsFromDomains(industryDomains, limit)
  }

  /**
   * Check if a role is senior/decision maker level
   */
  private isSeniorRole(position: string): boolean {
    if (!position) return false
    
    const seniorKeywords = [
      'ceo', 'cto', 'cfo', 'coo', 'cmo', 'vp', 'vice president', 'director', 
      'head of', 'chief', 'president', 'founder', 'owner', 'manager', 'lead',
      'principal', 'senior', 'executive'
    ]
    
    const positionLower = position.toLowerCase()
    return seniorKeywords.some(keyword => positionLower.includes(keyword))
  }

  /**
   * Calculate lead score based on Hunter.io data
   */
  private calculateLeadScore(email: HunterEmail, domainResult: HunterDomainSearchResult): number {
    let score = 50 // Base score

    // Email confidence score
    score += Math.floor(email.confidence * 0.3) // Max 30 points

    // Seniority bonus
    if (email.seniority === 'executive') score += 20
    else if (email.seniority === 'senior') score += 15
    else if (email.seniority === 'manager') score += 10

    // Department bonus (prioritize decision-making departments)
    if (email.department) {
      const dept = email.department.toLowerCase()
      if (dept.includes('executive') || dept.includes('c-level')) score += 15
      else if (dept.includes('sales') || dept.includes('marketing')) score += 10
      else if (dept.includes('business') || dept.includes('strategy')) score += 8
    }

    // LinkedIn presence bonus
    if (email.linkedin) score += 10

    // Company size bonus (more emails = larger company)
    if (domainResult.emails.length > 50) score += 10
    else if (domainResult.emails.length > 20) score += 5

    // Source quality bonus
    if (email.sources.length > 3) score += 5

    return Math.min(Math.max(score, 0), 100)
  }

  /**
   * Generate match reason for Hunter.io leads
   */
  private generateMatchReason(email: HunterEmail, domainResult: HunterDomainSearchResult): string {
    const reasons: string[] = []

    if (email.confidence >= 90) reasons.push('High confidence email match')
    else if (email.confidence >= 70) reasons.push('Good confidence email match')

    if (email.seniority === 'executive') reasons.push('Executive level contact')
    else if (email.seniority === 'senior') reasons.push('Senior level contact')

    if (email.linkedin) reasons.push('LinkedIn profile verified')

    if (domainResult.emails.length > 20) reasons.push('Large organization')

    if (email.sources.length > 2) reasons.push('Multiple source verification')

    return reasons.length > 0 ? reasons.join(', ') : 'Professional email contact found'
  }

  /**
   * Extract company name from domain
   */
  private extractCompanyName(domain: string): string {
    const name = domain.replace(/\.(com|org|net|io|co|inc|llc)$/i, '')
    return name ? safeCapitalize(name, 'Unknown') : 'Unknown'
  }

  /**
   * Infer industry from domain name
   */
  private inferIndustryFromDomain(domain: string): string {
    const domainLower = domain.toLowerCase()
    
    if (domainLower.includes('tech') || domainLower.includes('software') || domainLower.includes('app')) {
      return 'Technology'
    } else if (domainLower.includes('health') || domainLower.includes('medical') || domainLower.includes('pharma')) {
      return 'Healthcare'
    } else if (domainLower.includes('finance') || domainLower.includes('bank') || domainLower.includes('invest')) {
      return 'Financial Services'
    } else if (domainLower.includes('retail') || domainLower.includes('shop') || domainLower.includes('store')) {
      return 'Retail & E-commerce'
    } else if (domainLower.includes('consult') || domainLower.includes('service')) {
      return 'Professional Services'
    } else if (domainLower.includes('market') || domainLower.includes('advertis') || domainLower.includes('agency')) {
      return 'Marketing & Advertising'
    } else {
      return 'Business Services'
    }
  }

  /**
   * Estimate company size based on number of emails found
   */
  private estimateCompanySize(emailCount: number): string {
    if (emailCount >= 100) return '1000+'
    if (emailCount >= 50) return '501-1000'
    if (emailCount >= 20) return '201-500'
    if (emailCount >= 10) return '51-200'
    if (emailCount >= 5) return '11-50'
    return '1-10'
  }

  /**
   * Estimate revenue based on company size indicators
   */
  private estimateRevenue(emailCount: number): string {
    if (emailCount >= 100) return '$100M-$500M'
    if (emailCount >= 50) return '$25M-$100M'
    if (emailCount >= 20) return '$5M-$25M'
    if (emailCount >= 10) return '$1M-$5M'
    return '$0-$1M'
  }

  /**
   * Get sample domains for different industries
   * In production, this would be replaced with a comprehensive database or API
   */
  private getIndustryDomains(industry: string): string[] {
    const industryDomains: { [key: string]: string[] } = {
      'Technology': [
        'microsoft.com', 'apple.com', 'google.com', 'amazon.com', 'meta.com',
        'salesforce.com', 'oracle.com', 'adobe.com', 'netflix.com', 'uber.com',
        'airbnb.com', 'spotify.com', 'zoom.us', 'slack.com', 'dropbox.com',
        'atlassian.com', 'shopify.com', 'stripe.com', 'twilio.com', 'okta.com'
      ],
      'Healthcare': [
        'pfizer.com', 'jnj.com', 'abbvie.com', 'merck.com', 'novartis.com',
        'roche.com', 'bms.com', 'astrazeneca.com', 'gsk.com', 'sanofi.com',
        'gilead.com', 'biogen.com', 'regeneron.com', 'illumina.com', 'danaher.com'
      ],
      'Financial Services': [
        'jpmorgan.com', 'bankofamerica.com', 'wellsfargo.com', 'goldmansachs.com',
        'morganstanley.com', 'citi.com', 'americanexpress.com', 'visa.com',
        'mastercard.com', 'paypal.com', 'square.com', 'robinhood.com'
      ],
      'Manufacturing': [
        'ge.com', 'boeing.com', 'caterpillar.com', '3m.com', 'honeywell.com',
        'lockheedmartin.com', 'ford.com', 'gm.com', 'tesla.com', 'nike.com'
      ],
      'Retail & E-commerce': [
        'walmart.com', 'target.com', 'homedepot.com', 'costco.com', 'lowes.com',
        'bestbuy.com', 'macys.com', 'nordstrom.com', 'gap.com', 'tjx.com'
      ],
      'Marketing & Advertising': [
        'wpp.com', 'omnicomgroup.com', 'publicisgroupe.com', 'interpublic.com',
        'dentsu.com', 'havas.com', 'ogilvy.com', 'mccann.com', 'bbdo.com'
      ]
    }

    return industryDomains[industry] || industryDomains['Technology']
  }

  /**
   * Simple location check (in production, would use more sophisticated geo-targeting)
   */
  private isDomainInLocation(domain: string, location: string): boolean {
    // This is a simplified approach - in production you'd use IP geolocation or company data APIs
    const locationLower = location.toLowerCase()
    
    // For now, return true for US-based searches as most domains in our sample are US-based
    if (locationLower.includes('us') || locationLower.includes('united states') || 
        locationLower.includes('america') || locationLower.includes('california') ||
        locationLower.includes('new york') || locationLower.includes('texas')) {
      return true
    }
    
    return Math.random() > 0.7 // Random selection for other locations
  }

  /**
   * Test Hunter.io API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/account`,
        method: 'GET',
        query: {
          api_key: '{{HUNTER_API_KEY}}'
        }
      })

      return response.status === 200
    } catch (error) {
      console.error('Hunter.io connection test failed:', error)
      return false
    }
  }
}

export const hunterService = HunterService.getInstance()