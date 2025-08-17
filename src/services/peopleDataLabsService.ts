import { blink } from '@/blink/client'

export interface PDLPersonEnrichment {
  id: string
  full_name: string
  first_name: string
  last_name: string
  middle_name?: string
  birth_year?: number
  birth_date?: string
  gender?: string
  location_names: string[]
  location_region?: string
  location_country?: string
  location_continent?: string
  location_street_address?: string
  location_address_line_2?: string
  location_name?: string
  location_postal_code?: string
  location_geo?: string
  location_last_updated?: string
  phone_numbers?: string[]
  emails?: Array<{
    address: string
    type?: string
    first_seen?: string
    last_seen?: string
    num_sources?: number
  }>
  interests?: string[]
  skills?: string[]
  location_names_deduped?: string[]
  regions?: string[]
  countries?: string[]
  street_addresses?: string[]
  experience?: Array<{
    company?: {
      name: string
      size?: string
      id?: string
      founded?: number
      industry?: string
      location?: {
        name?: string
        locality?: string
        region?: string
        country?: string
      }
      linkedin_url?: string
      website?: string
      twitter_url?: string
      facebook_url?: string
    }
    location_names?: string[]
    end_date?: string
    start_date?: string
    title?: {
      name: string
      role?: string
      sub_role?: string
      levels?: string[]
    }
    is_primary?: boolean
    summary?: string
  }>
  education?: Array<{
    school?: {
      name: string
      type?: string
      id?: string
      location?: {
        name?: string
        locality?: string
        region?: string
        country?: string
      }
      linkedin_url?: string
      website?: string
      domain?: string
    }
    end_date?: string
    start_date?: string
    gpa?: number
    degrees?: string[]
    majors?: string[]
    minors?: string[]
    summary?: string
  }>
  profiles?: Array<{
    network: string
    id?: string
    url: string
    username?: string
  }>
  version_status?: {
    status: number
    previous_version?: string
    current_version?: string
  }
}

export interface PDLCompanyEnrichment {
  id: string
  name: string
  display_name?: string
  size?: string
  employee_count?: number
  id_value?: string
  founded?: number
  industry?: string
  naics?: Array<{
    naics_code: string
    sector: string
    sub_sector?: string
    industry_group?: string
    naics_industry?: string
    national_industry?: string
  }>
  sic?: Array<{
    sic_code: string
    major_group: string
    industry_group?: string
    industry?: string
  }>
  location?: {
    name?: string
    locality?: string
    region?: string
    metro?: string
    country?: string
    continent?: string
    street_address?: string
    address_line_2?: string
    postal_code?: string
    geo?: string
  }
  linkedin_url?: string
  linkedin_id?: string
  linkedin_slug?: string
  website?: string
  domain?: string
  emails?: string[]
  phone_numbers?: string[]
  technologies?: Array<{
    name: string
    category?: string
  }>
  all_subsidiaries?: string[]
  alternative_names?: string[]
  alternative_domains?: string[]
  affiliated_profiles?: Array<{
    network: string
    url: string
    id?: string
  }>
  employee_count_by_country?: Record<string, number>
  type?: string
  ticker?: string
  gics_sector?: string
  mic_exchange?: string
  publicly_traded_exchange?: string
  publicly_traded_symbol?: string
  market_cap?: number
  employees?: Array<{
    pdl_id: string
    name: string
    title?: string
    emails?: string[]
    profiles?: Array<{
      network: string
      url: string
    }>
  }>
  funding?: Array<{
    funding_type?: string
    funding_stage?: string
    funding_date?: string
    funding_amount?: number
    investors?: string[]
  }>
  version_status?: {
    status: number
    previous_version?: string
    current_version?: string
  }
}

export interface PDLSearchResult {
  total: number
  results: PDLPersonEnrichment[]
  scroll_token?: string
}

export interface PDLBulkEnrichmentResult {
  results: Array<{
    status: number
    data?: PDLPersonEnrichment | PDLCompanyEnrichment
    error?: {
      type: string
      message: string
    }
  }>
}

export class PeopleDataLabsService {
  private static instance: PeopleDataLabsService
  private baseUrl = 'https://api.peopledatalabs.com/v5'
  
  private constructor() {}
  
