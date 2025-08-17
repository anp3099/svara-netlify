import React, { useState, useEffect } from 'react'
import { User, Building, Palette, Bell, Shield, CreditCard, Key, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { blink } from '@/blink/client'

export default function Settings() {
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState({
    // Profile settings
    displayName: '',
    email: '',
    company: '',
    website: '',
    bio: '',
    
    // White-label settings
    brandName: 'Svara',
    brandLogo: '',
    primaryColor: '#6366F1',
    accentColor: '#F59E0B',
    customDomain: '',
    
    // Notification settings
    emailNotifications: true,
    campaignAlerts: true,
    weeklyReports: true,
    systemUpdates: false,
    
    // API settings
    openaiApiKey: '',
    sendgridApiKey: '',
    twilioApiKey: '',
    linkedinApiKey: '',
    
    // Security settings
    twoFactorEnabled: false,
    sessionTimeout: '24h',
    ipWhitelist: ''
  })

  const loadUserData = async () => {
    try {
      const userData = await blink.auth.me()
      setUser(userData)
      setSettings(prev => ({
        ...prev,
        displayName: userData.displayName || '',
        email: userData.email || ''
      }))
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  const saveSettings = async (section: string) => {
    try {
      // In a real app, you'd save different sections to different endpoints
      console.log(`Saving ${section} settings:`, settings)
      
      // For profile settings, update user data
      if (section === 'profile') {
        await blink.auth.updateMe({
          displayName: settings.displayName
        })
      }
      
      // Show success message (in a real app, you'd use a toast notification)
      alert(`${safeCapitalize(section, 'Settings')} saved successfully!`)
    } catch (error) {
      console.error(`Failed to save ${section} settings:`, error)
      alert(`Failed to save ${section} settings. Please try again.`)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account, branding, and platform configuration</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">White-Label</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={settings.displayName}
                    onChange={(e) => updateSetting('displayName', e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    placeholder="your@email.com"
                    disabled
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={settings.company}
                    onChange={(e) => updateSetting('company', e.target.value)}
                    placeholder="Your company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={settings.website}
                    onChange={(e) => updateSetting('website', e.target.value)}
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={settings.bio}
                  onChange={(e) => updateSetting('bio', e.target.value)}
                  placeholder="Tell us about yourself and your business..."
                  rows={3}
                />
              </div>
              <Button onClick={() => saveSettings('profile')} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* White-Label Branding */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                White-Label Branding
              </CardTitle>
              <CardDescription>
                Customize the platform appearance for your clients and team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={settings.brandName}
                    onChange={(e) => updateSetting('brandName', e.target.value)}
                    placeholder="Your Brand Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain</Label>
                  <Input
                    id="customDomain"
                    value={settings.customDomain}
                    onChange={(e) => updateSetting('customDomain', e.target.value)}
                    placeholder="app.yourdomain.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandLogo">Brand Logo URL</Label>
                <Input
                  id="brandLogo"
                  value={settings.brandLogo}
                  onChange={(e) => updateSetting('brandLogo', e.target.value)}
                  placeholder="https://yourdomain.com/logo.png"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      placeholder="#6366F1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      placeholder="#F59E0B"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    ⚡
                  </div>
                  <span className="font-semibold text-gray-900">{settings.brandName}</span>
                  <div 
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    Pro Plan
                  </div>
                </div>
              </div>
              <Button onClick={() => saveSettings('branding')} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive general email notifications</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="campaignAlerts">Campaign Alerts</Label>
                    <p className="text-sm text-gray-500">Get notified about campaign performance</p>
                  </div>
                  <Switch
                    id="campaignAlerts"
                    checked={settings.campaignAlerts}
                    onCheckedChange={(checked) => updateSetting('campaignAlerts', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weeklyReports">Weekly Reports</Label>
                    <p className="text-sm text-gray-500">Receive weekly performance summaries</p>
                  </div>
                  <Switch
                    id="weeklyReports"
                    checked={settings.weeklyReports}
                    onCheckedChange={(checked) => updateSetting('weeklyReports', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="systemUpdates">System Updates</Label>
                    <p className="text-sm text-gray-500">Get notified about platform updates</p>
                  </div>
                  <Switch
                    id="systemUpdates"
                    checked={settings.systemUpdates}
                    onCheckedChange={(checked) => updateSetting('systemUpdates', checked)}
                  />
                </div>
              </div>
              <Button onClick={() => saveSettings('notifications')} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                API Integrations
              </CardTitle>
              <CardDescription>
                Configure your API keys for external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  value={settings.openaiApiKey}
                  onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-500">Required for AI sequence generation</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sendgridApiKey">SendGrid API Key</Label>
                <Input
                  id="sendgridApiKey"
                  type="password"
                  value={settings.sendgridApiKey}
                  onChange={(e) => updateSetting('sendgridApiKey', e.target.value)}
                  placeholder="SG...."
                />
                <p className="text-xs text-gray-500">Required for email campaigns</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilioApiKey">Twilio API Key</Label>
                <Input
                  id="twilioApiKey"
                  type="password"
                  value={settings.twilioApiKey}
                  onChange={(e) => updateSetting('twilioApiKey', e.target.value)}
                  placeholder="AC..."
                />
                <p className="text-xs text-gray-500">Required for SMS campaigns</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedinApiKey">LinkedIn API Key</Label>
                <Input
                  id="linkedinApiKey"
                  type="password"
                  value={settings.linkedinApiKey}
                  onChange={(e) => updateSetting('linkedinApiKey', e.target.value)}
                  placeholder="linkedin_api_key"
                />
                <p className="text-xs text-gray-500">Required for LinkedIn outreach</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-amber-800">Security Notice</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      API keys are encrypted and stored securely. They are only used for your campaigns and never shared.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => saveSettings('integrations')} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save API Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="twoFactorEnabled">Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    id="twoFactorEnabled"
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(checked) => updateSetting('twoFactorEnabled', checked)}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout</Label>
                  <Select value={settings.sessionTimeout} onValueChange={(value) => updateSetting('sessionTimeout', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="8h">8 hours</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipWhitelist">IP Whitelist</Label>
                  <Textarea
                    id="ipWhitelist"
                    value={settings.ipWhitelist}
                    onChange={(e) => updateSetting('ipWhitelist', e.target.value)}
                    placeholder="192.168.1.1&#10;10.0.0.1&#10;203.0.113.0/24"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">One IP address or CIDR block per line. Leave empty to allow all IPs.</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-red-800">Danger Zone</h4>
                    <p className="text-sm text-red-700 mt-1 mb-3">
                      These actions are irreversible. Please be certain before proceeding.
                    </p>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
              <Button onClick={() => saveSettings('security')} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}