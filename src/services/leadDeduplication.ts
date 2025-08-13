// Lead Deduplication and Conflict Resolution Service
import { blink } from '../blink/client';

export interface LeadDuplicate {
  id: string;
  originalLead: any;
  duplicateLeads: any[];
  matchScore: number;
  matchCriteria: string[];
  conflictFields: string[];
  suggestedResolution: 'merge' | 'keep_original' | 'manual_review';
  confidence: number;
}

export interface DeduplicationRule {
  id: string;
  name: string;
  fields: string[];
  matchType: 'exact' | 'fuzzy' | 'phonetic' | 'domain';
  threshold: number;
  weight: number;
  enabled: boolean;
}

export interface MergeStrategy {
  field: string;
  strategy: 'newest' | 'oldest' | 'longest' | 'highest_score' | 'manual' | 'concatenate';
  priority: number;
}

export class LeadDeduplicationService {
  private static instance: LeadDeduplicationService;
  
  // Default deduplication rules
  private defaultRules: DeduplicationRule[] = [
    {
      id: 'email_exact',
      name: 'Exact Email Match',
      fields: ['contactEmail'],
      matchType: 'exact',
      threshold: 1.0,
      weight: 0.4,
      enabled: true
    },
    {
      id: 'phone_exact',
      name: 'Exact Phone Match',
      fields: ['contactPhone'],
      matchType: 'exact',
      threshold: 1.0,
      weight: 0.3,
      enabled: true
    },
    {
      id: 'company_domain',
      name: 'Company Domain Match',
      fields: ['website'],
      matchType: 'domain',
      threshold: 0.9,
      weight: 0.25,
      enabled: true
    },
    {
      id: 'name_company_fuzzy',
      name: 'Fuzzy Name + Company Match',
      fields: ['contactName', 'companyName'],
      matchType: 'fuzzy',
      threshold: 0.85,
      weight: 0.2,
      enabled: true
    },
    {
      id: 'linkedin_exact',
      name: 'LinkedIn Profile Match',
      fields: ['linkedinUrl'],
      matchType: 'exact',
      threshold: 1.0,
      weight: 0.35,
      enabled: true
    }
  ];

  // Default merge strategies
  private defaultMergeStrategies: MergeStrategy[] = [
    { field: 'contactEmail', strategy: 'newest', priority: 1 },
    { field: 'contactPhone', strategy: 'longest', priority: 2 },
    { field: 'contactName', strategy: 'longest', priority: 3 },
    { field: 'contactTitle', strategy: 'newest', priority: 4 },
    { field: 'companyName', strategy: 'longest', priority: 5 },
    { field: 'website', strategy: 'newest', priority: 6 },
    { field: 'leadScore', strategy: 'highest_score', priority: 7 },
    { field: 'industry', strategy: 'newest', priority: 8 },
    { field: 'companySize', strategy: 'newest', priority: 9 },
    { field: 'revenueRange', strategy: 'newest', priority: 10 },
    { field: 'location', strategy: 'newest', priority: 11 },
    { field: 'linkedinUrl', strategy: 'newest', priority: 12 }
  ];

  static getInstance(): LeadDeduplicationService {
    if (!LeadDeduplicationService.instance) {
      LeadDeduplicationService.instance = new LeadDeduplicationService();
    }
    return LeadDeduplicationService.instance;
  }

  /**
   * Find duplicate leads for a given lead
   */
  async findDuplicates(userId: string, leadId: string): Promise<LeadDuplicate[]> {
    try {
      // Get the original lead
      const originalLeads = await blink.db.leads.list({
        where: { id: leadId, userId },
        limit: 1
      });

      if (originalLeads.length === 0) {
        throw new Error('Lead not found');
      }

      const originalLead = originalLeads[0];
      
      // Get all other leads for the user
      const allLeads = await blink.db.leads.list({
        where: { userId },
        limit: 10000 // Get all leads for comparison
      });

      const otherLeads = allLeads.filter(lead => lead.id !== leadId);
      const duplicates: LeadDuplicate[] = [];

      // Apply deduplication rules
      for (const lead of otherLeads) {
        const matchResult = await this.calculateMatchScore(originalLead, lead);
        
        if (matchResult.score >= 0.7) { // Threshold for considering as duplicate
          duplicates.push({
            id: `dup_${leadId}_${lead.id}`,
            originalLead,
            duplicateLeads: [lead],
            matchScore: matchResult.score,
            matchCriteria: matchResult.criteria,
            conflictFields: this.identifyConflictFields(originalLead, lead),
            suggestedResolution: this.suggestResolution(matchResult.score),
            confidence: matchResult.confidence
          });
        }
      }

      // Sort by match score (highest first)
      return duplicates.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error finding duplicates:', error);
      throw error;
    }
  }

