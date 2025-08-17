// Enhanced OAuth service for CRM integrations
import { blink } from '../blink/client'

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
  revokeUrl?: string
  apiBaseUrl: string
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  tokenType?: string
  scope?: string
  instanceUrl?: string // For Salesforce
}

export class CRMOAuthService {
  private static configs: Record<string, OAuthConfig> = {
    hubspot: {
      clientId: process.env.HUBSPOT_CLIENT_ID || '',
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/hubspot/callback`,
      scopes: ['contacts', 'companies', 'deals', 'tickets'],
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      revokeUrl: 'https://api.hubapi.com/oauth/v1/refresh-tokens',
      apiBaseUrl: 'https://api.hubapi.com'
    },
    salesforce: {
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/salesforce/callback`,
      scopes: ['api', 'refresh_token', 'offline_access'],
      authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
      apiBaseUrl: 'https://login.salesforce.com'
    },
    pipedrive: {
      clientId: process.env.PIPEDRIVE_CLIENT_ID || '',
      clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/pipedrive/callback`,
      scopes: ['deals:read', 'deals:write', 'contacts:read', 'contacts:write', 'organizations:read', 'organizations:write'],
      authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
      tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
      revokeUrl: 'https://oauth.pipedrive.com/oauth/revoke',
      apiBaseUrl: 'https://api.pipedrive.com'
    }
  }

  static getAuthUrl(provider: string, state?: string): string {
    const config = this.configs[provider]
    if (!config) throw new Error(`OAuth config not found for provider: ${provider}`)

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      ...(state && { state })
    })

    // Salesforce specific parameters
    if (provider === 'salesforce') {
      params.set('prompt', 'consent')
    }

    return `${config.authUrl}?${params.toString()}`
  }

  static async exchangeCodeForTokens(provider: string, code: string): Promise<OAuthTokens> {
    const config = this.configs[provider]
    if (!config) throw new Error(`OAuth config not found for provider: ${provider}`)

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code
    })

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OAuth token exchange failed for ${provider}: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : undefined,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope
    }

    // Salesforce specific fields
    if (provider === 'salesforce' && data.instance_url) {
      tokens.instanceUrl = data.instance_url
    }

    return tokens
  }

  static async refreshTokens(provider: string, refreshToken: string): Promise<OAuthTokens> {
    const config = this.configs[provider]
    if (!config) throw new Error(`OAuth config not found for provider: ${provider}`)

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken
    })

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OAuth token refresh failed for ${provider}: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : undefined,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope
    }

    // Salesforce specific fields
    if (provider === 'salesforce' && data.instance_url) {
      tokens.instanceUrl = data.instance_url
    }

    return tokens
  }

  static async revokeTokens(provider: string, token: string): Promise<void> {
    const config = this.configs[provider]
    if (!config?.revokeUrl) return

    const body = new URLSearchParams({
      token
    })

    // Add client credentials for Salesforce
    if (provider === 'salesforce') {
      body.set('client_id', config.clientId)
      body.set('client_secret', config.clientSecret)
    }

    const response = await fetch(config.revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!response.ok) {
      console.warn(`Token revocation failed for ${provider}: ${response.statusText}`)
    }
  }

  static async validateTokens(provider: string, tokens: OAuthTokens): Promise<boolean> {
    try {
      const config = this.configs[provider]
      if (!config) return false

      let validationUrl: string
      let headers: Record<string, string>

      switch (provider) {
        case 'hubspot':
          validationUrl = `${config.apiBaseUrl}/oauth/v1/access-tokens/${tokens.accessToken}`
          headers = { 'Authorization': `Bearer ${tokens.accessToken}` }
          break
        
        case 'salesforce':
          validationUrl = `${tokens.instanceUrl || config.apiBaseUrl}/services/oauth2/userinfo`
          headers = { 'Authorization': `Bearer ${tokens.accessToken}` }
          break
        
        case 'pipedrive':
          validationUrl = `${config.apiBaseUrl}/v1/users/me`
          headers = { 'Authorization': `Bearer ${tokens.accessToken}` }
          break
        
        default:
          return false
      }

      const response = await fetch(validationUrl, { headers })
      return response.ok
    } catch (error) {
      console.error(`Token validation failed for ${provider}:`, error)
      return false
    }
  }

  static getProviderInfo(provider: string) {
    const providerInfo = {
      hubspot: {
        name: 'HubSpot',
        description: 'Connect to HubSpot CRM for contacts, companies, and deals',
        icon: '🟠',
        features: ['Contacts', 'Companies', 'Deals', 'Tickets']
      },
      salesforce: {
        name: 'Salesforce',
        description: 'Connect to Salesforce CRM for leads, accounts, and opportunities',
        icon: '☁️',
        features: ['Leads', 'Accounts', 'Opportunities', 'Contacts']
      },
      pipedrive: {
        name: 'Pipedrive',
        description: 'Connect to Pipedrive CRM for deals and organizations',
        icon: '🔵',
        features: ['Deals', 'Organizations', 'Contacts', 'Activities']
      }
    }

    return providerInfo[provider as keyof typeof providerInfo]
  }
}