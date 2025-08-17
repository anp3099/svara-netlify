import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { 
  ArrowRight, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  RefreshCw,
  MapPin,
  Database,
  Target
} from 'lucide-react';

interface FieldMapping {
  id: string;
  svaraField: string;
  crmField: string;
  direction: 'bidirectional' | 'to_crm' | 'from_crm';
  transform?: string;
  required: boolean;
  dataType: 'text' | 'email' | 'phone' | 'number' | 'date' | 'boolean' | 'picklist';
}

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: string;
  providerName: string;
  onSave: (mappings: FieldMapping[]) => void;
}

const SVARA_FIELDS = [
  { id: 'company_name', label: 'Company Name', type: 'text', required: true },
  { id: 'contact_name', label: 'Contact Name', type: 'text', required: true },
  { id: 'contact_email', label: 'Contact Email', type: 'email', required: true },
  { id: 'contact_phone', label: 'Contact Phone', type: 'phone', required: false },
  { id: 'contact_title', label: 'Contact Title', type: 'text', required: false },
  { id: 'industry', label: 'Industry', type: 'text', required: false },
  { id: 'company_size', label: 'Company Size', type: 'text', required: false },
  { id: 'revenue_range', label: 'Revenue Range', type: 'text', required: false },
  { id: 'location', label: 'Location', type: 'text', required: false },
  { id: 'website', label: 'Website', type: 'text', required: false },
  { id: 'linkedin_url', label: 'LinkedIn URL', type: 'text', required: false },
  { id: 'lead_score', label: 'Lead Score', type: 'number', required: false },
  { id: 'data_source', label: 'Data Source', type: 'text', required: false },
  { id: 'created_at', label: 'Created Date', type: 'date', required: false },
  { id: 'updated_at', label: 'Updated Date', type: 'date', required: false }
];

const CRM_FIELDS = {
  hubspot: [
    { id: 'firstname', label: 'First Name', type: 'text' },
    { id: 'lastname', label: 'Last Name', type: 'text' },
    { id: 'email', label: 'Email', type: 'email' },
    { id: 'phone', label: 'Phone', type: 'phone' },
    { id: 'jobtitle', label: 'Job Title', type: 'text' },
    { id: 'company', label: 'Company', type: 'text' },
    { id: 'website', label: 'Website', type: 'text' },
    { id: 'industry', label: 'Industry', type: 'text' },
    { id: 'annualrevenue', label: 'Annual Revenue', type: 'number' },
    { id: 'numberofemployees', label: 'Number of Employees', type: 'number' },
    { id: 'city', label: 'City', type: 'text' },
    { id: 'state', label: 'State', type: 'text' },
    { id: 'country', label: 'Country', type: 'text' },
    { id: 'linkedinbio', label: 'LinkedIn Bio', type: 'text' },
    { id: 'hubspotscore', label: 'HubSpot Score', type: 'number' },
    { id: 'lifecyclestage', label: 'Lifecycle Stage', type: 'picklist' },
    { id: 'leadsource', label: 'Lead Source', type: 'picklist' },
    { id: 'createdate', label: 'Create Date', type: 'date' },
    { id: 'lastmodifieddate', label: 'Last Modified Date', type: 'date' }
  ],
  salesforce: [
    { id: 'FirstName', label: 'First Name', type: 'text' },
    { id: 'LastName', label: 'Last Name', type: 'text' },
    { id: 'Email', label: 'Email', type: 'email' },
    { id: 'Phone', label: 'Phone', type: 'phone' },
    { id: 'Title', label: 'Title', type: 'text' },
    { id: 'Company', label: 'Company', type: 'text' },
    { id: 'Website', label: 'Website', type: 'text' },
    { id: 'Industry', label: 'Industry', type: 'picklist' },
    { id: 'AnnualRevenue', label: 'Annual Revenue', type: 'number' },
    { id: 'NumberOfEmployees', label: 'Number of Employees', type: 'number' },
    { id: 'City', label: 'City', type: 'text' },
    { id: 'State', label: 'State', type: 'text' },
    { id: 'Country', label: 'Country', type: 'text' },
    { id: 'LeadSource', label: 'Lead Source', type: 'picklist' },
    { id: 'Status', label: 'Status', type: 'picklist' },
    { id: 'Rating', label: 'Rating', type: 'picklist' },
    { id: 'CreatedDate', label: 'Created Date', type: 'date' },
    { id: 'LastModifiedDate', label: 'Last Modified Date', type: 'date' }
  ],
  pipedrive: [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'email', label: 'Email', type: 'email' },
    { id: 'phone', label: 'Phone', type: 'phone' },
    { id: 'job_title', label: 'Job Title', type: 'text' },
    { id: 'org_name', label: 'Organization Name', type: 'text' },
    { id: 'org_address', label: 'Organization Address', type: 'text' },
    { id: 'org_people_count', label: 'Organization People Count', type: 'number' },
    { id: 'owner_name', label: 'Owner Name', type: 'text' },
    { id: 'label', label: 'Label', type: 'picklist' },
    { id: 'visible_to', label: 'Visible To', type: 'picklist' },
    { id: 'add_time', label: 'Add Time', type: 'date' },
    { id: 'update_time', label: 'Update Time', type: 'date' }
  ]
};

