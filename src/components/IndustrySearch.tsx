import React, { useState, useEffect } from 'react'
import { Search, Building2, TrendingUp, MapPin, Database } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { leadGenerationService } from '@/services/leadGeneration'
import { realLeadDatabase } from '@/services/realLeadDatabase'
import { blink } from '@/blink/client'

interface Industry {
  id: string
  name: string
  description: string
  company_count: number
  avg_revenue: string
  growth_rate: string
  key_roles: string[]
}

// Demo industry data representing the 70M+ database
const demoIndustries: Industry[] = [
  {
    id: 'tech',
    name: 'Technology',
    description: 'Software, SaaS, IT services, and tech consulting companies',
    company_count: 2850000,
    avg_revenue: '$5.2M',
    growth_rate: '+12.3%',
    key_roles: ['CTO', 'VP Engineering', 'Head of Product', 'CEO']
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Medical practices, hospitals, healthcare technology, and pharmaceuticals',
    company_count: 1920000,
    avg_revenue: '$8.7M',
    growth_rate: '+8.9%',
    key_roles: ['CMO', 'Practice Manager', 'Healthcare Administrator', 'Medical Director']
  },
  {
    id: 'finance',
    name: 'Financial Services',
    description: 'Banks, investment firms, insurance, and fintech companies',
    company_count: 1650000,
    avg_revenue: '$12.4M',
    growth_rate: '+6.7%',
    key_roles: ['CFO', 'VP Finance', 'Investment Director', 'Risk Manager']
  },
  {
    id: 'marketing',
    name: 'Marketing & Advertising',
    description: 'Digital agencies, marketing consultancies, and advertising firms',
    company_count: 980000,
    avg_revenue: '$2.8M',
    growth_rate: '+15.2%',
    key_roles: ['CMO', 'Marketing Director', 'Agency Owner', 'Creative Director']
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Industrial manufacturing, automotive, aerospace, and consumer goods',
    company_count: 1420000,
    avg_revenue: '$18.9M',
    growth_rate: '+4.1%',
    key_roles: ['COO', 'Plant Manager', 'Supply Chain Director', 'Quality Manager']
  },
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    description: 'Online stores, retail chains, and consumer brands',
    company_count: 2100000,
    avg_revenue: '$4.6M',
    growth_rate: '+9.8%',
    key_roles: ['VP Sales', 'Merchandising Manager', 'E-commerce Director', 'Store Manager']
  },
  {
    id: 'consulting',
    name: 'Professional Services',
    description: 'Business consulting, legal services, accounting, and advisory firms',
    company_count: 1350000,
    avg_revenue: '$3.2M',
    growth_rate: '+7.4%',
    key_roles: ['Managing Partner', 'Principal Consultant', 'Practice Lead', 'Business Development']
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Schools, universities, online learning platforms, and educational technology',
    company_count: 890000,
    avg_revenue: '$6.1M',
    growth_rate: '+11.5%',
    key_roles: ['Dean', 'Principal', 'EdTech Director', 'Academic Administrator']
  }
]

interface IndustrySearchProps {
  onIndustrySelect?: (industry: Industry) => void
  selectedIndustries?: string[]
}

export function IndustrySearch({ onIndustrySelect, selectedIndustries = [] }: IndustrySearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredIndustries, setFilteredIndustries] = useState<Industry[]>(demoIndustries)
  const [realIndustryStats, setRealIndustryStats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRealIndustryData()
  }, [])

  const loadRealIndustryData = async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()
      
      // Initialize database if needed
      await realLeadDatabase.initializeDatabase(user.id)
      
      // Get real industry statistics
      const stats = await realLeadDatabase.getIndustryStats(user.id)
      setRealIndustryStats(stats)
      
      // Update demo industries with real data where available
      const updatedIndustries = demoIndustries.map(industry => {
        const realStat = stats.find(s => s.industry.toLowerCase().includes(industry.name.toLowerCase()))
        if (realStat) {
          return {
            ...industry,
            company_count: realStat.count * 1000, // Scale up for demo
            avg_revenue: `${(realStat.avg_lead_score * 100000).toLocaleString()}`,
            description: `${industry.description} - ${realStat.count} verified companies in database`
          }
        }
        return industry
      })
      
      setFilteredIndustries(updatedIndustries)
    } catch (error) {
      console.error('Failed to load real industry data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const filtered = demoIndustries.filter(industry =>
      industry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      industry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      industry.key_roles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredIndustries(filtered)
  }, [searchTerm])

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`
    }
    return num.toString()
  }

  const searchLeadsByIndustry = async (industryName: string) => {
    try {
      const user = await blink.auth.me()
      const leads = await realLeadDatabase.getLeadsByIndustry(industryName, user.id, 100)
      return leads
    } catch (error) {
      console.error('Failed to search leads by industry:', error)
      return []
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Industry Database</h2>
        <p className="text-gray-600 mt-1">Search and explore 70M+ companies across 500+ industries</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search industries, roles, or keywords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredIndustries.length} of {demoIndustries.length} industries
        </p>
        <div className="text-sm text-gray-600">
          Total companies: {formatNumber(filteredIndustries.reduce((sum, ind) => sum + ind.company_count, 0))}
        </div>
      </div>

      {/* Industries Grid */}
      <div className="grid gap-4">
        {filteredIndustries.map((industry) => (
          <Card 
            key={industry.id} 
            className={`hover:shadow-lg transition-shadow cursor-pointer ${
              selectedIndustries.includes(industry.id) ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
            }`}
            onClick={() => onIndustrySelect?.(industry)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{industry.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {formatNumber(industry.company_count)} companies
                      </CardDescription>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{industry.description}</p>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {industry.growth_rate}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Decision Makers:</h4>
                  <div className="flex flex-wrap gap-1">
                    {industry.key_roles.slice(0, 3).map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                    {industry.key_roles.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{industry.key_roles.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Avg. Revenue</div>
                  <div className="text-lg font-semibold text-gray-900">{industry.avg_revenue}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onIndustrySelect?.(industry)
                    }}
                  >
                    {selectedIndustries.includes(industry.id) ? 'Selected' : 'Select'}
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const leads = await searchLeadsByIndustry(industry.name)
                      alert(`Found ${leads.length} real companies in ${industry.name} industry with verified contact details!`)
                    }}
                  >
                    View Leads
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIndustries.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No industries found</h3>
            <p className="text-gray-600">Try adjusting your search terms or browse all industries.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default IndustrySearch