  static getInstance(): PeopleDataLabsService {
    if (!PeopleDataLabsService.instance) {
      PeopleDataLabsService.instance = new PeopleDataLabsService()
    }
    return PeopleDataLabsService.instance
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/person/enrich`,
        method: 'GET',
        query: {
          email: 'test@example.com'
        },
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        }
      })

      // Even if the person is not found, a 404 response means the API is working
      return response.status === 200 || response.status === 404
    } catch (error) {
      console.error('PDL connection test failed:', error)
      return false
    }
  }

  /**
   * Enrich a person by email
   */
  async enrichPersonByEmail(email: string): Promise<PDLPersonEnrichment | null> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/person/enrich`,
        method: 'GET',
        query: {
          email: email,
          pretty: 'true'
        },
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200 && response.body) {
        return response.body as PDLPersonEnrichment
      }

      return null
    } catch (error) {
      console.error('PDL person enrichment error:', error)
      return null
    }
  }

  /**
   * Enrich a person by LinkedIn URL
   */
  async enrichPersonByLinkedIn(linkedinUrl: string): Promise<PDLPersonEnrichment | null> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/person/enrich`,
        method: 'GET',
        query: {
          linkedin_url: linkedinUrl,
          pretty: 'true'
        },
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200 && response.body) {
        return response.body as PDLPersonEnrichment
      }

      return null
    } catch (error) {
      console.error('PDL LinkedIn enrichment error:', error)
      return null
    }
  }

  /**
   * Enrich a company by domain
   */
  async enrichCompanyByDomain(domain: string): Promise<PDLCompanyEnrichment | null> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/company/enrich`,
        method: 'GET',
        query: {
          website: domain,
          pretty: 'true'
        },
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200 && response.body) {
        return response.body as PDLCompanyEnrichment
      }

      return null
    } catch (error) {
      console.error('PDL company enrichment error:', error)
      return null
    }
  }

  /**
   * Search for people by criteria
   */
  async searchPeople(criteria: {
    job_title?: string
    company?: string
    location?: string
    industry?: string
    seniority?: string
    size?: number
    scroll_token?: string
  }): Promise<PDLSearchResult> {
    try {
      const searchQuery: any = {}

      if (criteria.job_title) {
        searchQuery.job_title = criteria.job_title
      }

      if (criteria.company) {
        searchQuery.job_company_name = criteria.company
      }

      if (criteria.location) {
        searchQuery.location_name = criteria.location
      }

      if (criteria.industry) {
        searchQuery.job_company_industry = criteria.industry
      }

      if (criteria.seniority) {
        searchQuery.job_title_levels = criteria.seniority
      }

      const response = await blink.data.fetch({
        url: `${this.baseUrl}/person/search`,
        method: 'POST',
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        },
        body: {
          query: searchQuery,
          size: criteria.size || 10,
          pretty: true,
          scroll_token: criteria.scroll_token
        }
      })

      if (response.status === 200 && response.body) {
        return response.body as PDLSearchResult
      }

      return { total: 0, results: [] }
    } catch (error) {
      console.error('PDL people search error:', error)
      return { total: 0, results: [] }
    }
  }

  /**
   * Bulk enrich multiple people
   */
  async bulkEnrichPeople(requests: Array<{
    email?: string
    linkedin_url?: string
    name?: string
    company?: string
  }>): Promise<PDLBulkEnrichmentResult> {
    try {
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/person/bulk`,
        method: 'POST',
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        },
        body: {
          requests: requests.map(req => ({
            params: req
          }))
        }
      })

      if (response.status === 200 && response.body) {
        return response.body as PDLBulkEnrichmentResult
      }

      return { results: [] }
    } catch (error) {
      console.error('PDL bulk enrichment error:', error)
      return { results: [] }
    }
  }

  /**
   * Get company employees by domain
   */
  async getCompanyEmployees(domain: string, options?: {
    job_title?: string
    seniority?: string
    limit?: number
  }): Promise<PDLPersonEnrichment[]> {
    try {
      const searchQuery: any = {
        job_company_website: domain
      }

      if (options?.job_title) {
        searchQuery.job_title = options.job_title
      }

      if (options?.seniority) {
        searchQuery.job_title_levels = options.seniority
      }

      const response = await blink.data.fetch({
        url: `${this.baseUrl}/person/search`,
        method: 'POST',
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        },
        body: {
          query: searchQuery,
          size: options?.limit || 25,
          pretty: true
        }
      })

      if (response.status === 200 && response.body) {
        const result = response.body as PDLSearchResult
        return result.results || []
      }

      return []
    } catch (error) {
      console.error('PDL company employees search error:', error)
      return []
    }
  }

  /**
   * Find decision makers at a company
   */
  async findDecisionMakers(domain: string, department?: string): Promise<PDLPersonEnrichment[]> {
    try {
      const decisionMakerTitles = [
        'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'VP', 'Vice President',
        'Director', 'Head of', 'Manager', 'Lead', 'Principal'
      ]

      const searchQuery: any = {
        job_company_website: domain,
        job_title_levels: ['owner', 'c_suite', 'vp', 'director', 'manager']
      }

      if (department) {
        searchQuery.job_title_sub_role = department
      }

      const response = await blink.data.fetch({
        url: `${this.baseUrl}/person/search`,
        method: 'POST',
        headers: {
          'X-Api-Key': '{{PEOPLE_DATA_LABS_API_KEY}}',
          'Content-Type': 'application/json'
        },
        body: {
          query: searchQuery,
          size: 20,
          pretty: true
        }
      })

      if (response.status === 200 && response.body) {
        const result = response.body as PDLSearchResult
        return result.results || []
      }

      return []
    } catch (error) {
      console.error('PDL decision makers search error:', error)
      return []
    }
  }

  /**
   * Extract domain from website URL
   */
  private extractDomain(website: string): string {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0]
    }
  }

  /**
   * Calculate enrichment score based on available data
   */
  calculateEnrichmentScore(person: PDLPersonEnrichment): number {
    let score = 0

    // Basic info
    if (person.full_name) score += 10
    if (person.emails && person.emails.length > 0) score += 15
    if (person.phone_numbers && person.phone_numbers.length > 0) score += 10

    // Professional info
    if (person.experience && person.experience.length > 0) {
      score += 20
      const currentJob = person.experience.find(exp => !exp.end_date)
      if (currentJob) score += 15
    }

    // Education
    if (person.education && person.education.length > 0) score += 10

    // Social profiles
    if (person.profiles && person.profiles.length > 0) {
      score += 10
      const linkedinProfile = person.profiles.find(p => p.network === 'linkedin')
      if (linkedinProfile) score += 10
    }

    // Location
    if (person.location_names && person.location_names.length > 0) score += 5

    // Skills and interests
    if (person.skills && person.skills.length > 0) score += 5
    if (person.interests && person.interests.length > 0) score += 5

    return Math.min(score, 100)
  }

  /**
   * Format person data for display
   */
  formatPersonForDisplay(person: PDLPersonEnrichment): {
    name: string
    title: string
    company: string
    email: string
    phone: string
    linkedin: string
    location: string
    experience_summary: string
    enrichment_score: number
  } {
    const currentJob = person.experience?.find(exp => !exp.end_date) || person.experience?.[0]
    const primaryEmail = person.emails?.[0]?.address || ''
    const primaryPhone = person.phone_numbers?.[0] || ''
    const linkedinProfile = person.profiles?.find(p => p.network === 'linkedin')
    const location = person.location_names?.[0] || ''

    return {
      name: person.full_name || '',
      title: currentJob?.title?.name || '',
      company: currentJob?.company?.name || '',
      email: primaryEmail,
      phone: primaryPhone,
      linkedin: linkedinProfile?.url || '',
      location: location,
      experience_summary: this.generateExperienceSummary(person.experience || []),
      enrichment_score: this.calculateEnrichmentScore(person)
    }
  }

  /**
   * Generate experience summary
   */
  private generateExperienceSummary(experience: PDLPersonEnrichment['experience']): string {
    if (!experience || experience.length === 0) return ''

    const companies = experience
      .filter(exp => exp.company?.name)
      .slice(0, 3)
      .map(exp => exp.company!.name)

    return companies.length > 0 ? `Previously at ${companies.join(', ')}` : ''
  }
}

// Export singleton instance
export const peopleDataLabsService = PeopleDataLabsService.getInstance()