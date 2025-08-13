import { StatsCards } from '@/components/dashboard/StatsCards'
import { CampaignWizard } from '@/components/dashboard/CampaignWizard'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { TopCampaigns } from '@/components/dashboard/TopCampaigns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Crown, Zap, CreditCard, Info } from 'lucide-react'

interface DashboardProps {
  onPageChange?: (page: string) => void
}

export function Dashboard({ onPageChange }: DashboardProps = {}) {
  console.log('🔥 Dashboard component rendering')
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening with your campaigns.
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Upgrade CTA */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 rounded-full">
                <Crown className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ready to Scale Your Outreach?</h3>
                <p className="text-gray-600">Unlock unlimited campaigns, 70M+ leads database, and AI-powered sequences</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => onPageChange?.('billing')}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
              <Button 
                onClick={() => onPageChange?.('lead-generation')}
                variant="outline"
              >
                <Zap className="w-4 h-4 mr-2" />
                Try Lead Gen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Wizard - Takes 2 columns */}
        <CampaignWizard />
        
        {/* Recent Activity - Takes 1 column */}
        <RecentActivity />
      </div>

      {/* Performance Chart and Top Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart - Takes 2 columns */}
        <PerformanceChart />
        
        {/* Top Campaigns - Takes 1 column */}
        <TopCampaigns />
      </div>
    </div>
  )
}