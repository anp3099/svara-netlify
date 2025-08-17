import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { blink } from '../../blink/client';
import { createCRMManager } from '../../services/crmIntegrations';
import { toast } from 'sonner';

interface OAuthCallbackProps {
  provider: string;
}

export default function OAuthCallback({ provider }: OAuthCallbackProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Verify state parameter
        if (state && !state.startsWith(user.id)) {
          throw new Error('Invalid state parameter');
        }

        setMessage('Exchanging authorization code for access token...');

        const crmManager = createCRMManager(user.id);
        const connection = await crmManager.handleOAuthCallback(provider, code);

        setStatus('success');
        setMessage(`Successfully connected to ${getProviderName(provider)}!`);

        // Store connection in database
        await blink.db.crmConnections.create({
          id: connection.id,
          userId: user.id,
          provider: connection.provider,
          status: connection.status,
          credentials: JSON.stringify(connection.credentials),
          fieldMappings: JSON.stringify(connection.fieldMappings),
          syncSettings: JSON.stringify(connection.syncSettings),
          lastSync: connection.lastSync?.toISOString(),
          errorMessage: connection.errorMessage
        });

        // Notify parent window if in popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_success',
            provider: provider,
            connection: connection
          }, window.location.origin);
          window.close();
        } else {
          // Redirect to CRM integrations page after 2 seconds
          setTimeout(() => {
            navigate('/crm-integrations');
          }, 2000);
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'OAuth connection failed');

        // Notify parent window if in popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            provider: provider,
            error: error instanceof Error ? error.message : 'OAuth connection failed'
          }, window.location.origin);
          window.close();
        }
      }
    };

    handleOAuthCallback();
  }, [user, searchParams, provider, navigate]);

  const getProviderName = (provider: string): string => {
    const names: Record<string, string> = {
      hubspot: 'HubSpot',
      salesforce: 'Salesforce',
      pipedrive: 'Pipedrive'
    };
    return names[provider] || provider;
  };

  const getProviderIcon = (provider: string): string => {
    const icons: Record<string, string> = {
      hubspot: '🟠',
      salesforce: '☁️',
      pipedrive: '🟢'
    };
    return icons[provider] || '🔗';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-3xl">{getProviderIcon(provider)}</span>
            <CardTitle>{getProviderName(provider)} Integration</CardTitle>
          </div>
          <CardDescription>
            {status === 'loading' && 'Completing OAuth connection...'}
            {status === 'success' && 'Connection established successfully!'}
            {status === 'error' && 'Connection failed'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center space-x-2 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {message || 'Processing...'}
              </span>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                {window.opener 
                  ? 'This window will close automatically...'
                  : 'Redirecting to CRM integrations page...'
                }
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Please try connecting again or contact support if the issue persists.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.opener ? window.close() : navigate('/crm-integrations')}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {window.opener ? 'Close Window' : 'Back to Integrations'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}