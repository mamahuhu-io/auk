/**
 * Workspace Storage Utilities
 * Common utilities for workspace storage operations including:
 * - Logging with debug mode support
 * - Debounced change handlers
 * - Debounced save operations
 */

// ==================== Logger ====================

/**
 * Check if debug mode is enabled.
 * Debug logging is enabled in development mode or when explicitly set.
 */
const isDebugEnabled = (): boolean => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.DEV === true || import.meta.env.VITE_DEBUG === "true"
  }
  return false
}

/**
 * Workspace storage logger with debug mode support.
 * In production, only warnings and errors are logged.
 */
export const logger = {
  /**
   * Debug log - only shown in development mode
   */
  debug: (prefix: string, ...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.log(`[${prefix}]`, ...args)
    }
  },

  /**
   * Info log - only shown in development mode
   */
  info: (prefix: string, ...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.log(`[${prefix}]`, ...args)
    }
  },

  /**
   * Warning log - always shown
   */
  warn: (prefix: string, ...args: unknown[]): void => {
    console.warn(`[${prefix}]`, ...args)
  },

  /**
   * Error log - always shown
   */
  error: (prefix: string, ...args: unknown[]): void => {
    console.error(`[${prefix}]`, ...args)
  },
}

// ==================== Debounce Utilities ====================

/**
 * Options for creating a debounced external change handler
 */
export interface DebouncedChangeHandlerOptions {
  /** Function to check if a save is currently in progress */
  isSaving: () => boolean
  /** Function to check if Git sync is in progress */
  isGitSyncing: () => boolean
  /** Function to reload data from workspace */
  onReload: () => Promise<void>
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number
  /** Log prefix for debugging */
  logPrefix: string
}

/**
 * Creates a debounced external change handler that:
 * 1. Ignores changes while saving (to avoid reloading our own changes)
 * 2. Ignores changes during Git sync (to prevent lock contention)
 * 3. Debounces multiple rapid changes into a single reload
 * 4. Double-checks Git sync status after debounce delay
 *
 * @returns Object with handler function and cleanup function
 */
export function createDebouncedChangeHandler(
  options: DebouncedChangeHandlerOptions
): {
  handler: () => void
  cleanup: () => void
} {
  const {
    isSaving,
    isGitSyncing,
    onReload,
    debounceMs = 1000,
    logPrefix,
  } = options
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const handler = (): void => {
    // If we are currently saving, ignore changes (they are likely ours)
    if (isSaving()) {
      return
    }

    // If Git sync is in progress, ignore file changes to prevent blocking write lock
    if (isGitSyncing()) {
      logger.debug(logPrefix, "Git sync in progress, ignoring external change")
      return
    }

    // Debounce reload
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
      // Double-check Git sync status after debounce
      if (isGitSyncing()) {
        logger.debug(
          logPrefix,
          "Git sync in progress after debounce, skipping reload"
        )
        return
      }
      logger.debug(logPrefix, "External change detected, reloading...")
      await onReload()
    }, debounceMs)
  }

  const cleanup = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  return { handler, cleanup }
}

/**
 * Options for creating a debounced save handler
 */
export interface DebouncedSaveOptions {
  /** Function to check if Git sync is in progress */
  isGitSyncing: () => boolean
  /** Function to perform the save operation */
  onSave: () => Promise<void>
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number
  /** Log prefix for debugging */
  logPrefix: string
}

/**
 * Creates a debounced save handler that:
 * 1. Skips save if Git sync is in progress (to prevent lock contention)
 * 2. Debounces multiple rapid changes into a single save
 *
 * @returns Object with trigger function and cleanup function
 */
export function createDebouncedSave(options: DebouncedSaveOptions): {
  trigger: () => void
  cleanup: () => void
} {
  const { isGitSyncing, onSave, debounceMs = 1000, logPrefix } = options
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const trigger = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }

    saveTimer = setTimeout(async () => {
      // Skip save if Git sync is in progress to avoid blocking write lock acquisition
      if (isGitSyncing()) {
        logger.debug(logPrefix, "Git sync in progress, skipping debounced save")
        return
      }
      await onSave()
    }, debounceMs)
  }

  const cleanup = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  return { trigger, cleanup }
}
