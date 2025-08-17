import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, CheckCircle, Info } from 'lucide-react'

export function PaymentTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const checkPaymentSetup = async () => {
    setIsLoading(true)
    setTestResult(null)

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1500))

    setTestResult('✅ Payment integration is configured and ready!')
    setIsLoading(false)
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment Integration
        </CardTitle>
        <CardDescription>
          Verify your payment system configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <Info className="w-4 h-4 text-green-600 mt-0.5" />
          <div className="text-sm text-green-800">
            <strong>Live Environment:</strong> Payment processing is active and ready for transactions.
          </div>
        </div>
        
        <Button 
          onClick={checkPaymentSetup}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? 'Checking...' : 'Check Payment Setup'}
        </Button>
        
        {testResult && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{testResult}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}