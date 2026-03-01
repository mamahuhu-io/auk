/**
 * Composable for Git diff functionality
 * Provides access to file diffs and conflict content
 */

import { ref, computed } from "vue"
import { useWorkspaceStore } from "~/store/workspace"
import { getGitService } from "~/services/git/tauri-git"
import type {
  GitDiff,
  GitDiffFile,
  ConflictContent,
} from "~/services/git/types"

export function useGitDiff() {
  const { currentWorkspace } = useWorkspaceStore()
  const gitService = getGitService()

  // State
  const diff = ref<GitDiff | null>(null)
  const fileDiff = ref<GitDiffFile | null>(null)
  const conflictContent = ref<ConflictContent | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const workspacePath = computed(() => currentWorkspace.value?.path)
  const isGitEnabled = computed(
    () => currentWorkspace.value?.git?.enabled ?? false
  )

  const hasChanges = computed(() => {
    if (!diff.value) return false
    return diff.value.stats.filesChanged > 0
  })

  const totalAdditions = computed(() => diff.value?.stats.additions ?? 0)
  const totalDeletions = computed(() => diff.value?.stats.deletions ?? 0)
  const filesChanged = computed(() => diff.value?.stats.filesChanged ?? 0)

  /**
   * Load diff for working directory or specific commit
   */
  async function loadDiff(commitHash?: string): Promise<void> {
    if (!workspacePath.value || !isGitEnabled.value) {
      diff.value = null
      return
    }

    isLoading.value = true
    error.value = null

    try {
      diff.value = await gitService.getDiff(workspacePath.value, commitHash)
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load diff"
      console.error("[useGitDiff] Failed to load diff:", e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load diff for a specific file
   */
  async function loadFileDiff(
    file: string,
    staged: boolean = false,
    commitHash?: string
  ): Promise<void> {
    if (!workspacePath.value || !isGitEnabled.value) {
      fileDiff.value = null
      return
    }

    isLoading.value = true
    error.value = null

    try {
      fileDiff.value = await gitService.getFileDiff(
        workspacePath.value,
        file,
        staged,
        commitHash
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load file diff"
      console.error("[useGitDiff] Failed to load file diff:", e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load conflict content for a conflicted file
   */
  async function loadConflictContent(file: string): Promise<void> {
    if (!workspacePath.value || !isGitEnabled.value) {
      conflictContent.value = null
      return
    }

    isLoading.value = true
    error.value = null

    try {
      conflictContent.value = await gitService.getConflictContent(
        workspacePath.value,
        file
      )
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to load conflict content"
      console.error("[useGitDiff] Failed to load conflict content:", e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear all diff state
   */
  function clearDiff(): void {
    diff.value = null
    fileDiff.value = null
    conflictContent.value = null
    error.value = null
  }

  return {
    // State
    diff,
    fileDiff,
    conflictContent,
    isLoading,
    error,

    // Computed
    hasChanges,
    totalAdditions,
    totalDeletions,
    filesChanged,
    isGitEnabled,

    // Methods
    loadDiff,
    loadFileDiff,
    loadConflictContent,
    clearDiff,
  }
}