const DEFAULT_MAPPINGS: Record<string, FieldMapping[]> = {
  hubspot: [
    { id: '1', svaraField: 'contact_name', crmField: 'firstname', direction: 'bidirectional', required: true, dataType: 'text' },
    { id: '2', svaraField: 'contact_email', crmField: 'email', direction: 'bidirectional', required: true, dataType: 'email' },
    { id: '3', svaraField: 'contact_phone', crmField: 'phone', direction: 'bidirectional', required: false, dataType: 'phone' },
    { id: '4', svaraField: 'contact_title', crmField: 'jobtitle', direction: 'bidirectional', required: false, dataType: 'text' },
    { id: '5', svaraField: 'company_name', crmField: 'company', direction: 'bidirectional', required: true, dataType: 'text' },
    { id: '6', svaraField: 'website', crmField: 'website', direction: 'bidirectional', required: false, dataType: 'text' },
    { id: '7', svaraField: 'industry', crmField: 'industry', direction: 'bidirectional', required: false, dataType: 'text' },
    { id: '8', svaraField: 'lead_score', crmField: 'hubspotscore', direction: 'to_crm', required: false, dataType: 'number' }
  ],
  salesforce: [
    { id: '1', svaraField: 'contact_name', crmField: 'FirstName', direction: 'bidirectional', required: true, dataType: 'text' },
    { id: '2', svaraField: 'contact_email', crmField: 'Email', direction: 'bidirectional', required: true, dataType: 'email' },
    { id: '3', svaraField: 'contact_phone', crmField: 'Phone', direction: 'bidirectional', required: false, dataType: 'phone' },
    { id: '4', svaraField: 'contact_title', crmField: 'Title', direction: 'bidirectional', required: false, dataType: 'text' },
    { id: '5', svaraField: 'company_name', crmField: 'Company', direction: 'bidirectional', required: true, dataType: 'text' },
    { id: '6', svaraField: 'website', crmField: 'Website', direction: 'bidirectional', required: false, dataType: 'text' },
    { id: '7', svaraField: 'industry', crmField: 'Industry', direction: 'bidirectional', required: false, dataType: 'text' }
  ],
  pipedrive: [
    { id: '1', svaraField: 'contact_name', crmField: 'name', direction: 'bidirectional', required: true, dataType: 'text' },
    { id: '2', svaraField: 'contact_email', crmField: 'email', direction: 'bidirectional', required: true, dataType: 'email' },
    { id: '3', svaraField: 'contact_phone', crmField: 'phone', direction: 'bidirectional', required: false, dataType: 'phone' },
    { id: '4', svaraField: 'contact_title', crmField: 'job_title', direction: 'bidirectional', required: false, dataType: 'text' },
    { id: '5', svaraField: 'company_name', crmField: 'org_name', direction: 'bidirectional', required: true, dataType: 'text' }
  ]
};

