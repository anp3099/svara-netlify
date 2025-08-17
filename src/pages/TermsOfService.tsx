import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Shield, Scale, Database, AlertTriangle } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="text-xl text-muted-foreground">
              Legal terms and conditions for using Svara AI Sales Outreach Platform
            </p>
            <Badge variant="outline" className="text-sm">
              Last updated: {new Date().toLocaleDateString()}
            </Badge>
          </div>

          {/* Key Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <Database className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Data Usage</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Third-party data enrichment via licensed APIs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Privacy First</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  GDPR, CCPA, and CAN-SPAM compliant
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Scale className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Fair Usage</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Quota limits and responsible usage policies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Terms Content */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="mb-6">
                By accessing and using Svara AI Sales Outreach Platform ("Svara", "the Platform", "our Service"), 
                you accept and agree to be bound by the terms and provision of this agreement.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">2. Use of Third-Party Data</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">Important Data Usage Notice</h3>
                    <p className="text-blue-700 text-sm">
                      Svara uses data services provided by trusted third-party providers, including 
                      Hunter.io and People Data Labs (PDL), to offer lead enrichment and outreach functionality.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-4">You acknowledge and agree that:</p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>All data provided is sourced and enriched via lawful APIs and remains the property of the original provider.</li>
                <li>You shall not use the data for spamming, harassment, or unlawful marketing.</li>
                <li>You are responsible for complying with all applicable laws, including GDPR, CCPA, and CAN-SPAM, when using this data.</li>
                <li>Svara is not liable for misuse of data exported or used from the platform.</li>
                <li>You may not resell or redistribute contact data obtained through the platform unless explicitly authorized by Svara and our third-party providers.</li>
              </ul>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">3. Usage Limits and Quotas</h2>
              <p className="mb-4">
                Your use of the Platform is subject to usage limits based on your subscription plan:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">Plan Limits:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Free Tier:</strong> 10 leads/day, 300/month
                  </div>
                  <div>
                    <strong>Starter:</strong> 50 leads/day, 1,000/month
                  </div>
                  <div>
                    <strong>Growth:</strong> 200 leads/day, 5,000/month
                  </div>
                  <div>
                    <strong>Pro:</strong> 500 leads/day, 15,000/month
                  </div>
                </div>
              </div>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>Quotas reset daily at midnight UTC and monthly on the 1st of each month.</li>
                <li>Unused quotas do not roll over to the next period.</li>
                <li>Exceeding quotas may result in temporary service suspension.</li>
                <li>We reserve the right to modify quotas with 30 days notice.</li>
              </ul>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">4. Prohibited Uses</h2>
              <p className="mb-4">You may not use the Platform for:</p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>Sending unsolicited bulk emails (spam)</li>
                <li>Harvesting email addresses for third-party use</li>
                <li>Violating any applicable laws or regulations</li>
                <li>Impersonating others or providing false information</li>
                <li>Attempting to reverse engineer or access our data sources directly</li>
                <li>Reselling or redistributing platform data without authorization</li>
              </ul>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">5. Data Accuracy and Liability</h2>
              <p className="mb-6">
                While we strive to provide accurate and up-to-date information, we cannot guarantee 
                the accuracy, completeness, or timeliness of all data. You use the data at your own 
                risk and are responsible for verifying its accuracy before use.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">6. Privacy and Data Protection</h2>
              <p className="mb-6">
                Your privacy is important to us. Please review our Privacy Policy to understand 
                how we collect, use, and protect your information. By using the Platform, you 
                consent to our data practices as described in our Privacy Policy.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">7. Account Termination</h2>
              <p className="mb-6">
                We reserve the right to terminate or suspend your account at any time for violations 
                of these terms, illegal activity, or abuse of the Platform. Upon termination, your 
                right to use the Platform ceases immediately.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
              <p className="mb-6">
                We reserve the right to modify these terms at any time. We will notify users of 
                significant changes via email or platform notifications. Continued use of the 
                Platform after changes constitutes acceptance of the new terms.
              </p>

              <Separator className="my-6" />

              <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
              <p className="mb-4">
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p><strong>Email:</strong> legal@svara.tech</p>
                <p><strong>Address:</strong> [Your Business Address]</p>
                <p><strong>Phone:</strong> [Your Business Phone]</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}