import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Zap, Target, MessageSquare, Calendar, MapPin, Database, Search } from 'lucide-react'

export default function CampaignBuilder() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Builder</h1>
          <p className="text-gray-600">Create and configure your AI-powered outreach campaigns</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Zap className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-indigo-600" />
              Target Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Define your ideal customer profile and targeting criteria.</p>
            <Button variant="outline" className="w-full">Configure Targeting</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-indigo-600" />
              AI Sequences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Generate personalized email and LinkedIn sequences with AI.</p>
            <Button variant="outline" className="w-full">Build Sequences</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-indigo-600" />
              Schedule & Launch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Set timing, frequency, and launch your campaign.</p>
            <Button variant="outline" className="w-full">Schedule Campaign</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center mb-2">
                <MapPin className="mr-2 h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Google Maps</h3>
                <Badge variant="secondary" className="ml-auto">New</Badge>
              </div>
              <p className="text-sm text-gray-600">Extract real business data from Google Maps searches</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center mb-2">
                <Database className="mr-2 h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Leads Database</h3>
              </div>
              <p className="text-sm text-gray-600">Use your existing leads database for campaigns</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center mb-2">
                <Search className="mr-2 h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Industry Search</h3>
              </div>
              <p className="text-sm text-gray-600">Target specific industries with AI-powered search</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Local Business Outreach</h3>
                <Badge variant="secondary">New</Badge>
              </div>
              <p className="text-sm text-gray-600">Target local businesses found through Google Maps</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">SaaS Outreach</h3>
                <Badge variant="secondary">Popular</Badge>
              </div>
              <p className="text-sm text-gray-600">Target SaaS companies with personalized value propositions</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <h3 className="font-semibold mb-2">Agency Prospecting</h3>
              <p className="text-sm text-gray-600">Reach marketing agencies with service-focused messaging</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <h3 className="font-semibold mb-2">Enterprise Sales</h3>
              <p className="text-sm text-gray-600">Multi-touch sequences for enterprise decision makers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              Search Google Maps
            </Button>
            <Button variant="outline" className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Import Leads
            </Button>
            <Button variant="outline" className="flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate Sequences
            </Button>
            <Button variant="outline" className="flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Set Targeting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}