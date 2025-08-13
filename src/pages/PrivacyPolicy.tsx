import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Eye, Lock, Database, Mail, UserX } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-xl text-muted-foreground">
              How we collect, use, and protect your information
            </p>
            <Badge variant="outline" className="text-sm">
              Last updated: {new Date().toLocaleDateString()}
            </Badge>
          </div>

          {/* Privacy Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <Shield className="h-8 w-8 mx-auto text-green-600" />
                <CardTitle className="text-lg">Data Protection</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  GDPR & CCPA compliant data handling
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Eye className="h-8 w-8 mx-auto text-blue-600" />
                <CardTitle className="text-lg">Transparency</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Clear disclosure of data sources
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <UserX className="h-8 w-8 mx-auto text-purple-600" />
                <CardTitle className="text-lg">Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Easy opt-out and data removal
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Data Rights & Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">
                Exercise your data rights or request removal from our platform:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm">
                  Request Data Export
                </Button>
                <Button variant="outline" size="sm">
                  Delete My Data
                </Button>
                <Button variant="outline" size="sm">
                  Opt-Out of Processing
                </Button>
                <Button variant="outline" size="sm">
                  Contact Privacy Team
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Policy Content */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mb-3">Account Information</h3>
              <p className="mb-4">When you create an account, we collect:</p>
              <ul className="list-disc pl-6 mb-6 space-y-1">
                <li>Email address and name</li>
                <li>Company information (optional)</li>
                <li>Billing information for paid plans</li>
                <li>Usage preferences and settings</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">Usage Data</h3>
              <p className="mb-4">We automatically collect:</p>
              <ul className="list-disc pl-6 mb-6 space-y-1">
                <li>Platform usage statistics and analytics</li>
                <li>API call logs and performance metrics</li>
                <li>Search queries and campaign data</li>
                <li>Device and browser information</li>
              </ul>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">2. Data Sources</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-2">Third-Party Data Sources</h3>
                    <p className="text-yellow-700 text-sm mb-3">
                      Svara enhances lead generation capabilities by integrating with services 
                      like Hunter.io and People Data Labs. These services provide publicly 
                      available or licensed data for enrichment.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-4">The data we access may include:</p>
              <ul className="list-disc pl-6 mb-6 space-y-1">
                <li>Professional email addresses</li>
                <li>Job titles and company information</li>
                <li>Social and professional profiles</li>
                <li>Business contact information</li>
                <li>Company size and industry data</li>
              </ul>

              <p className="mb-6">
                <strong>Important:</strong> We do not collect or store sensitive personal data 
                (e.g., financial, health, or government ID information). We do not sell personal 
                data to third parties.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use collected information to:</p>
              <ul className="list-disc pl-6 mb-6 space-y-1">
                <li>Provide and improve our lead generation services</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send service updates and support communications</li>
                <li>Analyze usage patterns to enhance platform performance</li>
                <li>Ensure compliance with usage limits and terms</li>
                <li>Prevent fraud and maintain platform security</li>
              </ul>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
              <p className="mb-4">We may share your information with:</p>
              
              <h3 className="text-lg font-semibold mb-3">Service Providers</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Payment processors (Stripe) for billing</li>
                <li>Cloud hosting providers for data storage</li>
                <li>Analytics services for platform improvement</li>
                <li>Customer support tools</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">Legal Requirements</h3>
              <p className="mb-6">
                We may disclose information when required by law, to protect our rights, 
                or to comply with legal processes.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p className="mb-4">We implement industry-standard security measures:</p>
              <ul className="list-disc pl-6 mb-6 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and authentication</li>
                <li>Secure API integrations with third-party services</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
              
              <h3 className="text-lg font-semibold mb-3">GDPR Rights (EU Users)</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate information</li>
                <li><strong>Erasure:</strong> Request deletion of your data</li>
                <li><strong>Portability:</strong> Export your data in a structured format</li>
                <li><strong>Objection:</strong> Object to processing of your data</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">CCPA Rights (California Users)</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Know what personal information is collected</li>
                <li>Delete personal information</li>
                <li>Opt-out of the sale of personal information</li>
                <li>Non-discrimination for exercising privacy rights</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">How to Exercise Your Rights</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="mb-3">Contact us to exercise your privacy rights:</p>
                <p><strong>Email:</strong> privacy@svara.tech</p>
                <p><strong>Subject Line:</strong> "Privacy Rights Request"</p>
                <p><strong>Include:</strong> Your account email and specific request</p>
              </div>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
              <p className="mb-4">We retain your information for:</p>
              <ul className="list-disc pl-6 mb-6 space-y-1">
                <li>Account data: Until account deletion + 30 days</li>
                <li>Usage logs: 12 months for analytics and support</li>
                <li>Billing records: 7 years for tax and legal compliance</li>
                <li>Marketing data: Until you opt-out or request deletion</li>
              </ul>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">8. Opt-Out and Data Removal</h2>
              <p className="mb-4">
                You can request removal of your data from our platform by contacting 
                support@svara.tech. We will process your request within 30 days.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-2">Easy Opt-Out Process</h3>
                <p className="text-green-700 text-sm">
                  We respect your privacy choices. Our opt-out process is simple and 
                  we will confirm completion of your request via email.
                </p>
              </div>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
              <p className="mb-6">
                Your data may be processed in countries other than your own. We ensure 
                appropriate safeguards are in place for international transfers, including 
                standard contractual clauses and adequacy decisions.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
              <p className="mb-6">
                We may update this Privacy Policy periodically. We will notify you of 
                significant changes via email or platform notifications. The "Last updated" 
                date at the top indicates when changes were made.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
              <p className="mb-4">
                For privacy-related questions or concerns, contact our Privacy Team:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p><strong>Privacy Officer:</strong> privacy@svara.tech</p>
                <p><strong>General Support:</strong> support@svara.tech</p>
                <p><strong>Address:</strong> [Your Business Address]</p>
                <p><strong>Response Time:</strong> Within 72 hours</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}