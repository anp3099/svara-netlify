import React, { useState } from 'react'
import { Plus, Target, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import IndustrySearch from '@/components/IndustrySearch'

interface Industry {
  id: string
  name: string
  description: string
  company_count: number
  avg_revenue: string
  growth_rate: string
  key_roles: string[]
}

export default function IndustrySearchPage() {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [targetedIndustries, setTargetedIndustries] = useState<Industry[]>([])

  const handleIndustrySelect = (industry: Industry) => {
    if (selectedIndustries.includes(industry.id)) {
      setSelectedIndustries(prev => prev.filter(id => id !== industry.id))
      setTargetedIndustries(prev => prev.filter(ind => ind.id !== industry.id))
    } else {
      setSelectedIndustries(prev => [...prev, industry.id])
      setTargetedIndustries(prev => [...prev, industry])
    }
  }

  const createCampaignFromIndustries = () => {
    // This would navigate to campaign creation with pre-selected industries
    console.log('Creating campaign for industries:', targetedIndustries)
    // For now, just show success message
    alert(`Campaign targeting ${targetedIndustries.length} industries is ready to be created!`)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`
    }
    return num.toString()
  }

  const totalCompanies = targetedIndustries.reduce((sum, ind) => sum + ind.company_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Industry Targeting</h1>
          <p className="text-gray-600 mt-1">Search and select industries for your outreach campaigns</p>
        </div>
        {selectedIndustries.length > 0 && (
          <Button onClick={createCampaignFromIndustries} className="bg-indigo-600 hover:bg-indigo-700">
            <Target className="w-4 h-4 mr-2" />
            Create Campaign ({selectedIndustries.length})
          </Button>
        )}
      </div>

      {/* Selected Industries Summary */}
      {targetedIndustries.length > 0 && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">Selected Industries</CardTitle>
            <CardDescription className="text-indigo-700">
              Your campaign will target {formatNumber(totalCompanies)} companies across {targetedIndustries.length} industries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-sm text-indigo-600">Total Companies</div>
                  <div className="text-lg font-semibold text-indigo-900">{formatNumber(totalCompanies)}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-sm text-indigo-600">Avg. Growth Rate</div>
                  <div className="text-lg font-semibold text-indigo-900">
                    {targetedIndustries.length > 0 
                      ? `+${(targetedIndustries.reduce((sum, ind) => sum + parseFloat(ind.growth_rate.replace('%', '').replace('+', '')), 0) / targetedIndustries.length).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-sm text-indigo-600">Industries</div>
                  <div className="text-lg font-semibold text-indigo-900">{targetedIndustries.length}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {targetedIndustries.map((industry) => (
                <Badge key={industry.id} className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                  {industry.name}
                  <button
                    onClick={() => handleIndustrySelect(industry)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Search Component */}
      <IndustrySearch 
        onIndustrySelect={handleIndustrySelect}
        selectedIndustries={selectedIndustries}
      />
    </div>
  )
}