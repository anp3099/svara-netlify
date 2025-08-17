import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Package, 
  Target, 
  MessageSquare, 
  Rocket, 
  ChevronRight,
  Plus,
  Sparkles
} from 'lucide-react'

const steps = [
  {
    id: 1,
    title: 'Add Products',
    description: 'Define your products or services',
    icon: Package,
    status: 'completed'
  },
  {
    id: 2,
    title: 'Create Campaign',
    description: 'Set targeting and parameters',
    icon: Target,
    status: 'current'
  },
  {
    id: 3,
    title: 'AI Generate Sequences',
    description: 'Let AI create personalized outreach',
    icon: MessageSquare,
    status: 'upcoming'
  },
  {
    id: 4,
    title: 'Launch',
    description: 'Deploy your campaign',
    icon: Rocket,
    status: 'upcoming'
  }
]

export function CampaignWizard() {
  const [currentStep, setCurrentStep] = useState(2)
  
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed'
    if (stepId === currentStep) return 'current'
    return 'upcoming'
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              4-Step Campaign Wizard
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Create and launch AI-powered outreach campaigns in minutes
            </p>
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{currentStep}/4 Steps</span>
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id)
            const Icon = step.icon
            
            return (
              <div
                key={step.id}
                className={`flex items-center p-4 rounded-lg border transition-all ${
                  status === 'current'
                    ? 'border-primary bg-primary/5'
                    : status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    status === 'current'
                      ? 'bg-primary text-white'
                      : status === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="ml-4 flex-1">
                  <h3 className={`font-medium ${
                    status === 'current' ? 'text-primary' : 'text-gray-900'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>

                {status === 'current' && (
                  <Button size="sm" className="ml-4">
                    Continue
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}

                {status === 'completed' && (
                  <div className="ml-4 text-green-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Quick Actions</h4>
              <p className="text-sm text-gray-600">Jump to any step or create new</p>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}