export default function FieldMappingDialog({ open, onOpenChange, provider, providerName, onSave }: FieldMappingDialogProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [activeTab, setActiveTab] = useState('mappings');
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 60, // minutes
    conflictResolution: 'crm_wins', // 'crm_wins' | 'svara_wins' | 'manual'
    enableDeduplication: true,
    createMissingRecords: true
  });

  useEffect(() => {
    if (open && provider) {
      setMappings(DEFAULT_MAPPINGS[provider] || []);
    }
  }, [open, provider]);

  const addMapping = () => {
    const newMapping: FieldMapping = {
      id: Date.now().toString(),
      svaraField: '',
      crmField: '',
      direction: 'bidirectional',
      required: false,
      dataType: 'text'
    };
    setMappings([...mappings, newMapping]);
  };

  const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
    setMappings(mappings.map(mapping => 
      mapping.id === id ? { ...mapping, ...updates } : mapping
    ));
  };

  const removeMapping = (id: string) => {
    setMappings(mappings.filter(mapping => mapping.id !== id));
  };

  const validateMappings = () => {
    const errors = [];
    const usedSvaraFields = new Set();
    const usedCrmFields = new Set();

    for (const mapping of mappings) {
      if (!mapping.svaraField || !mapping.crmField) {
        errors.push('All mappings must have both Svara and CRM fields selected');
        break;
      }

      if (usedSvaraFields.has(mapping.svaraField)) {
        errors.push(`Svara field "${mapping.svaraField}" is mapped multiple times`);
      }
      usedSvaraFields.add(mapping.svaraField);

      if (usedCrmFields.has(mapping.crmField)) {
        errors.push(`CRM field "${mapping.crmField}" is mapped multiple times`);
      }
      usedCrmFields.add(mapping.crmField);
    }

    // Check required fields
    const requiredSvaraFields = SVARA_FIELDS.filter(f => f.required).map(f => f.id);
    const mappedSvaraFields = mappings.map(m => m.svaraField);
    const missingRequired = requiredSvaraFields.filter(field => !mappedSvaraFields.includes(field));
    
    if (missingRequired.length > 0) {
      errors.push(`Required fields not mapped: ${missingRequired.join(', ')}`);
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateMappings();
    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'));
      return;
    }

    onSave(mappings);
    onOpenChange(false);
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bidirectional':
        return <ArrowRight className="h-4 w-4 rotate-0" />;
      case 'to_crm':
        return <ArrowRight className="h-4 w-4" />;
      case 'from_crm':
        return <ArrowRight className="h-4 w-4 rotate-180" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'bidirectional':
        return 'text-green-500';
      case 'to_crm':
        return 'text-blue-500';
      case 'from_crm':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const crmFields = CRM_FIELDS[provider as keyof typeof CRM_FIELDS] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Field Mapping - {providerName}</span>
          </DialogTitle>
          <DialogDescription>
            Configure how data flows between Svara and {providerName}. Map fields, set sync preferences, and define data transformation rules.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
            <TabsTrigger value="settings">Sync Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview & Test</TabsTrigger>
          </TabsList>

          <TabsContent value="mappings" className="flex-1 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Field Mappings</h4>
                  <p className="text-sm text-muted-foreground">
                    Define how fields map between Svara and {providerName}
                  </p>
                </div>
                <Button onClick={addMapping} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <Card key={mapping.id} className="p-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Svara Field */}
                        <div className="col-span-4">
                          <Label className="text-xs text-muted-foreground">Svara Field</Label>
                          <Select
                            value={mapping.svaraField}
                            onValueChange={(value) => updateMapping(mapping.id, { svaraField: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {SVARA_FIELDS.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  <div className="flex items-center space-x-2">
                                    <span>{field.label}</span>
                                    {field.required && (
                                      <Badge variant="secondary" className="text-xs">Required</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Direction */}
                        <div className="col-span-2 flex flex-col items-center">
                          <Label className="text-xs text-muted-foreground mb-2">Direction</Label>
                          <Select
                            value={mapping.direction}
                            onValueChange={(value: any) => updateMapping(mapping.id, { direction: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bidirectional">
                                <div className="flex items-center space-x-2">
                                  <ArrowRight className="h-3 w-3 text-green-500" />
                                  <span>Both Ways</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="to_crm">
                                <div className="flex items-center space-x-2">
                                  <ArrowRight className="h-3 w-3 text-blue-500" />
                                  <span>To CRM</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="from_crm">
                                <div className="flex items-center space-x-2">
                                  <ArrowRight className="h-3 w-3 text-purple-500 rotate-180" />
                                  <span>From CRM</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* CRM Field */}
                        <div className="col-span-4">
                          <Label className="text-xs text-muted-foreground">{providerName} Field</Label>
                          <Select
                            value={mapping.crmField}
                            onValueChange={(value) => updateMapping(mapping.id, { crmField: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {crmFields.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  <div className="flex items-center space-x-2">
                                    <span>{field.label}</span>
                                    <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-end space-x-2">
                          <div className="flex items-center space-x-1">
                            <Switch
                              checked={mapping.required}
                              onCheckedChange={(checked) => updateMapping(mapping.id, { required: checked })}
                              size="sm"
                            />
                            <Label className="text-xs">Required</Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMapping(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {mappings.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No field mappings configured</p>
                      <p className="text-sm">Click "Add Mapping" to get started</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 mt-4">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-4">Synchronization Settings</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatic Sync</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync data at regular intervals
                      </p>
                    </div>
                    <Switch
                      checked={syncSettings.autoSync}
                      onCheckedChange={(checked) => setSyncSettings(prev => ({ ...prev, autoSync: checked }))}
                    />
                  </div>

                  {syncSettings.autoSync && (
                    <div>
                      <Label>Sync Interval (minutes)</Label>
                      <Select
                        value={syncSettings.syncInterval.toString()}
                        onValueChange={(value) => setSyncSettings(prev => ({ ...prev, syncInterval: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="60">Every hour</SelectItem>
                          <SelectItem value="240">Every 4 hours</SelectItem>
                          <SelectItem value="1440">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label>Conflict Resolution</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      How to handle conflicts when the same record is updated in both systems
                    </p>
                    <Select
                      value={syncSettings.conflictResolution}
                      onValueChange={(value) => setSyncSettings(prev => ({ ...prev, conflictResolution: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crm_wins">CRM Always Wins</SelectItem>
                        <SelectItem value="svara_wins">Svara Always Wins</SelectItem>
                        <SelectItem value="manual">Manual Resolution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Deduplication</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically detect and merge duplicate records
                        </p>
                      </div>
                      <Switch
                        checked={syncSettings.enableDeduplication}
                        onCheckedChange={(checked) => setSyncSettings(prev => ({ ...prev, enableDeduplication: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Create Missing Records</Label>
                        <p className="text-sm text-muted-foreground">
                          Create new records in the target system if they don't exist
                        </p>
                      </div>
                      <Switch
                        checked={syncSettings.createMissingRecords}
                        onCheckedChange={(checked) => setSyncSettings(prev => ({ ...prev, createMissingRecords: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Mapping Preview</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Review your field mappings and test the configuration
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Svara Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mappings.map((mapping) => {
                        const svaraField = SVARA_FIELDS.find(f => f.id === mapping.svaraField);
                        return (
                          <div key={mapping.id} className="flex items-center justify-between text-sm">
                            <span>{svaraField?.label || mapping.svaraField}</span>
                            <div className={`flex items-center ${getDirectionColor(mapping.direction)}`}>
                              {getDirectionIcon(mapping.direction)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      {providerName} Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mappings.map((mapping) => {
                        const crmField = crmFields.find(f => f.id === mapping.crmField);
                        return (
                          <div key={mapping.id} className="flex items-center justify-between text-sm">
                            <div className={`flex items-center ${getDirectionColor(mapping.direction)}`}>
                              {getDirectionIcon(mapping.direction)}
                            </div>
                            <span>{crmField?.label || mapping.crmField}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Configuration looks good! {mappings.length} field mappings configured with {mappings.filter(m => m.required).length} required fields.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button variant="outline" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Validate Mappings
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}