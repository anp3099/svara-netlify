import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely convert a value to upper-case string.
 * - If value is a non-empty string, use it.
 * - If value is null/undefined/empty, use the provided fallback.
 */
export function safeToUpper(value?: unknown, fallback = 'UNKNOWN'): string {
  try {
    if (typeof value === 'string' && value.trim().length > 0) return value.toUpperCase()
    if (value == null) return fallback.toUpperCase()
    return String(value).toUpperCase()
  } catch {
    return fallback.toUpperCase()
  }
}

/**
 * Safely capitalize the first letter of a string and keep the rest as-is.
 * Falls back to the provided fallback when the value is missing.
 */
export function safeCapitalize(value?: unknown, fallback = 'Unknown'): string {
  try {
    const s = typeof value === 'string' && value.trim().length > 0 ? value : (value == null ? fallback : String(value))
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return fallback
  }
}
