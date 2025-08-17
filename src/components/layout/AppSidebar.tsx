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
  MapPin,
  TestTube
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
  { name: 'Advanced Analytics', key: 'advanced-analytics', icon: BarChart3 },
  { name: 'Analytics', key: 'analytics', icon: BarChart3 },
  { name: 'CRM Integrations', key: 'crm-integrations', icon: Zap },
  { name: 'API Testing', key: 'api-test', icon: TestTube },
  { name: 'Agency Portal', key: 'agency', icon: Crown },
]

const bottomNavigation = [
  { name: 'Settings', key: 'settings', icon: Settings },
  { name: 'Billing', key: 'billing', icon: CreditCard },
]

export function AppSidebar({ currentPage, onPageChange, className }: AppSidebarProps) {

  return (
    <div className={cn('flex h-screen w-64 flex-col bg-gradient-to-b from-white via-slate-50/50 to-white border-r border-slate-200/60 shadow-soft', className)}>
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-200/60 bg-gradient-to-r from-white to-slate-50/30">
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center space-x-3 hover:opacity-80 transition-all duration-300 hover:scale-105"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center">
            <span className="text-2xl font-bold text-gradient-primary">Svara</span>
            <span className="text-xs font-bold text-white bg-gradient-accent px-2 py-1 rounded-full ml-2 shadow-soft">AI</span>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto pr-2">
        {navigation.map((item, index) => (
          <Button
            key={item.key}
            variant={currentPage === item.key ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start h-12 px-4 rounded-xl font-medium transition-all duration-300 animate-fade-in',
              currentPage === item.key 
                ? 'bg-gradient-primary text-white shadow-medium hover:shadow-large hover:scale-105' 
                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 hover:scale-102 hover-lift'
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => onPageChange(item.key)}
          >
            <item.icon className="mr-4 h-5 w-5" />
            <span className="text-sm">{item.name}</span>
          </Button>
        ))}


      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-200/60 p-4 space-y-2 bg-gradient-to-r from-slate-50/30 to-white">
        {bottomNavigation.map((item, index) => (
          <Button
            key={item.key}
            variant={currentPage === item.key ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start h-11 px-4 rounded-xl font-medium transition-all duration-300',
              currentPage === item.key 
                ? 'bg-gradient-primary text-white shadow-medium hover:shadow-large hover:scale-105' 
                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 hover-lift'
            )}
            onClick={() => onPageChange(item.key)}
          >
            <item.icon className="mr-4 h-5 w-5" />
            <span className="text-sm">{item.name}</span>
          </Button>
        ))}
      </div>

      {/* User Profile */}
      <div className="border-t border-slate-200/60 p-5 bg-gradient-to-r from-white to-slate-50/50">
        <div className="flex items-center space-x-4 p-3 rounded-xl bg-gradient-to-r from-slate-50/50 to-white shadow-soft hover-lift transition-all duration-300">
          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-soft">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              Svara User
            </p>
            <p className="text-xs text-gradient-accent font-medium truncate">
              Enterprise Plan
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}