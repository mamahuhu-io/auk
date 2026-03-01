/**
 * Git Sync History Store
 * Stores sync history in localStorage for persistence
 */

import type { SyncHistoryEntry } from "./types"
import {
  storageGetItem,
  storageRemoveItem,
  storageSetItem,
} from "./browser-storage"

const STORAGE_KEY = "auk_git_sync_history"
const MAX_ENTRIES = 100

/**
 * Generate a unique ID for history entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get all sync history entries from localStorage
 */
export function getSyncHistory(workspaceId?: string): SyncHistoryEntry[] {
  try {
    const data = storageGetItem(STORAGE_KEY)
    if (!data) return []

    const entries: SyncHistoryEntry[] = JSON.parse(data).map(
      (entry: SyncHistoryEntry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      })
    )

    // Filter by workspace if specified
    if (workspaceId) {
      return entries.filter((e) => e.workspaceId === workspaceId)
    }

    return entries
  } catch (error) {
    console.error("[GitHistoryStore] Failed to load history:", error)
    return []
  }
}

/**
 * Add a new sync history entry
 */
export function addSyncHistoryEntry(
  entry: Omit<SyncHistoryEntry, "id" | "timestamp">
): SyncHistoryEntry {
  const newEntry: SyncHistoryEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date(),
  }

  try {
    const entries = getSyncHistory()
    entries.unshift(newEntry)

    // Keep only the most recent entries
    const trimmedEntries = entries.slice(0, MAX_ENTRIES)

    storageSetItem(STORAGE_KEY, JSON.stringify(trimmedEntries))
    console.log("[GitHistoryStore] Added history entry:", newEntry.id)

    return newEntry
  } catch (error) {
    console.error("[GitHistoryStore] Failed to add entry:", error)
    return newEntry
  }
}

/**
 * Clear old entries beyond the limit
 */
export function clearOldEntries(keepCount: number = MAX_ENTRIES): number {
  try {
    const entries = getSyncHistory()
    const removedCount = Math.max(0, entries.length - keepCount)

    if (removedCount > 0) {
      const trimmedEntries = entries.slice(0, keepCount)
      storageSetItem(STORAGE_KEY, JSON.stringify(trimmedEntries))
      console.log(`[GitHistoryStore] Cleared ${removedCount} old entries`)
    }

    return removedCount
  } catch (error) {
    console.error("[GitHistoryStore] Failed to clear old entries:", error)
    return 0
  }
}

/**
 * Clear all sync history for a specific workspace
 */
export function clearWorkspaceHistory(workspaceId: string): number {
  try {
    const entries = getSyncHistory()
    const filteredEntries = entries.filter((e) => e.workspaceId !== workspaceId)
    const removedCount = entries.length - filteredEntries.length

    storageSetItem(STORAGE_KEY, JSON.stringify(filteredEntries))
    console.log(
      `[GitHistoryStore] Cleared ${removedCount} entries for workspace ${workspaceId}`
    )

    return removedCount
  } catch (error) {
    console.error("[GitHistoryStore] Failed to clear workspace history:", error)
    return 0
  }
}

/**
 * Clear all sync history
 */
export function clearAllHistory(): void {
  try {
    storageRemoveItem(STORAGE_KEY)
    console.log("[GitHistoryStore] Cleared all history")
  } catch (error) {
    console.error("[GitHistoryStore] Failed to clear all history:", error)
  }
}

/**
 * Get the most recent sync entry for a workspace
 */
export function getLastSyncEntry(
  workspaceId: string
): SyncHistoryEntry | undefined {
  const entries = getSyncHistory(workspaceId)
  return entries[0]
}

/**
 * Get sync statistics for a workspace
 */
export function getSyncStats(workspaceId: string): {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  totalPulled: number
  totalPushed: number
  totalConflicts: number
} {
  const entries = getSyncHistory(workspaceId)

  return {
    totalSyncs: entries.length,
    successfulSyncs: entries.filter((e) => e.result === "success").length,
    failedSyncs: entries.filter((e) => e.result === "failed").length,
    totalPulled: entries.reduce((sum, e) => sum + e.pulled, 0),
    totalPushed: entries.reduce((sum, e) => sum + e.pushed, 0),
    totalConflicts: entries.filter((e) => e.result === "conflicts").length,
  }
}
