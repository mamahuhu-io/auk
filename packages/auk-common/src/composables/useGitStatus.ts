/**
 * Composable for Git status related functionality
 * Provides unified access to Git state across components
 */

import { computed } from "vue"
import { useService } from "dioc/vue"
import { GitSyncManager } from "~/services/git/sync-manager"
import { useWorkspaceStore } from "~/store/workspace"

export function useGitStatus() {
  const gitSyncManager = useService(GitSyncManager)
  const { currentWorkspace } = useWorkspaceStore()

  // Basic state
  const isGitEnabled = computed(
    () => currentWorkspace.value?.git?.enabled ?? false
  )

  const isSyncing = computed(() => gitSyncManager.isSyncing.value)

  const hasChanges = computed(() => gitSyncManager.hasChanges.value)

  const gitStatus = computed(() => gitSyncManager.gitStatus.value)

  const lastSyncTime = computed(() => gitSyncManager.lastSyncTime.value)
  const lastSyncResult = computed(() => gitSyncManager.lastSyncResult.value)

  const error = computed(() => gitSyncManager.error.value)

  // Conflict related
  const conflicts = computed(() => {
    const status = gitSyncManager.gitStatus.value
    if (status) return status.conflicted
    return lastSyncResult.value?.conflicts ?? []
  })

  const conflictsCount = computed(() => conflicts.value.length)

  const hasConflicts = computed(() => conflictsCount.value > 0)

  const showConflictModal = computed({
    get: () => gitSyncManager.showConflictModal.value,
    set: (value: boolean) => (gitSyncManager.showConflictModal.value = value),
  })

  // Banner related
  const isBannerDismissed = computed(
    () => gitSyncManager.isBannerDismissed.value
  )

  // Branch info
  const branch = computed(
    () =>
      gitSyncManager.gitStatus.value?.branch ??
      currentWorkspace.value?.git?.branch ??
      "main"
  )

  // Changes count
  const changesCount = computed(() => {
    const status = gitSyncManager.gitStatus.value
    if (!status) return 0
    return (
      status.modified.length + status.untracked.length + status.staged.length
    )
  })

  // Status color for indicators
  const statusColor = computed(() => {
    if (hasConflicts.value) return "text-red-500"
    if (hasChanges.value) return "text-amber-500"
    return "text-green-500"
  })

  // Methods
  const openConflictModal = () => {
    gitSyncManager.showConflictModal.value = true
  }

  const closeConflictModal = () => {
    gitSyncManager.showConflictModal.value = false
  }

  const dismissBanner = () => {
    gitSyncManager.dismissBanner()
  }

  const sync = async (options?: {
    initialStrategy?: "ask" | "remote" | "local"
  }) => {
    return await gitSyncManager.sync(options)
  }

  const resolveConflictAndContinue = async (
    file: string,
    resolution: "ours" | "theirs"
  ) => {
    return await gitSyncManager.resolveConflictAndContinue(file, resolution)
  }

  const resolveConflictWithContentAndContinue = async (
    file: string,
    content: string
  ) => {
    return await gitSyncManager.resolveConflictWithContentAndContinue(
      file,
      content
    )
  }

  const abortRebase = async () => {
    return await gitSyncManager.abortRebase()
  }

  return {
    // State
    gitSyncManager,
    currentWorkspace,
    isGitEnabled,
    isSyncing,
    hasChanges,
    hasConflicts,
    gitStatus,
    lastSyncTime,
    lastSyncResult,
    error,

    // Conflict related
    conflicts,
    conflictsCount,
    showConflictModal,

    // Banner related
    isBannerDismissed,

    // Branch info
    branch,
    changesCount,
    statusColor,

    // Methods
    openConflictModal,
    closeConflictModal,
    dismissBanner,
    sync,
    resolveConflictAndContinue,
    resolveConflictWithContentAndContinue,
    abortRebase,
  }
}
