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
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-4xl font-bold text-gradient-primary mb-2">Dashboard</h1>
        <p className="text-slate-600 text-lg font-medium">
          Welcome back! Here's what's happening with your campaigns.
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Upgrade CTA */}
      <Card className="card-enhanced bg-gradient-to-r from-indigo-50 via-purple-50/50 to-pink-50/30 border-indigo-200/50 hover-lift animate-scale-in shadow-medium">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="p-4 bg-gradient-primary rounded-2xl shadow-soft animate-bounce-subtle">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Ready to Scale Your Outreach?</h3>
                <p className="text-slate-600 font-medium">Unlock unlimited campaigns, 70M+ leads database, and AI-powered sequences</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => onPageChange?.('billing')}
                className="btn-gradient px-6 py-3 text-base font-semibold rounded-xl hover-glow"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Upgrade Now
              </Button>
              <Button 
                onClick={() => onPageChange?.('lead-generation')}
                variant="outline"
                className="px-6 py-3 text-base font-semibold rounded-xl border-2 hover-lift"
              >
                <Zap className="w-5 h-5 mr-2" />
                Try Lead Gen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        {/* Campaign Wizard - Takes 2 columns */}
        <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CampaignWizard />
        </div>
        
        {/* Recent Activity - Takes 1 column */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <RecentActivity />
        </div>
      </div>

      {/* Performance Chart and Top Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        {/* Performance Chart - Takes 2 columns */}
        <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <PerformanceChart />
        </div>
        
        {/* Top Campaigns - Takes 1 column */}
        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <TopCampaigns />
        </div>
      </div>
    </div>
  )
}