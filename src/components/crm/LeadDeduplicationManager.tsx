import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Alert, AlertDescription } from '../ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Merge, 
  Eye,
  RefreshCw,
  Settings,
  TrendingUp,
  Database
} from 'lucide-react'
import { leadDeduplicationService, DuplicateMatch, Lead } from '../../services/leadDeduplication'
import { blink } from '../../blink/client'
import { toast } from 'sonner'

interface DeduplicationStats {
  totalLeads: number
  duplicatesFound: number
  autoResolved: number
  manualReviewNeeded: number
  lastScanDate: string
}

export function LeadDeduplicationManager() {
  const [user, setUser] = useState<any>(null)
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [stats, setStats] = useState<DeduplicationStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateMatch | null>(null)
  const [resolutionRules, setResolutionRules] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadDuplicates()
        loadStats()
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDuplicates = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Get all leads and find duplicates
      const leads = await blink.db.leads.list({
        where: { userId: user.id },
        limit: 100
      })

      const allDuplicates: DuplicateMatch[] = []
      
      for (const lead of leads) {
        const leadDuplicates = await leadDeduplicationService.findDuplicates(lead, user.id)
        allDuplicates.push(...leadDuplicates)
      }

      // Remove duplicate matches (A->B and B->A)
      const uniqueDuplicates = allDuplicates.filter((dup, index, arr) => 
        arr.findIndex(d => 
          (d.svaraLead.id === dup.svaraLead.id && d.crmLead.id === dup.crmLead.id) ||
          (d.svaraLead.id === dup.crmLead.id && d.crmLead.id === dup.svaraLead.id)
        ) === index
      )

      setDuplicates(uniqueDuplicates)
    } catch (error) {
      console.error('Error loading duplicates:', error)
      toast.error("Failed to load duplicate leads")
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!user?.id) return

    try {
      const leads = await blink.db.leads.list({
        where: { userId: user.id }
      })

      const duplicatesFound = duplicates.length
      const manualReviewNeeded = duplicates.filter(d => d.recommendedAction === 'manual_review').length

      setStats({
        totalLeads: leads.length,
        duplicatesFound,
        autoResolved: 0, // Would track from database
        manualReviewNeeded,
        lastScanDate: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const runFullScan = async () => {
    if (!user?.id) return

    setScanning(true)
    try {
      const result = await leadDeduplicationService.processBatchDuplicates(user.id, false)
      
      toast.success(`Found ${result.duplicatesFound} potential duplicates in ${result.processed} leads`)

      await loadDuplicates()
      await loadStats()
    } catch (error) {
      console.error('Error running scan:', error)
      toast.error("Failed to run duplicate scan")
    } finally {
      setScanning(false)
    }
  }

  const autoResolveDuplicates = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const result = await leadDeduplicationService.processBatchDuplicates(user.id, true)
      
      toast.success(`Automatically resolved ${result.autoResolved} duplicates`)

      await loadDuplicates()
      await loadStats()
    } catch (error) {
      console.error('Error auto-resolving duplicates:', error)
      toast.error("Failed to auto-resolve duplicates")
    } finally {
      setLoading(false)
    }
  }

  const handleManualResolution = async (duplicate: DuplicateMatch) => {
    if (!user?.id) return

    try {
      await leadDeduplicationService.mergeLeads(
        duplicate.svaraLead,
        duplicate.crmLead,
        resolutionRules,
        user.id
      )

      toast.success("Successfully merged duplicate leads")

      await loadDuplicates()
      await loadStats()
      setSelectedDuplicate(null)
    } catch (error) {
      console.error('Error merging leads:', error)
      toast.error("Failed to merge leads")
    }
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return 'bg-red-500'
    if (score >= 0.8) return 'bg-orange-500'
    if (score >= 0.7) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'merge': return 'bg-green-500'
      case 'manual_review': return 'bg-yellow-500'
      case 'keep_both': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Please sign in to manage lead deduplication</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lead Deduplication</h2>
          <p className="text-muted-foreground">
            Identify and resolve duplicate leads to maintain data quality
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runFullScan} 
            disabled={scanning}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </Button>
          <Button 
            onClick={autoResolveDuplicates}
            disabled={loading || duplicates.length === 0}
          >
            <Merge className="h-4 w-4 mr-2" />
            Auto-Resolve
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{stats.totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Duplicates Found</p>
                  <p className="text-2xl font-bold">{stats.duplicatesFound}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Auto-Resolved</p>
                  <p className="text-2xl font-bold">{stats.autoResolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Manual Review</p>
                  <p className="text-2xl font-bold">{stats.manualReviewNeeded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Duplicates List */}
      <Card>
        <CardHeader>
          <CardTitle>Potential Duplicates</CardTitle>
          <CardDescription>
            Review and resolve duplicate leads found in your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading duplicates...</span>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
              <p className="text-muted-foreground">Your lead database is clean!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.map((duplicate) => (
                <div key={duplicate.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getMatchScoreColor(duplicate.matchScore)}`} />
                        <span className="font-medium">
                          {Math.round(duplicate.matchScore * 100)}% Match
                        </span>
                      </div>
                      <Badge className={getActionBadgeColor(duplicate.recommendedAction)}>
                        {duplicate.recommendedAction.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedDuplicate(duplicate)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Review Duplicate Leads</DialogTitle>
                          <DialogDescription>
                            Compare and resolve conflicts between these duplicate leads
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedDuplicate && (
                          <div className="space-y-6">
                            {/* Match Information */}
                            <div className="bg-muted p-4 rounded-lg">
                              <h4 className="font-semibold mb-2">Match Details</h4>
                              <div className="flex items-center gap-4 mb-2">
                                <span>Match Score: {Math.round(selectedDuplicate.matchScore * 100)}%</span>
                                <Badge className={getActionBadgeColor(selectedDuplicate.recommendedAction)}>
                                  {selectedDuplicate.recommendedAction.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <strong>Reasons:</strong> {selectedDuplicate.matchReasons.join(', ')}
                              </div>
                            </div>

                            {/* Lead Comparison */}
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-3 text-blue-600">Svara Lead</h4>
                                <div className="space-y-2 text-sm">
                                  <div><strong>Company:</strong> {selectedDuplicate.svaraLead.companyName}</div>
                                  <div><strong>Contact:</strong> {selectedDuplicate.svaraLead.contactName || 'N/A'}</div>
                                  <div><strong>Email:</strong> {selectedDuplicate.svaraLead.contactEmail || 'N/A'}</div>
                                  <div><strong>Phone:</strong> {selectedDuplicate.svaraLead.contactPhone || 'N/A'}</div>
                                  <div><strong>Website:</strong> {selectedDuplicate.svaraLead.website || 'N/A'}</div>
                                  <div><strong>Industry:</strong> {selectedDuplicate.svaraLead.industry || 'N/A'}</div>
                                  <div><strong>Location:</strong> {selectedDuplicate.svaraLead.location || 'N/A'}</div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-3 text-green-600">CRM Lead</h4>
                                <div className="space-y-2 text-sm">
                                  <div><strong>Company:</strong> {selectedDuplicate.crmLead.companyName}</div>
                                  <div><strong>Contact:</strong> {selectedDuplicate.crmLead.contactName || 'N/A'}</div>
                                  <div><strong>Email:</strong> {selectedDuplicate.crmLead.contactEmail || 'N/A'}</div>
                                  <div><strong>Phone:</strong> {selectedDuplicate.crmLead.contactPhone || 'N/A'}</div>
                                  <div><strong>Website:</strong> {selectedDuplicate.crmLead.website || 'N/A'}</div>
                                  <div><strong>Industry:</strong> {selectedDuplicate.crmLead.industry || 'N/A'}</div>
                                  <div><strong>Location:</strong> {selectedDuplicate.crmLead.location || 'N/A'}</div>
                                </div>
                              </div>
                            </div>

                            {/* Conflict Resolution */}
                            {selectedDuplicate.conflictFields.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3">Resolve Conflicts</h4>
                                <div className="space-y-3">
                                  {selectedDuplicate.conflictFields.map((field) => (
                                    <div key={field} className="flex items-center gap-4">
                                      <div className="w-32 text-sm font-medium">{field}:</div>
                                      <Select
                                        value={resolutionRules[field] || 'primary'}
                                        onValueChange={(value) => 
                                          setResolutionRules(prev => ({ ...prev, [field]: value }))
                                        }
                                      >
                                        <SelectTrigger className="w-48">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="primary">Keep Svara Value</SelectItem>
                                          <SelectItem value="duplicate">Keep CRM Value</SelectItem>
                                          <SelectItem value="merge">Merge Values</SelectItem>
                                          <SelectItem value="manual">Manual Review</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setSelectedDuplicate(null)}>
                                Cancel
                              </Button>
                              <Button onClick={() => handleManualResolution(selectedDuplicate)}>
                                <Merge className="h-4 w-4 mr-2" />
                                Merge Leads
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-blue-600">Svara Lead</p>
                      <p>{duplicate.svaraLead.companyName}</p>
                      <p className="text-muted-foreground">{duplicate.svaraLead.contactEmail}</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-600">CRM Lead</p>
                      <p>{duplicate.crmLead.companyName}</p>
                      <p className="text-muted-foreground">{duplicate.crmLead.contactEmail}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    <strong>Match reasons:</strong> {duplicate.matchReasons.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}