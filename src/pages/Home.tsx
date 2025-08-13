import React, { useState } from 'react'
import { ArrowRight, CheckCircle, Zap, Users, TrendingUp, Shield, Star, Play, Menu, X, ChevronDown, Bot, Target, MessageSquare, Calendar, BarChart3, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const testimonials = [
    {
      name: "Ray Green",
      title: "Co-Founder, Loyal",
      content: "We just started using Svara AI that's making a big impact on our ability to reach potential new partners. It is like having a supercharged AI agent doing most of the heavy lifting when it comes to research and initial outreach. It is super easy to set up and then it just goes to work reaching out across multiple platforms.",
      avatar: "RG"
    },
    {
      name: "Jon Runyan", 
      title: "Co‑Founder & COO, Armada",
      content: "A true arbitrage for sales teams. Svara removes grunt work, accelerates pipeline and yields ROI.",
      avatar: "JR"
    },
    {
      name: "Henrik Johansson",
      title: "CEO, Gembah", 
      content: "Svara lets us scale our outbound motion by 2.5x without slowing down our product development. It's the kind of tool that quietly drives results in the background, Svara fetched us 10+ high intent clients in just a few weeks time.",
      avatar: "HJ"
    },
    {
      name: "Matthew Nichols",
      title: "Senior Networks & Systems Engineer, Worldwide Supply Net",
      content: "Svara takes a lot of the heavy lifting off our plate. It fills in the missing details for each lead, helps us spot new prospects, and quietly handles the routine follow-ups in the background. We're saving hours and focusing more on real conversations, not busywork.",
      avatar: "MN"
    },
    {
      name: "Anna Poplevina",
      title: "Founder, Longer",
      content: "The day we turned on Svara, it cleaned our lead list, filled the gaps, and fired off the first emails. Deals started progressing without any grunt work.",
      avatar: "AP"
    },
    {
      name: "Keith Sims",
      title: "President, Integrity Resource Management",
      content: "As one of Svara's earliest customers, I've watched it evolve from a promising idea into the core engine of our prospecting stack. It finds the right people, fills every data gap, and fires off perfectly‑timed follow‑ups freeing my team to focus on relationships, not spreadsheets.",
      avatar: "KS"
    }
  ]

  const faqs = [
    {
      question: "How is Svara different from other sales automation platforms?",
      answer: "Most sales tools are either too complex (requiring heavy training) or too basic (no real AI automation). Svara bridges this gap with enterprise-grade AI automation in a simple 4-step process. Plus, we include 70M+ business records and 45M+ LinkedIn profiles - eliminating ongoing data costs that can run $500-2000/month with other platforms."
    },
    {
      question: "What makes Svara different from other sales automation tools?",
      answer: "Svara combines enterprise-grade AI automation with an intuitive 4-step process. Unlike basic tools that lack real AI or complex platforms requiring extensive training, Svara includes 70M+ business records, AI-generated sequences, multi-channel outreach, and white-label capabilities - all in one comprehensive platform."
    },
    {
      question: "Do I need technical skills to use Svara?",
      answer: "No technical skills required! Svara is designed for sales professionals, agencies, and entrepreneurs. The platform handles all the complex technical aspects with our simple 4-step process - you focus on your business and client relationships."
    },
    {
      question: "How quickly can I get started with Svara?",
      answer: "You can start immediately with our 14-day free trial. The platform is ready-to-use with pre-built templates, and we provide comprehensive training and support materials to help you succeed from day one."
    },
    {
      question: "What kind of results can I expect with Svara?",
      answer: "Our customers typically see 2-5x faster campaign deployment, 10x higher response rates through AI personalization, and significant time savings on manual outreach tasks. Many users report booking 20-50+ qualified meetings per month within their first 90 days."
    },
    {
      question: "Is the business database really included at no extra cost?",
      answer: "Yes! Unlike other platforms that charge $500-2000/month for data access, Svara includes our proprietary database of verified business records and LinkedIn profiles with all paid plans. This alone saves you thousands per month and gives you a massive competitive advantage."
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Sparkles className="h-8 w-8 text-primary" />
              <div className="flex items-center ml-2">
                <span className="text-xl font-bold">Svara</span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">AI</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="/pipeline" className="text-muted-foreground hover:text-foreground transition-colors">Pipeline</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Customers</a>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => window.location.href = '/app'}>
                Login
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                Start Free Trial
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
                <a href="/pipeline" className="text-muted-foreground hover:text-foreground">Pipeline</a>
                <a href="#testimonials" className="text-muted-foreground hover:text-foreground">Customers</a>
                <Button variant="ghost" className="justify-start text-muted-foreground hover:text-foreground" onClick={() => window.location.href = '/app'}>
                  Login
                </Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Start Free Trial
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20">
              🚀 Turnkey AI Sales Automation Platform
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Launch Your Own AI Sales SaaS in 
              <span className="text-primary"> 4 Simple Steps</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              From 70M+ business records to AI-generated sequences to white-label deployment - Svara is the complete sales automation platform that transforms your outreach with intelligent AI automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6" onClick={() => window.location.href = '/app'}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border hover:bg-muted" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                <Play className="mr-2 h-5 w-5" />
                View Pricing
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Multi-tenant ready • White-label included • 70M+ business records
            </p>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 flex justify-center items-center space-x-8 opacity-60">
            <div className="text-lg font-semibold text-muted-foreground">DIGITAL AGENCIES</div>
            <div className="text-lg font-semibold text-muted-foreground">SALES AUTOMATION</div>
            <div className="text-lg font-semibold text-muted-foreground">ENTERPRISE RESELLERS</div>
            <div className="text-lg font-semibold text-muted-foreground">SAAS ENTREPRENEURS</div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Why Choose Svara AI?
          </h2>
          <p className="text-xl text-muted-foreground mb-16">
            Transform your sales process with intelligent automation and comprehensive lead management.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <Users className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Digital Marketing Agencies</h3>
                <p className="text-muted-foreground">
                  Offer AI-powered outreach services to clients and generate recurring revenue streams.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <Zap className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sales Teams</h3>
                <p className="text-muted-foreground">
                  Scale your outreach with intelligent automation and personalized messaging.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Growing Businesses</h3>
                <p className="text-muted-foreground">
                  Comprehensive lead generation solutions that scale with your business needs.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <Target className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Consultants & Coaches</h3>
                <p className="text-muted-foreground">
                  Monetize lead generation as a premium service offering to your clients.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <Sparkles className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Entrepreneurs</h3>
                <p className="text-muted-foreground">
                  Launch and scale your business with proven, customizable automation tools.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Enterprise Teams</h3>
                <p className="text-muted-foreground">
                  Complete, brandable platform with multi-tenant architecture and user management.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              The 4-Step Svara System
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Enterprise-grade AI automation in a simple process that anyone can master. 
              From product setup to campaign launch - everything is automated.
            </p>
          </div>

          <div className="space-y-20">
            {/* Step 1 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">Step 1: Add Products</Badge>
                <h3 className="text-2xl lg:text-3xl font-bold mb-4">
                  Define Your Products & Services
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Simply add your products or services to the platform. Svara's AI will understand your value proposition and create targeted messaging for each offering.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Product catalog with AI-powered descriptions
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Automatic value proposition generation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Target market identification
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Competitive positioning analysis
                  </li>
                </ul>
                <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Add Your Products
                </Button>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-2xl">
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h4 className="font-semibold mb-4">Product Setup Dashboard</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">AI Sales Automation</span>
                      <Badge className="bg-accent">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">Lead Generation Service</span>
                      <Badge className="bg-accent">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">White-Label Platform</span>
                      <Badge variant="secondary">Draft</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="lg:order-2">
                <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent">Step 2: Create Campaigns</Badge>
                <h3 className="text-2xl lg:text-3xl font-bold mb-4">
                  Access 70M+ Business Records & 45M+ LinkedIn Profiles
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Tap into Svara's massive proprietary database. No external data costs. No outdated lists. Just verified, enriched leads ready for outreach.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    70M+ US business records with verified contacts
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    45M+ LinkedIn profiles with engagement data
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Real-time data updates and verification
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Advanced filtering by industry, size, tech stack
                  </li>
                </ul>
                <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Browse Database
                </Button>
              </div>
              <div className="lg:order-1 bg-gradient-to-br from-accent/10 to-primary/10 p-8 rounded-2xl">
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h4 className="font-semibold mb-4">Massive Data Pool</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">US Business Records</span>
                      <Badge className="bg-accent">70M+</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">LinkedIn Profiles</span>
                      <Badge className="bg-accent">45M+</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Verified Emails</span>
                      <Badge className="bg-accent">95%+</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Data Freshness</span>
                      <Badge className="bg-accent">Real-time</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">Step 3: AI Generates Sequences</Badge>
                <h3 className="text-2xl lg:text-3xl font-bold mb-4">
                  AI-Powered Campaign Builder
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Our AI automatically generates personalized email and SMS sequences for each campaign. Human editing supported for review and adjustments.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    AI-generated personalized sequences (email/SMS)
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Human editing and approval workflow
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Multi-channel outreach automation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    A/B testing and optimization
                  </li>
                </ul>
                <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Generate Sequences
                </Button>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-2xl">
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h4 className="font-semibold mb-4">AI Campaign Builder</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Email Sequence</span>
                        <Badge className="bg-accent">Generated</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">5 emails, personalized for SaaS prospects</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">SMS Follow-up</span>
                        <Badge className="bg-accent">Ready</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">3 SMS messages, trigger-based</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">LinkedIn Outreach</span>
                        <Badge variant="secondary">Draft</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Connection requests + follow-ups</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="lg:order-2">
                <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent">Step 4: Launch Outreach</Badge>
                <h3 className="text-2xl lg:text-3xl font-bold mb-4">
                  Full Automation Pipeline
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  From lead identification to sequence generation to email/SMS outreach - everything runs automatically. The platform handles everything else.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Automated lead identification and scoring
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Multi-channel outreach execution
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Smart follow-up automation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-accent mr-3" />
                    Real-time performance tracking
                  </li>
                </ul>
                <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Launch Campaign
                </Button>
              </div>
              <div className="lg:order-1 bg-gradient-to-br from-accent/10 to-primary/10 p-8 rounded-2xl">
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h4 className="font-semibold mb-4">Campaign Performance</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Emails Sent</span>
                      <Badge className="bg-accent">2,847</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Open Rate</span>
                      <Badge className="bg-accent">24.3%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reply Rate</span>
                      <Badge className="bg-accent">8.7%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Meetings Booked</span>
                      <Badge className="bg-accent">47</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Why Svara Stands Out
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Most sales tools are either too complex (requiring heavy training) or too basic (no real AI automation). 
              Svara bridges this gap with enterprise-grade features in a simple 4-step process.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-6">What Makes Svara Different</h3>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Owned Data (70M+ Records)</h4>
                      <p className="text-muted-foreground text-sm">Eliminates ongoing data costs. No external subscriptions needed.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Multi-Tenant SaaS Architecture</h4>
                      <p className="text-muted-foreground text-sm">Launch your own SaaS company instantly with built-in user management.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">AI + Human Control</h4>
                      <p className="text-muted-foreground text-sm">AI generates sequences, humans can edit and approve. Perfect balance.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">White-Label Ready</h4>
                      <p className="text-muted-foreground text-sm">Custom branding, domain, and user role management included.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-6">ROI & Results</h3>
                <div className="space-y-6">
                  <div className="text-center p-6 bg-primary/5 rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-2">2-5x</div>
                    <p className="text-sm text-muted-foreground">Faster campaign deployment vs manual setup</p>
                  </div>
                  
                  <div className="text-center p-6 bg-accent/5 rounded-lg">
                    <div className="text-3xl font-bold text-accent mb-2">10x</div>
                    <p className="text-sm text-muted-foreground">Higher response rates via AI personalization</p>
                  </div>
                  
                  <div className="text-center p-6 bg-primary/5 rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-2">20-40x</div>
                    <p className="text-sm text-muted-foreground">ROI within first 90 days of implementation</p>
                  </div>
                  
                  <div className="text-center p-6 bg-accent/5 rounded-lg">
                    <div className="text-3xl font-bold text-accent mb-2">$30K-$50K</div>
                    <p className="text-sm text-muted-foreground">Development cost saved vs building from scratch</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Don't just take our word for it.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div className="ml-3">
                      <h4 className="font-semibold text-sm">{testimonial.name}</h4>
                      <p className="text-xs text-muted-foreground">{testimonial.title}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    "{testimonial.content}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-muted-foreground">
              Start with our free trial and scale as you grow. All plans include our complete AI automation platform.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Starter Plan */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">Starter</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-3xl font-bold text-primary">$97</span>
                  <span className="text-lg text-muted-foreground ml-2">/month</span>
                </div>
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">1,500 leads/month</Badge>
                </div>
                <p className="text-muted-foreground mb-6 text-sm">
                  Perfect for small teams getting started with targeted outreach.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Niche targeting</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Verified emails</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">CSV export</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Basic analytics</span>
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Growth Plan - Recommended */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs">Most Popular</Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">Growth</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-3xl font-bold text-primary">$297</span>
                  <span className="text-lg text-muted-foreground ml-2">/month</span>
                </div>
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-accent/10 text-accent">6,000 leads/month</Badge>
                </div>
                <p className="text-muted-foreground mb-6 text-sm">
                  Ideal for growing businesses and agencies scaling outreach.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Bulk data processing</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Industry filters</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">AI outreach credits</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={() => window.location.href = '/app'}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-3xl font-bold text-primary">$697</span>
                  <span className="text-lg text-muted-foreground ml-2">/month</span>
                </div>
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">15,000 leads/month</Badge>
                </div>
                <p className="text-muted-foreground mb-6 text-sm">
                  Advanced features for high-volume lead generation teams.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Advanced filters</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">CRM sync</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">AI workflows</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">LinkedIn access</span>
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-2xl font-bold text-primary">Custom</span>
                  <span className="text-lg text-muted-foreground ml-2">pricing</span>
                </div>
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-accent/10 text-accent">30,000+ leads/month</Badge>
                </div>
                <p className="text-muted-foreground mb-6 text-sm">
                  Complete solution with custom scraping and dedicated support.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Custom scraping</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Intent data</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">API access</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-accent mr-2" />
                    <span className="text-sm">Onboarding</span>
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-muted/30 border-border max-w-4xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">All Plans Include</h3>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary mb-2">Free Trial</div>
                    <p className="text-sm text-muted-foreground">14-day trial</p>
                    <div className="text-lg font-semibold mt-2">No Credit Card</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent mb-2">AI Automation</div>
                    <p className="text-sm text-muted-foreground">Complete platform</p>
                    <div className="text-lg font-semibold mt-2">Ready to Use</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary mb-2">24/7 Support</div>
                    <p className="text-sm text-muted-foreground">All plans</p>
                    <div className="text-lg font-semibold mt-2">Always Available</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-6">
                  Start with any plan and upgrade anytime. Cancel or downgrade without penalties.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">FAQ</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-0">
                  <button
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <h3 className="font-semibold pr-4">{faq.question}</h3>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Start Your Free Trial Today
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Join thousands of successful sales professionals and agencies transforming their outreach with Svara's AI automation platform.
          </p>
          
          <Card className="bg-background/10 backdrop-blur-sm border-primary-foreground/20 max-w-md mx-auto">
            <CardContent className="p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    className="px-4 py-3 rounded-lg bg-background/20 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="px-4 py-3 rounded-lg bg-background/20 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-lg bg-background/20 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full px-4 py-3 rounded-lg bg-background/20 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
                />
                <div className="flex items-start space-x-2 text-sm text-primary-foreground/80">
                  <input type="checkbox" className="mt-1" />
                  <p>
                    I accept the Terms and Conditions and Privacy Policy
                  </p>
                </div>
                <p className="text-xs text-primary-foreground/60">
                  By providing your phone number you agree to receive informational text messages from Svara.ai. 
                  Consent is not a condition of purchase. Messages frequency will vary. Message & data rates may apply.
                </p>
                <Button className="w-full bg-background text-foreground hover:bg-background/90" onClick={() => window.location.href = '/app'}>
                  Start Free Trial
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <div className="flex items-center ml-2">
                  <span className="text-xl font-bold">Svara</span>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">AI</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Agentic AI for anyone who sells. Transform your outreach with intelligent automation.
              </p>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                Start Free Trial
              </Button>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">AI Outbound</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">AI Inbound</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">AI Chat</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">AI LinkedIn</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">AI RevOps</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Solutions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Startups</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Mid-market</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Enterprise</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Technology</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Financial Services</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Svara. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}