  /**
   * Run deduplication across all leads for a user
   */
  async runFullDeduplication(userId: string): Promise<LeadDuplicate[]> {
    try {
      const allLeads = await blink.db.leads.list({
        where: { userId },
        limit: 10000
      });

      const duplicateGroups: Map<string, LeadDuplicate> = new Map();
      const processedPairs = new Set<string>();

      for (let i = 0; i < allLeads.length; i++) {
        for (let j = i + 1; j < allLeads.length; j++) {
          const lead1 = allLeads[i];
          const lead2 = allLeads[j];
          
          const pairKey = `${Math.min(lead1.id, lead2.id)}_${Math.max(lead1.id, lead2.id)}`;
          if (processedPairs.has(pairKey)) continue;
          
          processedPairs.add(pairKey);
          
          const matchResult = await this.calculateMatchScore(lead1, lead2);
          
          if (matchResult.score >= 0.7) {
            const duplicateId = `dup_${lead1.id}_${lead2.id}`;
            
            duplicateGroups.set(duplicateId, {
              id: duplicateId,
              originalLead: lead1,
              duplicateLeads: [lead2],
              matchScore: matchResult.score,
              matchCriteria: matchResult.criteria,
              conflictFields: this.identifyConflictFields(lead1, lead2),
              suggestedResolution: this.suggestResolution(matchResult.score),
              confidence: matchResult.confidence
            });
          }
        }
      }

      return Array.from(duplicateGroups.values())
        .sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error running full deduplication:', error);
      throw error;
    }
  }

  /**
   * Merge duplicate leads
   */
  async mergeLeads(userId: string, duplicateId: string, mergeStrategy?: Partial<Record<string, string>>): Promise<any> {
    try {
      // This would typically get the duplicate info from a temporary storage
      // For now, we'll implement a basic merge logic
      
      const duplicates = await this.findDuplicates(userId, duplicateId.split('_')[1]);
      const duplicate = duplicates.find(d => d.id === duplicateId);
      
      if (!duplicate) {
        throw new Error('Duplicate not found');
      }

      const originalLead = duplicate.originalLead;
      const duplicateLead = duplicate.duplicateLeads[0];
      
      // Apply merge strategies
      const mergedData = await this.applyMergeStrategies(
        originalLead, 
        duplicateLead, 
        mergeStrategy
      );

      // Update the original lead
      await blink.db.leads.update(originalLead.id, mergedData);

      // Delete the duplicate lead
      await blink.db.leads.delete(duplicateLead.id);

      // Log the merge activity
      await this.logMergeActivity(userId, originalLead.id, duplicateLead.id, mergedData);

      return mergedData;
    } catch (error) {
      console.error('Error merging leads:', error);
      throw error;
    }
  }

