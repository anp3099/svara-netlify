import { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { Dashboard } from '../../pages/Dashboard'
import Products from '../../pages/Products'
import Campaigns from '../../pages/Campaigns'
import LeadsDatabase from '../../pages/LeadsDatabase'
import LeadGeneration from '../../pages/LeadGeneration'
import GoogleMapsLeads from '../../pages/GoogleMapsLeads'
import AdvancedLeadIntelligence from '../../pages/AdvancedLeadIntelligence'
import LeadScoring from '../../pages/LeadScoring'
import IndustrySearch from '../../pages/IndustrySearch'
import AISequences from '../../pages/AISequences'
import PersonalizationEngine from '../../pages/PersonalizationEngine'
import PredictiveAnalytics from '../../pages/PredictiveAnalytics'
import AgencyPortal from '../../pages/AgencyPortal'
import Analytics from '../../pages/Analytics'
import AdvancedAnalytics from '../../pages/AdvancedAnalytics'
import CRMIntegrations from '../../pages/CRMIntegrations'
import APITest from '../../pages/APITest'
import Settings from '../../pages/Settings'
import Billing from '../../pages/Billing'
import AIAssistant from '../../pages/AIAssistant'
import CampaignBuilder from '../../pages/CampaignBuilder'
import MultiChannelOrchestration from '../../pages/MultiChannelOrchestration'
import LeadPipeline from '../../pages/LeadPipeline'

export function AppLayout() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  
  console.log('🔥 AppLayout rendering, currentPage:', currentPage)

  const renderPage = () => {
    console.log('🔥 Rendering page:', currentPage)
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />
      case 'ai-assistant':
        return <AIAssistant />
      case 'campaign-builder':
        return <CampaignBuilder />
      case 'multi-channel':
        return <MultiChannelOrchestration />
      case 'products':
        return <Products />
      case 'campaigns':
        return <Campaigns />
      case 'leads':
        return <LeadsDatabase />
      case 'lead-generation':
        return <LeadGeneration />
      case 'google-maps':
        return <GoogleMapsLeads />
      case 'lead-intelligence':
        return <AdvancedLeadIntelligence />
      case 'lead-scoring':
        return <LeadScoring />
      case 'industries':
        return <IndustrySearch />
      case 'sequences':
        return <AISequences />
      case 'personalization':
        return <PersonalizationEngine />
      case 'predictive':
        return <PredictiveAnalytics />
      case 'agency':
        return <AgencyPortal />
      case 'analytics':
        return <Analytics />
      case 'advanced-analytics':
        return <AdvancedAnalytics />
      case 'crm-integrations':
        return <CRMIntegrations />
      case 'api-test':
        return <APITest />
      case 'settings':
        return <Settings />
      case 'billing':
        return <Billing />
      case 'lead-pipeline':
        return <LeadPipeline />
      default:
        return <Dashboard onPageChange={setCurrentPage} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AppSidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}