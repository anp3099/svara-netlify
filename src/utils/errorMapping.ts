// Error type mapping utility to ensure DB constraint compliance

// Map internal error types to database-allowed enum values
export function mapErrorTypeToDb(errorType: string): string {
  const errorTypeMap: Record<string, string> = {
    // Map common internal error types to DB enum values
    'validation': 'validation_error',
    'validation_error': 'validation_error',
    'data_conflict': 'data_conflict_error', 
    'data_conflict_error': 'data_conflict_error',
    'unknown': 'unknown_error',
    'unknown_error': 'unknown_error',
    'api': 'api_error',
    'api_error': 'api_error',
    'authentication': 'authentication_error',
    'authentication_error': 'authentication_error',
    'authorization': 'authorization_error', 
    'authorization_error': 'authorization_error',
    'rate_limit': 'rate_limit_error',
    'rate_limit_error': 'rate_limit_error',
    'network': 'network_error',
    'network_error': 'network_error',
    'timeout': 'timeout_error',
    'timeout_error': 'timeout_error',
    'mapping': 'mapping_error',
    'mapping_error': 'mapping_error',
    'webhook': 'webhook_error',
    'webhook_error': 'webhook_error',
    'sync': 'sync_error',
    'sync_error': 'sync_error'
  }
  
  return errorTypeMap[errorType] || 'unknown_error'
}

// Map internal severity levels to database-allowed enum values
export function mapSeverityToDb(severity: string): string {
  const severityMap: Record<string, string> = {
    'low': 'low',
    'medium': 'medium', 
    'high': 'high',
    'critical': 'critical',
    // Handle common variations
    'info': 'low',
    'warn': 'medium',
    'warning': 'medium',
    'error': 'high',
    'fatal': 'critical'
  }
  
  return severityMap[severity] || 'medium'
}

// Safe JSON parsing utilities
export function safeParseJSON<T = any>(jsonString: string, fallback: T): T {
  try {
    if (!jsonString || jsonString.trim() === '') {
      return fallback
    }
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn('JSON parse failed, using fallback:', error)
    return fallback
  }
}

export function safeParse<T = any>(value: any, fallback: T): T {
  if (typeof value === 'string') {
    return safeParseJSON(value, fallback)
  }
  return value !== undefined && value !== null ? value : fallback
}

export function safeParseContext(context: any): Record<string, any> {
  if (typeof context === 'string') {
    return safeParseJSON(context, {})
  }
  if (typeof context === 'object' && context !== null) {
    return context
  }
  return {}
}

// Safe stringify for database storage
export function safeStringify(value: any): string {
  try {
    if (typeof value === 'string') {
      return value
    }
    return JSON.stringify(value)
  } catch (error) {
    console.warn('JSON stringify failed, using string conversion:', error)
    return String(value)
  }
}

// Generate unique IDs with timestamp and randomness
export function generateUniqueId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Sanitize error message for database storage
export function sanitizeErrorMessage(message: any): string {
  if (typeof message === 'string') {
    return message.slice(0, 1000) // Limit length to prevent DB issues
  }
  if (message && typeof message === 'object') {
    return safeStringify(message).slice(0, 1000)
  }
  return String(message || 'Unknown error').slice(0, 1000)
}

// Create safe error log payload
export function createSafeErrorLogPayload(params: {
  userId: string
  operation: string
  errorType: string
  message: any
  context?: any
  provider?: string
  connectionId?: string
  recordId?: string
  severity?: string
  retryable?: boolean
}): any {
  return {
    id: generateUniqueId('err'),
    user_id: params.userId,
    operation: params.operation,
    provider: params.provider || null,
    connection_id: params.connectionId || null,
    record_id: params.recordId || null,
    error_type: mapErrorTypeToDb(params.errorType),
    message: sanitizeErrorMessage(params.message),
    context: safeStringify(safeParseContext(params.context)),
    severity: mapSeverityToDb(params.severity || 'medium'),
    retryable: params.retryable ? 1 : 0,
    retry_count: 0,
    max_retries: 3
  }
}