  /**
   * Calculate match score between two leads
   */
  private async calculateMatchScore(lead1: any, lead2: any): Promise<{
    score: number;
    criteria: string[];
    confidence: number;
  }> {
    let totalScore = 0;
    let totalWeight = 0;
    const matchedCriteria: string[] = [];

    for (const rule of this.defaultRules) {
      if (!rule.enabled) continue;

      const ruleScore = this.applyRule(lead1, lead2, rule);
      if (ruleScore >= rule.threshold) {
        totalScore += ruleScore * rule.weight;
        matchedCriteria.push(rule.name);
      }
      totalWeight += rule.weight;
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = this.calculateConfidence(matchedCriteria.length, this.defaultRules.length);

    return {
      score: normalizedScore,
      criteria: matchedCriteria,
      confidence
    };
  }

  /**
   * Apply a specific deduplication rule
   */
  private applyRule(lead1: any, lead2: any, rule: DeduplicationRule): number {
    const values1 = rule.fields.map(field => this.getFieldValue(lead1, field));
    const values2 = rule.fields.map(field => this.getFieldValue(lead2, field));

    switch (rule.matchType) {
      case 'exact':
        return this.exactMatch(values1, values2);
      case 'fuzzy':
        return this.fuzzyMatch(values1, values2);
      case 'phonetic':
        return this.phoneticMatch(values1, values2);
      case 'domain':
        return this.domainMatch(values1, values2);
      default:
        return 0;
    }
  }

  /**
   * Exact string matching
   */
  private exactMatch(values1: string[], values2: string[]): number {
    for (let i = 0; i < values1.length; i++) {
      const val1 = this.normalizeString(values1[i]);
      const val2 = this.normalizeString(values2[i]);
      
      if (val1 && val2 && val1 === val2) {
        return 1.0;
      }
    }
    return 0;
  }

  /**
   * Fuzzy string matching using Levenshtein distance
   */
  private fuzzyMatch(values1: string[], values2: string[]): number {
    let maxSimilarity = 0;
    
    for (let i = 0; i < values1.length; i++) {
      const val1 = this.normalizeString(values1[i]);
      const val2 = this.normalizeString(values2[i]);
      
      if (val1 && val2) {
        const similarity = this.calculateSimilarity(val1, val2);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    
    return maxSimilarity;
  }

  /**
   * Phonetic matching (simplified Soundex-like algorithm)
   */
  private phoneticMatch(values1: string[], values2: string[]): number {
    for (let i = 0; i < values1.length; i++) {
      const val1 = this.getPhoneticCode(values1[i]);
      const val2 = this.getPhoneticCode(values2[i]);
      
      if (val1 && val2 && val1 === val2) {
        return 0.9; // High but not perfect match for phonetic
      }
    }
    return 0;
  }

  /**
   * Domain matching for websites/emails
   */
  private domainMatch(values1: string[], values2: string[]): number {
    for (let i = 0; i < values1.length; i++) {
      const domain1 = this.extractDomain(values1[i]);
      const domain2 = this.extractDomain(values2[i]);
      
      if (domain1 && domain2 && domain1 === domain2) {
        return 1.0;
      }
    }
    return 0;
  }

  /**
   * Identify fields with conflicting values
   */
  private identifyConflictFields(lead1: any, lead2: any): string[] {
    const conflicts: string[] = [];
    const fieldsToCheck = [
      'contactName', 'contactEmail', 'contactPhone', 'contactTitle',
      'companyName', 'website', 'industry', 'companySize', 'revenueRange',
      'location', 'linkedinUrl'
    ];

    for (const field of fieldsToCheck) {
      const val1 = this.getFieldValue(lead1, field);
      const val2 = this.getFieldValue(lead2, field);
      
      if (val1 && val2 && val1 !== val2) {
        conflicts.push(field);
      }
    }

    return conflicts;
  }

  /**
   * Suggest resolution strategy based on match score
   */
  private suggestResolution(matchScore: number): 'merge' | 'keep_original' | 'manual_review' {
    if (matchScore >= 0.95) return 'merge';
    if (matchScore >= 0.85) return 'manual_review';
    return 'keep_original';
  }

  /**
   * Apply merge strategies to combine lead data
   */
  private async applyMergeStrategies(
    originalLead: any, 
    duplicateLead: any, 
    customStrategies?: Partial<Record<string, string>>
  ): Promise<any> {
    const mergedData = { ...originalLead };

    for (const strategy of this.defaultMergeStrategies) {
      const customStrategy = customStrategies?.[strategy.field];
      const strategyToUse = customStrategy || strategy.strategy;

      const originalValue = this.getFieldValue(originalLead, strategy.field);
      const duplicateValue = this.getFieldValue(duplicateLead, strategy.field);

      const mergedValue = this.applyMergeStrategy(
        originalValue,
        duplicateValue,
        strategyToUse,
        originalLead,
        duplicateLead
      );

      if (mergedValue !== undefined) {
        this.setFieldValue(mergedData, strategy.field, mergedValue);
      }
    }

    return mergedData;
  }

  /**
   * Apply a specific merge strategy
   */
  private applyMergeStrategy(
    originalValue: any,
    duplicateValue: any,
    strategy: string,
    originalLead: any,
    duplicateLead: any
  ): any {
    if (!duplicateValue) return originalValue;
    if (!originalValue) return duplicateValue;

    switch (strategy) {
      case 'newest':
        return new Date(duplicateLead.createdAt) > new Date(originalLead.createdAt) 
          ? duplicateValue : originalValue;
      case 'oldest':
        return new Date(duplicateLead.createdAt) < new Date(originalLead.createdAt) 
          ? duplicateValue : originalValue;
      case 'longest':
        return String(duplicateValue).length > String(originalValue).length 
          ? duplicateValue : originalValue;
      case 'highest_score':
        return Number(duplicateValue) > Number(originalValue) 
          ? duplicateValue : originalValue;
      case 'concatenate':
        return `${originalValue}; ${duplicateValue}`;
      case 'manual':
        return originalValue; // Keep original for manual review
      default:
        return originalValue;
    }
  }

  /**
   * Helper methods
   */
  private getFieldValue(obj: any, field: string): string {
    return obj[field] || '';
  }

  private setFieldValue(obj: any, field: string, value: any): void {
    obj[field] = value;
  }

  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  private getPhoneticCode(str: string): string {
    if (!str) return '';
    
    // Simplified phonetic algorithm
    return str.toLowerCase()
      .replace(/[aeiou]/g, '')
      .replace(/[^a-z]/g, '')
      .substring(0, 4)
      .padEnd(4, '0');
  }

  private extractDomain(url: string): string {
    if (!url) return '';
    
    try {
      // Handle email addresses
      if (url.includes('@')) {
        return url.split('@')[1].toLowerCase();
      }
      
      // Handle URLs
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  private calculateConfidence(matchedRules: number, totalRules: number): number {
    return totalRules > 0 ? matchedRules / totalRules : 0;
  }

  private async logMergeActivity(
    userId: string, 
    originalLeadId: string, 
    duplicateLeadId: string, 
    mergedData: any
  ): Promise<void> {
    try {
      await blink.db.analyticsEvents.create({
        id: `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        eventType: 'lead_merge',
        eventData: JSON.stringify({
          originalLeadId,
          duplicateLeadId,
          mergedFields: Object.keys(mergedData),
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log merge activity:', error);
    }
  }

  /**
   * Process batch duplicates with auto-resolution option
   */
  async processBatchDuplicates(userId: string, autoResolve: boolean = false): Promise<{
    success: boolean;
    processed: number;
    resolved: number;
    errors: string[];
  }> {
    try {
      const duplicates = await this.runFullDeduplication(userId);
      let processed = 0;
      let resolved = 0;
      const errors: string[] = [];

      for (const duplicate of duplicates) {
        try {
          processed++;
          
          if (autoResolve && duplicate.suggestedResolution === 'merge') {
            await this.mergeLeads(userId, duplicate.id);
            resolved++;
          }
        } catch (error) {
          errors.push(`Failed to process duplicate ${duplicate.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        processed,
        resolved,
        errors
      };
    } catch (error) {
      console.error('Error processing batch duplicates:', error);
      return {
        success: false,
        processed: 0,
        resolved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get deduplication statistics for a user
   */
  async getDeduplicationStats(userId: string): Promise<{
    totalLeads: number;
    duplicatesFound: number;
    duplicatesResolved: number;
    potentialSavings: number;
  }> {
    try {
      const allLeads = await blink.db.leads.list({
        where: { userId },
        limit: 10000
      });

      const duplicates = await this.runFullDeduplication(userId);
      
      // Get resolved duplicates from analytics
      const mergeEvents = await blink.db.analyticsEvents.list({
        where: { userId, eventType: 'lead_merge' },
        limit: 1000
      });

      return {
        totalLeads: allLeads.length,
        duplicatesFound: duplicates.length,
        duplicatesResolved: mergeEvents.length,
        potentialSavings: duplicates.length * 0.15 // Estimated 15% cost savings per duplicate
      };
    } catch (error) {
      console.error('Error getting deduplication stats:', error);
      return {
        totalLeads: 0,
        duplicatesFound: 0,
        duplicatesResolved: 0,
        potentialSavings: 0
      };
    }
  }
}

// Export singleton instance
export const leadDeduplicationService = LeadDeduplicationService.getInstance();