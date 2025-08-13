import React, { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { paymentGateway } from '@/services/paymentGateway'
import { blink } from '@/blink/client'

interface PricingCardProps {
  title: string
  price: string
  description: string
  features: string[]
  isPopular?: boolean
  priceId: string
  onSubscribe: (priceId: string) => void
}

export function PricingCard({ 
  title, 
  price, 
  description, 
  features, 
  isPopular = false,
  priceId,
  onSubscribe
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      // Get user email for prefilling
      let customerEmail = ''
      try {
        const user = await blink.auth.me()
        customerEmail = user.email || ''
      } catch (error) {
        // User not logged in, continue without email
        console.log('User not authenticated, proceeding without email prefill')
      }

      // Create secure checkout session using payment gateway
      const session = await paymentGateway.createCheckoutSession({
        priceId,
        customerEmail,
        trialPeriodDays: 14,
        allowPromotionCodes: true,
        successUrl: `${window.location.origin}/dashboard?success=true&plan=${title.toLowerCase()}`,
        cancelUrl: `${window.location.origin}/pricing`
      })
      
      if (session.url) {
        // Open Stripe Checkout in new tab (required for iframe compatibility)
        window.open(session.url, '_blank')
        
        // Call the onSubscribe callback
        onSubscribe(priceId)
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Payment system temporarily unavailable. Please try again or contact support.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`relative rounded-2xl border p-8 ${
      isPopular 
        ? 'border-indigo-500 bg-indigo-50 shadow-lg' 
        : 'border-gray-200 bg-white'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
        <div className="mt-6">
          <span className="text-4xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-600">/month</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">14-day free trial included</p>
      </div>

      <ul className="mt-8 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={isLoading}
        className={`mt-8 w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center ${
          isPopular
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400'
            : 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-600'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Session...
          </>
        ) : (
          'Start Free Trial'
        )}
      </button>
      
      <p className="text-xs text-gray-500 text-center mt-3">
        No credit card required • Cancel anytime
      </p>
    </div>
  )
}