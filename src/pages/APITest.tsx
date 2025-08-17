import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { hunterService } from '@/services/hunterService'
import { peopleDataLabsService } from '@/services/peopleDataLabsService'
import { googleMapsService } from '@/services/googleMapsService'

interface APITestResult {
  name: string
  status: 'testing' | 'success' | 'error'
  message: string
  details?: any
}

export default function APITest() {
  const [testResults, setTestResults] = useState<APITestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runAPITests = async () => {
    setIsRunning(true)
    setTestResults([])

    const tests: APITestResult[] = [
      { name: 'Hunter.io', status: 'testing', message: 'Testing connection...' },
      { name: 'People Data Labs', status: 'testing', message: 'Testing connection...' },
      { name: 'Google Maps', status: 'testing', message: 'Testing connection...' }
    ]

    setTestResults([...tests])

    // Test Hunter.io
    try {
      console.log('Testing Hunter.io connection...')
      const hunterConnected = await hunterService.testConnection()
      tests[0] = {
        name: 'Hunter.io',
        status: hunterConnected ? 'success' : 'error',
        message: hunterConnected ? 'Connection successful' : 'Connection failed - check API key',
        details: hunterConnected ? 'API key is valid and working' : 'Invalid or missing API key'
      }
      setTestResults([...tests])

      // If Hunter.io is connected, try a sample search
      if (hunterConnected) {
        try {
          console.log('Testing Hunter.io domain search...')
          const sampleResult = await hunterService.domainSearch('microsoft.com', 5)
          tests[0] = {
            ...tests[0],
            message: sampleResult ? `Connection successful - Found ${sampleResult.emails?.length || 0} emails` : 'Connection successful but no data returned',
            details: sampleResult ? `Domain: ${sampleResult.domain}, Organization: ${sampleResult.organization}` : 'No sample data available'
          }
          setTestResults([...tests])
        } catch (error) {
          console.error('Hunter.io sample search failed:', error)
        }
      }
    } catch (error) {
      console.error('Hunter.io test failed:', error)
      tests[0] = {
        name: 'Hunter.io',
        status: 'error',
        message: 'Connection failed',
        details: error?.message || 'Unknown error'
      }
      setTestResults([...tests])
    }

    // Test People Data Labs
    try {
      console.log('Testing People Data Labs connection...')
      const pdlConnected = await peopleDataLabsService.testConnection()
      tests[1] = {
        name: 'People Data Labs',
        status: pdlConnected ? 'success' : 'error',
        message: pdlConnected ? 'Connection successful' : 'Connection failed - check API key',
        details: pdlConnected ? 'API key is valid and working' : 'Invalid or missing API key'
      }
      setTestResults([...tests])

      // If PDL is connected, try a sample enrichment
      if (pdlConnected) {
        try {
          console.log('Testing PDL person enrichment...')
          const sampleResult = await peopleDataLabsService.enrichPersonByEmail('test@example.com')
          tests[1] = {
            ...tests[1],
            message: sampleResult ? 'Connection successful - Sample enrichment worked' : 'Connection successful but no sample data',
            details: sampleResult ? `Found profile for: ${sampleResult.full_name}` : 'No sample data available (expected for test email)'
          }
          setTestResults([...tests])
        } catch (error) {
          console.error('PDL sample enrichment failed:', error)
        }
      }
    } catch (error) {
      console.error('People Data Labs test failed:', error)
      tests[1] = {
        name: 'People Data Labs',
        status: 'error',
        message: 'Connection failed',
        details: error?.message || 'Unknown error'
      }
      setTestResults([...tests])
    }

    // Test Google Maps
    try {
      console.log('Testing Google Maps service...')
      const sampleBusinesses = await googleMapsService.searchBusinesses({
        query: 'restaurant',
        location: 'San Francisco, CA',
        limit: 5
      })
      
      tests[2] = {
        name: 'Google Maps',
        status: sampleBusinesses.length > 0 ? 'success' : 'error',
        message: sampleBusinesses.length > 0 ? `Connection successful - Found ${sampleBusinesses.length} businesses` : 'No businesses found',
        details: sampleBusinesses.length > 0 ? `Sample: ${sampleBusinesses[0]?.businessName}` : 'Service may be rate limited or unavailable'
      }
      setTestResults([...tests])
    } catch (error) {
      console.error('Google Maps test failed:', error)
      tests[2] = {
        name: 'Google Maps',
        status: 'error',
        message: 'Service failed',
        details: error?.message || 'Unknown error'
      }
      setTestResults([...tests])
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: APITestResult['status']) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusBadge = (status: APITestResult['status']) => {
    switch (status) {
      case 'testing':
        return <Badge className="bg-blue-100 text-blue-800">Testing</Badge>
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">API Connection Test</h1>
        <p className="text-gray-600 mt-1">Test connections to Hunter.io, People Data Labs, and Google Maps APIs</p>
      </div>

      <Alert>
        <AlertDescription>
          This page tests the API connections used for lead generation. Make sure your API keys are properly configured in the project secrets.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button 
          onClick={runAPITests} 
          disabled={isRunning}
          className="bg-indigo-600 hover:bg-indigo-700"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run API Tests'
          )}
        </Button>
      </div>

      {testResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testResults.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span>{result.name}</span>
                  </div>
                  {getStatusBadge(result.status)}
                </CardTitle>
                <CardDescription>
                  {result.message}
                </CardDescription>
              </CardHeader>
              {result.details && (
                <CardContent>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {result.details}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {testResults.length > 0 && !isRunning && (
        <Alert>
          <AlertDescription>
            <strong>Next Steps:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>If any API shows "Failed", check that the corresponding API key is correctly set in project secrets</li>
              <li>Hunter.io requires a valid API key from hunter.io</li>
              <li>People Data Labs requires a valid API key from peopledatalabs.com</li>
              <li>Google Maps uses a simulated service for demo purposes</li>
              <li>Once all APIs are connected, go back to Lead Generation to test the full workflow</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}