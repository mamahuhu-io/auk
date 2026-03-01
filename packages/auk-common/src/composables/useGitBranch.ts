/**
 * Composable for Git branch management
 * Provides access to branch operations
 */

import { ref, computed } from "vue"
import { useService } from "dioc/vue"
import { useWorkspaceStore } from "~/store/workspace"
import { GitSyncManager } from "~/services/git/sync-manager"
import { getGitService } from "~/services/git/tauri-git"
import type {
  GitBranch,
  BranchOperationResult,
  MergeResult,
  GitStatus,
} from "~/services/git/types"

export function useGitBranch() {
  const gitSyncManager = useService(GitSyncManager)
  const { currentWorkspace } = useWorkspaceStore()
  const gitService = getGitService()

  // State
  const branches = ref<GitBranch[]>([])
  const isLoading = ref(false)
  const isOperating = ref(false)
  const error = ref<string | null>(null)
  const lastOperationResult = ref<BranchOperationResult | MergeResult | null>(
    null
  )

  // Computed
  const workspacePath = computed(() => currentWorkspace.value?.path)
  const isGitEnabled = computed(
    () => currentWorkspace.value?.git?.enabled ?? false
  )

  const currentBranch = computed(() => {
    return branches.value.find((b) => b.current)?.name ?? "main"
  })

  const localBranches = computed(() => {
    return branches.value.filter((b) => !b.remote)
  })

  const remoteBranches = computed(() => {
    return branches.value.filter((b) => b.remote)
  })

  const hasUnpushedCommits = computed(() => {
    const current = branches.value.find((b) => b.current)
    return current ? current.ahead > 0 : false
  })

  const hasPullableCommits = computed(() => {
    const current = branches.value.find((b) => b.current)
    return current ? current.behind > 0 : false
  })

  /**
   * Load all branches
   */
  async function loadBranches(): Promise<void> {
    if (!workspacePath.value || !isGitEnabled.value) {
      branches.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      branches.value = await gitService.listBranches(workspacePath.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load branches"
      console.error("[useGitBranch] Failed to load branches:", e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Checkout a branch
   */
  async function checkout(branch: string): Promise<BranchOperationResult> {
    if (!workspacePath.value || !isGitEnabled.value) {
      return {
        success: false,
        error: "Git not enabled",
        branch,
      }
    }

    isOperating.value = true
    error.value = null

    try {
      const result = await gitService.checkoutBranch(
        workspacePath.value,
        branch
      )
      lastOperationResult.value = result

      if (result.success) {
        // Refresh branches after checkout
        await loadBranches()
        // Refresh git status
        await gitSyncManager.refreshStatus()
      } else {
        error.value = result.error || "Checkout failed"
      }

      return result
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Checkout failed"
      error.value = errorMsg
      return {
        success: false,
        error: errorMsg,
        branch,
      }
    } finally {
      isOperating.value = false
    }
  }

  async function getWorkingStatus(): Promise<GitStatus | null> {
    if (!workspacePath.value || !isGitEnabled.value) {
      return null
    }

    try {
      return await gitService.status(workspacePath.value)
    } catch (e) {
      console.error("[useGitBranch] Failed to load status:", e)
      return null
    }
  }

  async function stashChanges(
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!workspacePath.value || !isGitEnabled.value) {
      return { success: false, error: "Git not enabled" }
    }

    isOperating.value = true
    error.value = null

    try {
      await gitService.stashChanges(
        workspacePath.value,
        message ?? "Auto-stash before branch switch"
      )
      await gitSyncManager.refreshStatus()
      return { success: true }
    } catch (e) {
      const errorMsg =
        e instanceof Error ? e.message : "Failed to stash changes"
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      isOperating.value = false
    }
  }

  async function discardChanges(): Promise<{
    success: boolean
    error?: string
  }> {
    if (!workspacePath.value || !isGitEnabled.value) {
      return { success: false, error: "Git not enabled" }
    }

    isOperating.value = true
    error.value = null

    try {
      await gitService.discardChanges(workspacePath.value)
      await gitSyncManager.refreshStatus()
      return { success: true }
    } catch (e) {
      const errorMsg =
        e instanceof Error ? e.message : "Failed to discard changes"
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      isOperating.value = false
    }
  }

  /**
   * Create a new branch
   */
  async function createBranch(
    name: string,
    startPoint?: string
  ): Promise<BranchOperationResult> {
    if (!workspacePath.value || !isGitEnabled.value) {
      return {
        success: false,
        error: "Git not enabled",
        branch: name,
      }
    }

    isOperating.value = true
    error.value = null

    try {
      const result = await gitService.createBranch(
        workspacePath.value,
        name,
        startPoint
      )
      lastOperationResult.value = result

      if (result.success) {
        // Refresh branches after creation
        await loadBranches()
        // Refresh git status
        await gitSyncManager.refreshStatus()
      } else {
        error.value = result.error || "Failed to create branch"
      }

      return result
    } catch (e) {
      const errorMsg =
        e instanceof Error ? e.message : "Failed to create branch"
      error.value = errorMsg
      return {
        success: false,
        error: errorMsg,
        branch: name,
      }
    } finally {
      isOperating.value = false
    }
  }

  /**
   * Delete a branch
   */
  async function deleteBranch(
    name: string,
    force: boolean = false
  ): Promise<BranchOperationResult> {
    if (!workspacePath.value || !isGitEnabled.value) {
      return {
        success: false,
        error: "Git not enabled",
        branch: name,
      }
    }

    isOperating.value = true
    error.value = null

    try {
      const result = await gitService.deleteBranch(
        workspacePath.value,
        name,
        force
      )
      lastOperationResult.value = result

      if (result.success) {
        // Refresh branches after deletion
        await loadBranches()
      } else {
        error.value = result.error || "Failed to delete branch"
      }

      return result
    } catch (e) {
      const errorMsg =
        e instanceof Error ? e.message : "Failed to delete branch"
      error.value = errorMsg
      return {
        success: false,
        error: errorMsg,
        branch: name,
      }
    } finally {
      isOperating.value = false
    }
  }

  /**
   * Merge a branch into current branch
   */
  async function mergeBranch(branch: string): Promise<MergeResult> {
    if (!workspacePath.value || !isGitEnabled.value) {
      return {
        success: false,
        merged: false,
        conflicts: [],
        error: "Git not enabled",
      }
    }

    isOperating.value = true
    error.value = null

    try {
      const result = await gitService.mergeBranch(workspacePath.value, branch)
      lastOperationResult.value = result

      if (result.success) {
        // Refresh branches after merge
        await loadBranches()
        // Refresh git status
        await gitSyncManager.refreshStatus()
      } else {
        error.value = result.error || "Merge failed"
      }

      return result
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Merge failed"
      error.value = errorMsg
      return {
        success: false,
        merged: false,
        conflicts: [],
        error: errorMsg,
      }
    } finally {
      isOperating.value = false
    }
  }

  /**
   * Refresh all branch data
   */
  async function refresh(): Promise<void> {
    await loadBranches()
  }

  return {
    // State
    branches,
    isLoading,
    isOperating,
    error,
    lastOperationResult,

    // Computed
    currentBranch,
    localBranches,
    remoteBranches,
    hasUnpushedCommits,
    hasPullableCommits,
    isGitEnabled,

    // Methods
    loadBranches,
    getWorkingStatus,
    checkout,
    stashChanges,
    discardChanges,
    createBranch,
    deleteBranch,
    mergeBranch,
    refresh,
  }
}
