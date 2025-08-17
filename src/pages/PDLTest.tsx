import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, User, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { peopleDataLabsService } from '@/services/peopleDataLabsService'

export default function PDLTest() {
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [personData, setPersonData] = useState<any>(null)
  const [companyData, setCompanyData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const isConnected = await peopleDataLabsService.testConnection()
      setConnectionStatus(isConnected)
      
      if (!isConnected) {
        setError('Failed to connect to People Data Labs API. Please check your API key.')
      }
    } catch (error) {
      console.error('Connection test error:', error)
      setError('Connection test failed')
      setConnectionStatus(false)
    } finally {
      setLoading(false)
    }
  }

  const enrichPerson = async () => {
    if (!email.trim()) {
      setError('Please enter an email address')
      return
    }

    setLoading(true)
    setError(null)
    setPersonData(null)

    try {
      const data = await peopleDataLabsService.enrichPersonByEmail(email.trim())
      
      if (data) {
        setPersonData(data)
        console.log('PDL Person Data:', data)
      } else {
        setError('No data found for this email address')
      }
    } catch (error) {
      console.error('Person enrichment error:', error)
      setError('Failed to enrich person data')
    } finally {
      setLoading(false)
    }
  }

  const enrichCompany = async () => {
    if (!domain.trim()) {
      setError('Please enter a company domain')
      return
    }

    setLoading(true)
    setError(null)
    setCompanyData(null)

    try {
      const data = await peopleDataLabsService.enrichCompanyByDomain(domain.trim())
      
      if (data) {
        setCompanyData(data)
        console.log('PDL Company Data:', data)
      } else {
        setError('No data found for this domain')
      }
    } catch (error) {
      console.error('Company enrichment error:', error)
      setError('Failed to enrich company data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Sparkles className="w-8 h-8 mr-3 text-purple-600" />
          People Data Labs Integration Test
        </h1>
        <p className="text-gray-600 mt-1">
          Test the PDL API integration and data enrichment capabilities
        </p>
      </div>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            API Connection Test
          </CardTitle>
          <CardDescription>
            Verify that the People Data Labs API is properly configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={testConnection}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
            
            {connectionStatus !== null && (
              <div className="flex items-center space-x-2">
                {connectionStatus ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-600 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-600 font-medium">Connection Failed</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Person Enrichment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Person Enrichment
            </CardTitle>
            <CardDescription>
              Test person data enrichment by email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="e.g., john.doe@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={enrichPerson}
              disabled={loading || !email.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Enrich Person
            </Button>

            {/* Person Results */}
            {personData && (
              <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900">Enrichment Results:</h4>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>
                    <p>{personData.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>
                    <p>{personData.location_names?.[0] || 'N/A'}</p>
                  </div>
                </div>

                {personData.experience && personData.experience.length > 0 && (
                  <div>
                    <span className="font-medium">Current Role:</span>
                    <p className="text-sm">
                      {personData.experience[0].title?.name} at {personData.experience[0].company?.name}
                    </p>
                  </div>
                )}

                {personData.skills && personData.skills.length > 0 && (
                  <div>
                    <span className="font-medium">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {personData.skills.slice(0, 5).map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {personData.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{personData.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-medium">Enrichment Score:</span>
                  <p className="text-sm">
                    {peopleDataLabsService.calculateEnrichmentScore(personData)}/100
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Enrichment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Company Enrichment
            </CardTitle>
            <CardDescription>
              Test company data enrichment by domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Domain</label>
              <Input
                type="text"
                placeholder="e.g., company.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={enrichCompany}
              disabled={loading || !domain.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Enrich Company
            </Button>

            {/* Company Results */}
            {companyData && (
              <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900">Company Results:</h4>
                
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>
                    <p>{companyData.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Industry:</span>
                    <p>{companyData.industry || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Size:</span>
                    <p>{companyData.size || companyData.employee_count || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Founded:</span>
                    <p>{companyData.founded || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>
                    <p>{companyData.location?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Website:</span>
                    <p>{companyData.website || 'N/A'}</p>
                  </div>
                </div>

                {companyData.technologies && companyData.technologies.length > 0 && (
                  <div>
                    <span className="font-medium">Technologies:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {companyData.technologies.slice(0, 5).map((tech: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tech.name}
                        </Badge>
                      ))}
                      {companyData.technologies.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{companyData.technologies.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>Person Enrichment:</strong> Enter a professional email address to get detailed information about the person, including their current role, experience, skills, and social profiles.
          </p>
          <p>
            <strong>Company Enrichment:</strong> Enter a company domain (without http://) to get company information including industry, size, technologies used, and employee data.
          </p>
          <p>
            <strong>Note:</strong> This is a test interface. In production, enrichment happens automatically during lead generation for the top-scoring leads to optimize API usage costs.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}