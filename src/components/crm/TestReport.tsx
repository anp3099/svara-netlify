import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Zap,
  Shield
} from 'lucide-react';

interface TestReportProps {
  results: { [key: string]: any[] };
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
}

export default function TestReport({ 
  results, 
  totalTests, 
  passedTests, 
  failedTests, 
  skippedTests, 
  duration 
}: TestReportProps) {
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  const completionRate = totalTests > 0 ? Math.round(((passedTests + failedTests) / totalTests) * 100) : 0;

  const getSuiteIcon = (suiteKey: string) => {
    switch (suiteKey) {
      case 'oauth':
        return <Shield className="h-4 w-4" />;
      case 'api':
        return <Zap className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'sync':
        return <Activity className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getSuiteStatus = (suiteResults: any[]) => {
    if (suiteResults.length === 0) return 'skipped';
    
    const passed = suiteResults.filter(r => r.success).length;
    const total = suiteResults.length;
    
    if (passed === total) return 'passed';
    if (passed === 0) return 'failed';
    return 'partial';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'partial':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Test Execution Summary</span>
          </CardTitle>
          <CardDescription>
            Comprehensive validation results for all CRM integration workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{passedTests}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{failedTests}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{skippedTests}</div>
              <div className="text-sm text-muted-foreground">Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalTests}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-sm font-medium">{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-sm font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Duration</span>
              <span className="font-medium">{(duration / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Suite Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(results).map(([suiteKey, suiteResults]) => {
          const status = getSuiteStatus(suiteResults);
          const suitePassed = suiteResults.filter(r => r.success).length;
          const suiteTotal = suiteResults.length;
          const suiteSuccessRate = suiteTotal > 0 ? Math.round((suitePassed / suiteTotal) * 100) : 0;

          return (
            <Card key={suiteKey}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getSuiteIcon(suiteKey)}
                    <CardTitle className="text-lg capitalize">
                      {suiteKey.replace('_', ' ')} Tests
                    </CardTitle>
                  </div>
                  {getStatusIcon(status)}
                </div>
                <CardDescription>
                  {suitePassed} of {suiteTotal} tests passed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Success Rate</span>
                      <span className="text-xs font-medium">{suiteSuccessRate}%</span>
                    </div>
                    <Progress value={suiteSuccessRate} className="h-1" />
                  </div>

                  <div className="space-y-2">
                    {suiteResults.slice(0, 3).map((result, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className="truncate max-w-32">
                            {result.message.split(':')[0]}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {result.duration}ms
                        </Badge>
                      </div>
                    ))}
                    
                    {suiteResults.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{suiteResults.length - 3} more tests
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Test Results</CardTitle>
          <CardDescription>
            Complete breakdown of all test executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(results).map(([suiteKey, suiteResults]) => (
              <div key={suiteKey}>
                <h4 className="font-semibold mb-3 flex items-center space-x-2">
                  {getSuiteIcon(suiteKey)}
                  <span className="capitalize">{suiteKey.replace('_', ' ')} Suite</span>
                </h4>
                
                <div className="space-y-2">
                  {suiteResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">{result.message}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {result.duration}ms
                          </Badge>
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.success ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                      </div>
                      
                      {result.details && (
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {successRate >= 80 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span>Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {successRate >= 90 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Excellent!</strong> Your CRM integrations are working well. 
                  Consider setting up automated monitoring to maintain this performance.
                </AlertDescription>
              </Alert>
            )}

            {successRate >= 70 && successRate < 90 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Good Progress!</strong> Most integrations are working. 
                  Focus on resolving the failed tests to improve reliability.
                </AlertDescription>
              </Alert>
            )}

            {successRate < 70 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Needs Attention!</strong> Several integration issues detected. 
                  Review failed tests and ensure proper configuration of CRM connections.
                </AlertDescription>
              </Alert>
            )}

            {skippedTests > totalTests * 0.5 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup Required:</strong> Many tests were skipped due to missing configurations. 
                  Set up CRM connections and field mappings to enable full testing.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="mb-2"><strong>Next Steps:</strong></p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Review and fix any failed tests</li>
                <li>Complete CRM connection setup for skipped tests</li>
                <li>Configure field mappings and webhooks</li>
                <li>Run tests regularly to monitor integration health</li>
                <li>Set up automated alerts for critical failures</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}