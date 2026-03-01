/**
 * Composable for Git history functionality
 * Provides access to sync history and commit log
 */

import { ref, computed } from "vue"
import { useWorkspaceStore } from "~/store/workspace"
import { getGitService } from "~/services/git/tauri-git"
import {
  getSyncHistory,
  clearWorkspaceHistory,
  getSyncStats,
} from "~/services/git/history-store"
import type { SyncHistoryEntry, GitCommit } from "~/services/git/types"

export function useGitHistory() {
  const { currentWorkspace } = useWorkspaceStore()
  const gitService = getGitService()

  // State
  const syncHistory = ref<SyncHistoryEntry[]>([])
  const commitLog = ref<GitCommit[]>([])
  const isLoadingHistory = ref(false)
  const isLoadingCommits = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const workspaceId = computed(() => currentWorkspace.value?.id)
  const workspacePath = computed(() => currentWorkspace.value?.path)
  const isGitEnabled = computed(
    () => currentWorkspace.value?.git?.enabled ?? false
  )

  const syncStats = computed(() => {
    if (!workspaceId.value) {
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalPulled: 0,
        totalPushed: 0,
        totalConflicts: 0,
      }
    }
    return getSyncStats(workspaceId.value)
  })

  const lastSync = computed(() => {
    return syncHistory.value[0] || null
  })

  /**
   * Load sync history from localStorage
   */
  function loadSyncHistory(): void {
    if (!workspaceId.value) {
      syncHistory.value = []
      return
    }

    isLoadingHistory.value = true
    error.value = null

    try {
      syncHistory.value = getSyncHistory(workspaceId.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load history"
      console.error("[useGitHistory] Failed to load sync history:", e)
    } finally {
      isLoadingHistory.value = false
    }
  }

  /**
   * Load commit log from Git
   */
  async function loadCommitLog(limit: number = 50): Promise<void> {
    if (!workspacePath.value || !isGitEnabled.value) {
      commitLog.value = []
      return
    }

    isLoadingCommits.value = true
    error.value = null

    try {
      commitLog.value = await gitService.getCommitLog(
        workspacePath.value,
        limit
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load commits"
      console.error("[useGitHistory] Failed to load commit log:", e)
    } finally {
      isLoadingCommits.value = false
    }
  }

  /**
   * Clear sync history for current workspace
   */
  function clearHistory(): number {
    if (!workspaceId.value) return 0

    const removed = clearWorkspaceHistory(workspaceId.value)
    syncHistory.value = []
    return removed
  }

  /**
   * Refresh all history data
   */
  async function refresh(): Promise<void> {
    loadSyncHistory()
    await loadCommitLog()
  }

  return {
    // State
    syncHistory,
    commitLog,
    isLoadingHistory,
    isLoadingCommits,
    error,

    // Computed
    syncStats,
    lastSync,
    isGitEnabled,

    // Methods
    loadSyncHistory,
    loadCommitLog,
    clearHistory,
    refresh,
  }
}
