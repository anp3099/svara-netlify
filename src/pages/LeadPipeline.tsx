import React from 'react'
import { ArrowRight, Database, Search, Filter, Download, CheckCircle, Globe, Building2, Phone, Mail, Linkedin, Target, Zap, Shield, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

export default function LeadPipeline() {
  const sources = [
    {
      name: "Google Maps",
      method: "Scrape using Selenium or Scrapy",
      volume: "10M+",
      notes: "High-quality SMBs",
      icon: <Globe className="h-6 w-6" />
    },
    {
      name: "Clutch.co",
      method: "Scrape business profiles",
      volume: "200K–500K",
      notes: "High-intent tech companies",
      icon: <Building2 className="h-6 w-6" />
    },
    {
      name: "Yellowpages.com",
      method: "Scrape categories + locations",
      volume: "5M+",
      notes: "Available in many countries",
      icon: <Phone className="h-6 w-6" />
    },
    {
      name: "OpenCorporates",
      method: "Download public corp registries",
      volume: "50M+",
      notes: "US + global legal entities",
      icon: <Database className="h-6 w-6" />
    },
    {
      name: "Apollo.io",
      method: "Use API to export (if possible)",
      volume: "5M+",
      notes: "You need API access or account",
      icon: <Target className="h-6 w-6" />
    },
    {
      name: "LinkedIn",
      method: "PhantomBuster or custom scraper",
      volume: "10M+",
      notes: "For targeting by job titles",
      icon: <Linkedin className="h-6 w-6" />
    }
  ]

  const pipelineSteps = [
    {
      step: 1,
      title: "Input Queries",
      description: "Search queries like 'marketing agency, USA'",
      icon: <Search className="h-8 w-8" />
    },
    {
      step: 2,
      title: "Multi-Source Scraping",
      description: "Google Maps / Clutch / YellowPages scraping",
      icon: <Globe className="h-8 w-8" />
    },
    {
      step: 3,
      title: "Raw Data Extraction",
      description: "Extract name, website, category, contact info",
      icon: <Database className="h-8 w-8" />
    },
    {
      step: 4,
      title: "Data Enrichment",
      description: "Dropcontact or Clearbit API enrichment",
      icon: <Zap className="h-8 w-8" />
    },
    {
      step: 5,
      title: "Database Storage",
      description: "Store in Supabase / BigQuery for reuse",
      icon: <Database className="h-8 w-8" />
    },
    {
      step: 6,
      title: "Export & Delivery",
      description: "CSV / API / Svara UI delivery to customers",
      icon: <Download className="h-8 w-8" />
    }
  ]

  const sampleLeads = [
    {
      businessName: "Pixel Media",
      email: "info@pixel.com",
      phone: "+1-555-1234",
      website: "www.pixel.com",
      linkedin: "linkedin.com/pixel"
    },
    {
      businessName: "Adify",
      email: "contact@adify.co",
      phone: "+44-333-9999",
      website: "adify.co",
      linkedin: "linkedin.com/adify"
    },
    {
      businessName: "Growth Labs",
      email: "hello@growthlabs.io",
      phone: "+1-555-7890",
      website: "growthlabs.io",
      linkedin: "linkedin.com/growthlabs"
    }
  ]

  const compliancePoints = [
    {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      text: "Use Dropcontact (only enrichment API fully compliant in EU/US)"
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      text: "Avoid storing scraped emails from LinkedIn/Google unless enriched"
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-500" />,
      text: "Cache all enriched leads into your database and reuse for new users"
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
      text: "Store leads once, serve to many → zero marginal cost per lead"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
              Multi-Source Lead Generation Pipeline
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Generate 100M+ Leads with Our Pipeline
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Complete multi-source scraping and enrichment system to build massive lead databases 
              for your customers through Svara's AI-powered platform.
            </p>
          </div>
        </div>
      </div>

      {/* Lead Sources */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Multi-Source Data Collection</h2>
            <p className="text-xl text-muted-foreground">
              Tap into multiple high-quality data sources to build comprehensive lead databases
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sources.map((source, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {source.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <Badge variant="secondary" className="bg-accent/10 text-accent">
                        {source.volume}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong>Method:</strong> {source.method}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> {source.notes}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline Flow */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Lead Generation Pipeline</h2>
            <p className="text-xl text-muted-foreground">
              From raw queries to enriched leads delivered to your customers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pipelineSteps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="bg-card border-border h-full">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                        {step.icon}
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Step {step.step}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                
                {/* Arrow connector */}
                {index < pipelineSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Output */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Expected Output Format</h2>
            <p className="text-xl text-muted-foreground">
              Clean, enriched lead data ready for AI outreach campaigns
            </p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Sample Lead Database Output</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold">Business Name</th>
                      <th className="text-left p-3 font-semibold">Email</th>
                      <th className="text-left p-3 font-semibold">Phone</th>
                      <th className="text-left p-3 font-semibold">Website</th>
                      <th className="text-left p-3 font-semibold">LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleLeads.map((lead, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="p-3 font-medium">{lead.businessName}</td>
                        <td className="p-3 text-blue-600">{lead.email}</td>
                        <td className="p-3">{lead.phone}</td>
                        <td className="p-3 text-blue-600">{lead.website}</td>
                        <td className="p-3 text-blue-600">{lead.linkedin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Compliance & Cost-Saving */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Compliance & Cost-Saving Strategy</h2>
            <p className="text-xl text-muted-foreground">
              Best practices for legal compliance and maximum profitability
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span>Compliance Guidelines</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {compliancePoints.map((point, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      {point.icon}
                      <p className="text-sm text-muted-foreground">{point.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>Cost Optimization</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Zero Marginal Cost Model</h4>
                    <p className="text-sm text-green-700">
                      Store leads once in your database, then serve to unlimited customers. 
                      Each additional customer costs nothing in data acquisition.
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Reuse & Cache Strategy</h4>
                    <p className="text-sm text-blue-700">
                      Cache all enriched leads and reuse across multiple customer campaigns. 
                      Avoid re-enriching the same leads multiple times.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2">Compliance-First Approach</h4>
                    <p className="text-sm text-purple-700">
                      Use only compliant enrichment APIs like Dropcontact to ensure 
                      EU/US legal compliance while maintaining data quality.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to Build Your Lead Pipeline?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Start generating millions of high-quality leads for your customers with Svara's 
            multi-source scraping and enrichment pipeline.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-background text-foreground hover:bg-background/90"
              onClick={() => window.location.href = '/app'}
            >
              Start Building Pipeline
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => window.location.href = '/pricing'}
            >
              View Pricing Plans
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}