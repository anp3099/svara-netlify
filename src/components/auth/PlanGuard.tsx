import { ReactNode, useState, useEffect } from 'react'
import { blink } from '../../blink/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Lock, Crown, Zap } from 'lucide-react'

interface PlanGuardProps {
  children: ReactNode
  requiredPlan: 'starter' | 'professional' | 'enterprise'
  feature?: string
}

const planHierarchy = {
  starter: 1,
  professional: 2,
  enterprise: 3
}

const planNames = {
  starter: 'Starter',
  professional: 'Professional', 
  enterprise: 'Enterprise'
}

const planIcons = {
  starter: Zap,
  professional: Crown,
  enterprise: Lock
}

export function PlanGuard({ children, requiredPlan, feature }: PlanGuardProps) {
  const [user, setUser] = useState(null)
  const [userPlan, setUserPlan] = useState('starter')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      
      if (state.user) {
        try {
          // Fetch user's subscription plan from database
          const users = await blink.db.users.list({
            where: { id: state.user.id },
            limit: 1
          })
          
          if (users.length > 0) {
            setUserPlan(users[0].planType || 'starter')
          }
        } catch (error) {
          console.error('Error fetching user plan:', error)
          setUserPlan('starter')
        }
      }
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // RequireAuth should handle this
  }

  // Check if user's plan meets the requirement
  const userPlanLevel = planHierarchy[userPlan as keyof typeof planHierarchy] || 1
  const requiredPlanLevel = planHierarchy[requiredPlan]

  if (userPlanLevel >= requiredPlanLevel) {
    return <>{children}</>
  }

  // User doesn't have required plan, show upgrade prompt
  const RequiredIcon = planIcons[requiredPlan]
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-fit">
            <RequiredIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl">
            {planNames[requiredPlan]} Plan Required
          </CardTitle>
          <CardDescription>
            {feature ? (
              <>Access to <strong>{feature}</strong> requires the {planNames[requiredPlan]} plan or higher.</>
            ) : (
              <>This feature requires the {planNames[requiredPlan]} plan or higher.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            Your current plan: <strong className="capitalize">{userPlan}</strong>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => window.location.href = '/app?page=billing'}
              className="w-full"
            >
              Upgrade to {planNames[requiredPlan]}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="w-full"
            >
              Go Back
            </Button>
          </div>
          
          <div className="text-xs text-center text-gray-500">
            Need help? Contact our sales team for a custom plan.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}