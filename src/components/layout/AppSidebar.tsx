import { useState } from 'react'
import { 
  BarChart3, 
  Database, 
  Home, 
  MessageSquare, 
  Settings, 
  Target, 
  Users, 
  CreditCard,
  Zap,
  ChevronDown,
  ChevronRight,
  Package,
  Building2,
  Search,
  Wand2,
  Star,
  Bot,
  Mail,
  Brain,
  TrendingUp,
  Crown,
  Palette,
  MapPin,
  TestTube
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface AppSidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  className?: string
}

const navigation = [
  { name: 'Dashboard', key: 'dashboard', icon: Home },
  { name: 'AI Assistant', key: 'ai-assistant', icon: Bot },
  { name: 'Campaign Builder', key: 'campaign-builder', icon: Wand2 },
  { name: 'Multi-Channel', key: 'multi-channel', icon: Mail },
  { name: 'Products', key: 'products', icon: Package },
  { name: 'Campaigns', key: 'campaigns', icon: Target },
  { name: 'Leads Database', key: 'leads', icon: Database },
  { name: 'Lead Generation', key: 'lead-generation', icon: Search },
  { name: 'Google Maps Leads', key: 'google-maps', icon: MapPin },
  { name: 'Lead Intelligence', key: 'lead-intelligence', icon: TrendingUp },
  { name: 'Lead Scoring', key: 'lead-scoring', icon: Star },
  { name: 'Industry Search', key: 'industries', icon: Building2 },
  { name: 'AI Sequences', key: 'sequences', icon: MessageSquare },
  { name: 'Personalization', key: 'personalization', icon: Brain },
  { name: 'Predictive Analytics', key: 'predictive', icon: TrendingUp },
  { name: 'Agency Portal', key: 'agency', icon: Crown },
  { name: 'Analytics', key: 'analytics', icon: BarChart3 },
]

const bottomNavigation = [
  { name: 'CRM Integrations', key: 'crm-integrations', icon: Zap },
  { name: 'API Test', key: 'api-test', icon: TestTube },
  { name: 'Settings', key: 'settings', icon: Settings },
  { name: 'Billing', key: 'billing', icon: CreditCard },
]

export function AppSidebar({ currentPage, onPageChange, className }: AppSidebarProps) {
  const [isAIOpen, setIsAIOpen] = useState(false)

  return (
    <div className={cn('flex h-full w-64 flex-col bg-card border-r border-border', className)}>
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center">
            <span className="text-xl font-semibold text-foreground">Svara</span>
            <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">AI</span>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <Button
            key={item.key}
            variant={currentPage === item.key ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start h-10 px-3',
              currentPage === item.key 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'text-foreground hover:bg-muted'
            )}
            onClick={() => onPageChange(item.key)}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Button>
        ))}

        {/* AI Tools Collapsible */}
        <Collapsible open={isAIOpen} onOpenChange={setIsAIOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between h-10 px-3 text-foreground hover:bg-muted"
            >
              <div className="flex items-center">
                <Zap className="mr-3 h-5 w-5" />
                AI Tools
              </div>
              {isAIOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pl-6">
            <Button
              variant="ghost"
              className="w-full justify-start h-9 px-3 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => onPageChange('sequences')}
            >
              Sequence Generator
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-9 px-3 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => onPageChange('leads')}
            >
              Lead Scoring
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-9 px-3 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => onPageChange('analytics')}
            >
              Response Analysis
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border p-3 space-y-1">
        {bottomNavigation.map((item) => (
          <Button
            key={item.key}
            variant={currentPage === item.key ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start h-10 px-3',
              currentPage === item.key 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'text-foreground hover:bg-muted'
            )}
            onClick={() => onPageChange(item.key)}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Button>
        ))}
      </div>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Svara User
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Enterprise Plan
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}