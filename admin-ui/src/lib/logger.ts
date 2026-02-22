/**
 * Nebula DNS - Admin UI Logger
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Logger utility - Only logs in development mode
 * Prevents console statements from appearing in production builds
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Development-only logger
 * All methods are no-ops in production
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },

  info: (...args: unknown[]) => {
    if (isDev) console.info(...args)
  },

  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },

  error: (...args: unknown[]) => {
    if (isDev) console.error(...args)
  },

  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args)
  },

  /**
   * Always log errors, but with structured format
   * Use for critical errors that should be tracked even in production
   */
  critical: (message: string, error?: unknown) => {
    const errorInfo = {
      message,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }

    // In production, this could be sent to an error tracking service
    if (isDev) {
      console.error('[CRITICAL]', errorInfo)
    } else {
      // Production: could send to Sentry, LogRocket, etc.
      console.error('[CRITICAL]', message)
    }
  },
}

export default logger
