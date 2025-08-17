import { useState, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react'
import { AppSidebar } from './AppSidebar'
import { Dashboard } from '../../pages/Dashboard'

// Lazy load pages to avoid import issues
const Products = lazy(() => import('../../pages/Products'))
const Campaigns = lazy(() => import('../../pages/Campaigns'))
const AIAssistant = lazy(() => import('../../pages/AIAssistant'))
const CampaignBuilder = lazy(() => import('../../pages/CampaignBuilder'))
const MultiChannelOrchestration = lazy(() => import('../../pages/MultiChannelOrchestration'))
const LeadsDatabase = lazy(() => import('../../pages/LeadsDatabase'))
const LeadGeneration = lazy(() => import('../../pages/LeadGeneration'))
const GoogleMapsLeads = lazy(() => import('../../pages/GoogleMapsLeads'))
const AdvancedLeadIntelligence = lazy(() => import('../../pages/AdvancedLeadIntelligence'))
const LeadScoring = lazy(() => import('../../pages/LeadScoring'))
const IndustrySearch = lazy(() => import('../../pages/IndustrySearch'))
const AISequences = lazy(() => import('../../pages/AISequences'))
const PersonalizationEngine = lazy(() => import('../../pages/PersonalizationEngine'))
const PredictiveAnalytics = lazy(() => import('../../pages/PredictiveAnalytics'))
const AgencyPortal = lazy(() => import('../../pages/AgencyPortal'))
const Analytics = lazy(() => import('../../pages/Analytics'))
const AdvancedAnalytics = lazy(() => import('../../pages/AdvancedAnalytics'))
const CRMIntegrations = lazy(() => import('../../pages/CRMIntegrations'))
const APITest = lazy(() => import('../../pages/APITest'))
const Settings = lazy(() => import('../../pages/Settings'))
const Billing = lazy(() => import('../../pages/Billing'))
const LeadPipeline = lazy(() => import('../../pages/LeadPipeline'))

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h3>
            <p className="text-sm text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Loading component
const PageLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
)

// Error boundary component
const PageError = ({ error, retry }: { error: string, retry: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="text-red-600 text-center">
      <h3 className="text-lg font-semibold">Page Error</h3>
      <p className="text-sm">{error}</p>
    </div>
    <button 
      onClick={retry}
      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
    >
      Try Again
    </button>
  </div>
)

export function RobustAppLayout() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [pageError, setPageError] = useState<string | null>(null)

  const renderPage = () => {
    console.log('🎯 RobustAppLayout rendering page:', currentPage)
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />
      case 'ai-assistant':
        return (
          <Suspense fallback={<PageLoading />}>
            <AIAssistant />
          </Suspense>
        )
      case 'campaign-builder':
        return (
          <Suspense fallback={<PageLoading />}>
            <CampaignBuilder />
          </Suspense>
        )
      case 'multi-channel':
        return (
          <Suspense fallback={<PageLoading />}>
            <MultiChannelOrchestration />
          </Suspense>
        )
      case 'products':
        return (
          <Suspense fallback={<PageLoading />}>
            <Products />
          </Suspense>
        )
      case 'campaigns':
        return (
          <Suspense fallback={<PageLoading />}>
            <Campaigns />
          </Suspense>
        )
      case 'leads':
        return (
          <Suspense fallback={<PageLoading />}>
            <LeadsDatabase />
          </Suspense>
        )
      case 'lead-generation':
        return (
          <Suspense fallback={<PageLoading />}>
            <LeadGeneration />
          </Suspense>
        )
      case 'google-maps':
        return (
          <Suspense fallback={<PageLoading />}>
            <GoogleMapsLeads />
          </Suspense>
        )
      case 'lead-intelligence':
        return (
          <Suspense fallback={<PageLoading />}>
            <AdvancedLeadIntelligence />
          </Suspense>
        )
      case 'lead-scoring':
        return (
          <Suspense fallback={<PageLoading />}>
            <LeadScoring />
          </Suspense>
        )
      case 'industries':
        return (
          <Suspense fallback={<PageLoading />}>
            <IndustrySearch />
          </Suspense>
        )
      case 'sequences':
        return (
          <Suspense fallback={<PageLoading />}>
            <AISequences />
          </Suspense>
        )
      case 'personalization':
        return (
          <Suspense fallback={<PageLoading />}>
            <PersonalizationEngine />
          </Suspense>
        )
      case 'predictive':
        return (
          <Suspense fallback={<PageLoading />}>
            <PredictiveAnalytics />
          </Suspense>
        )
      case 'agency':
        return (
          <Suspense fallback={<PageLoading />}>
            <AgencyPortal />
          </Suspense>
        )
      case 'analytics':
        return (
          <Suspense fallback={<PageLoading />}>
            <Analytics />
          </Suspense>
        )
      case 'advanced-analytics':
        return (
          <Suspense fallback={<PageLoading />}>
            <AdvancedAnalytics />
          </Suspense>
        )
      case 'crm-integrations':
        return (
          <Suspense fallback={<PageLoading />}>
            <CRMIntegrations />
          </Suspense>
        )
      case 'api-test':
        return (
          <Suspense fallback={<PageLoading />}>
            <APITest />
          </Suspense>
        )
      case 'settings':
        return (
          <Suspense fallback={<PageLoading />}>
            <Settings />
          </Suspense>
        )
      case 'billing':
        return (
          <Suspense fallback={<PageLoading />}>
            <Billing />
          </Suspense>
        )
      case 'lead-pipeline':
        return (
          <Suspense fallback={<PageLoading />}>
            <LeadPipeline />
          </Suspense>
        )
      default:
        return <Dashboard onPageChange={setCurrentPage} />
    }
  }

  if (pageError) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <PageError error={pageError} retry={() => setPageError(null)} />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}