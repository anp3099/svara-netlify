export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  dailyLeadLimit: number
  monthlyLeadLimit: number
  features: string[]
  isPopular?: boolean
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 97,
    dailyLeadLimit: 50, // 50 leads per day
    monthlyLeadLimit: 1500, // ~1,500 leads per month
    features: [
      'Niche targeting capabilities',
      'Verified email addresses',
      'CSV export functionality',
      'Google Maps lead discovery',
      'Basic lead scoring',
      'Email outreach automation',
      'Standard support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 297,
    dailyLeadLimit: 200, // 200 leads per day
    monthlyLeadLimit: 6000, // ~6,000 leads per month
    features: [
      'Bulk data processing',
      'Advanced industry filters',
      'AI outreach credits included',
      'Multi-source lead discovery',
      'AI-powered lead scoring',
      'Multi-channel outreach',
      'Priority support',
      'Advanced analytics'
    ],
    isPopular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 697,
    dailyLeadLimit: 500, // 500 leads per day
    monthlyLeadLimit: 15000, // ~15,000 leads per month
    features: [
      'Advanced filtering capabilities',
      'CRM synchronization',
      'AI workflow automation',
      'LinkedIn profile access',
      'AI-powered lead intelligence',
      'Omnichannel orchestration',
      'Dedicated support',
      'Custom analytics',
      'A/B testing'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0, // Custom pricing
    dailyLeadLimit: 1000, // 1,000+ leads per day
    monthlyLeadLimit: 30000, // 30,000+ leads per month
    features: [
      'Custom scraping solutions',
      'Intent data integration',
      'Full API access',
      'Dedicated onboarding',
      'White-label options',
      'Custom integrations',
      'Multi-tenant architecture',
      '24/7 dedicated support',
      'Custom SLA agreements'
    ]
  }
]

export const getCurrentUserPlan = (): SubscriptionPlan => {
  // In a real app, this would fetch from user's subscription data
  // For demo purposes, we'll return a default plan
  const userPlanId = localStorage.getItem('userPlan') || 'basic'
  return subscriptionPlans.find(plan => plan.id === userPlanId) || subscriptionPlans[0]
}

export const setUserPlan = (planId: string): void => {
  localStorage.setItem('userPlan', planId)
}

export const formatLeadCount = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(0)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K`
  }
  return count.toString()
}

export const formatDailyLeadLimit = (dailyLimit: number): string => {
  return `${dailyLimit} leads/day`
}

export const formatMonthlyLeadLimit = (monthlyLimit: number): string => {
  if (monthlyLimit >= 1_000) {
    return `${(monthlyLimit / 1_000).toFixed(1)}K leads/month`
  }
  return `${monthlyLimit} leads/month`
}