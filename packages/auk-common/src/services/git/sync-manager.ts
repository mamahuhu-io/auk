/**
 * Git Sync Manager
 * Orchestrates Git operations with workspace integration
 */

import { ref, computed, watch } from "vue"
import { Service } from "dioc"
import type { GitService, SyncResult, GitStatus, GitCredentials } from "./types"
import { getGitService } from "./tauri-git"
import { addSyncHistoryEntry } from "./history-store"
import { useWorkspaceStore } from "~/store/workspace"
import { WorkspaceCollectionsService } from "~/services/workspace-collections.service"
import { WorkspaceEnvironmentsService } from "~/services/workspace-environments.service"
import { gitSyncLock } from "~/services/workspace-storage/async-lock"
import { useToast } from "~/composables/toast"
import { getI18n } from "~/modules/i18n"

// Flag to pause file watchers during Git sync operations
// This prevents the watcher -> load -> save -> watcher cycle from blocking write lock acquisition
let isGitSyncInProgress = false

export function getIsGitSyncInProgress(): boolean {
  return isGitSyncInProgress
}

export interface SyncState {
  isSyncing: boolean
  lastSyncTime: Date | null
  lastSyncResult: SyncResult | null
  status: GitStatus | null
  error: string | null
  showConflictModal: boolean
  bannerDismissedForWorkspace: string | null
}

export class GitSyncManager extends Service {
  public static readonly ID = "GIT_SYNC_MANAGER"

  private gitService!: GitService
  private syncIntervals: Map<string, ReturnType<typeof setInterval>> = new Map()

  // Track the conflicts we've already notified about (to avoid repeated toasts)
  private notifiedConflicts: Set<string> = new Set()

  private readonly workspaceCollectionsService = this.bind(
    WorkspaceCollectionsService
  )
  private readonly workspaceEnvironmentsService = this.bind(
    WorkspaceEnvironmentsService
  )

  // Reactive state
  public state = ref<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null,
    status: null,
    error: null,
    showConflictModal: false,
    bannerDismissedForWorkspace: null,
  })

  // Computed properties for easy access
  public isSyncing = computed(() => this.state.value.isSyncing)
  public lastSyncTime = computed(() => this.state.value.lastSyncTime)
  public lastSyncResult = computed(() => this.state.value.lastSyncResult)
  public gitStatus = computed(() => this.state.value.status)
  public error = computed(() => this.state.value.error)
  public showConflictModal = computed({
    get: () => this.state.value.showConflictModal,
    set: (value: boolean) => {
      this.state.value = {
        ...this.state.value,
        showConflictModal: value,
      }
    },
  })

  public hasChanges = computed(() => {
    const status = this.state.value.status
    if (!status) return false
    return (
      status.modified.length > 0 ||
      status.untracked.length > 0 ||
      status.staged.length > 0
    )
  })

  public hasConflicts = computed(() => {
    const status = this.state.value.status
    if (!status) return false
    return status.conflicted.length > 0
  })

  // Check if banner is dismissed for current workspace
  public isBannerDismissed = computed(() => {
    const { currentWorkspace } = useWorkspaceStore()
    return (
      this.state.value.bannerDismissedForWorkspace ===
      currentWorkspace.value?.id
    )
  })

  /**
   * Dismiss the conflict banner for current workspace
   */
  public dismissBanner() {
    const { currentWorkspace } = useWorkspaceStore()
    this.state.value = {
      ...this.state.value,
      bannerDismissedForWorkspace: currentWorkspace.value?.id ?? null,
    }
  }

  /**
   * Show toast notification when NEW conflicts are detected (not already notified)
   */
  private showConflictToast(conflicts: string[], workspaceName?: string) {
    if (conflicts.length === 0) return

    // Check if there are any new conflicts we haven't notified about
    const newConflicts = conflicts.filter(
      (file) => !this.notifiedConflicts.has(file)
    )

    // If all conflicts have already been notified, don't show toast again
    if (newConflicts.length === 0) return

    // Mark all current conflicts as notified
    conflicts.forEach((file) => this.notifiedConflicts.add(file))

    const toast = useToast()
    const t = getI18n()

    const message = workspaceName
      ? t("workspace.git_conflict_toast_with_name", {
          name: workspaceName,
          count: conflicts.length,
        })
      : t("workspace.git_conflict_toast", { count: conflicts.length })

    toast.error(message, {
      duration: 5000,
      action: {
        text: t("workspace.git_resolve_conflicts"),
        onClick: (_e, toastObject) => {
          this.state.value = {
            ...this.state.value,
            showConflictModal: true,
          }
          toastObject.goAway(0)
        },
      },
    })
  }

  override onServiceInit() {
    console.log("[GitSyncManager] Initializing...")
    this.gitService = getGitService()
    this.setupWorkspaceWatcher()
  }

  onServiceDestroy() {
    // Clear all sync intervals
    for (const interval of this.syncIntervals.values()) {
      clearInterval(interval)
    }
    this.syncIntervals.clear()
  }

  private setupWorkspaceWatcher() {
    const { currentWorkspace, isInitialized } = useWorkspaceStore()

    // Watch for workspace changes
    watch(
      () => currentWorkspace.value,
      async (newWorkspace, oldWorkspace) => {
        console.log(
          "[GitSyncManager] Workspace changed:",
          newWorkspace?.name,
          "git enabled:",
          newWorkspace?.git?.enabled
        )
        if (
          newWorkspace?.id !== oldWorkspace?.id ||
          newWorkspace?.git?.enabled !== oldWorkspace?.git?.enabled
        ) {
          await this.onWorkspaceChanged(newWorkspace)
        }
      },
      { immediate: true }
    )

    // Also watch for initialization
    watch(
      () => isInitialized.value,
      async (initialized) => {
        if (initialized && currentWorkspace.value?.git?.enabled) {
          console.log(
            "[GitSyncManager] Workspace initialized, setting up auto-sync"
          )
          await this.onWorkspaceChanged(currentWorkspace.value)
        }
      },
      { immediate: true }
    )
  }

  private async onWorkspaceChanged(
    workspace: {
      id: string
      path: string
      git?: {
        enabled: boolean
        autoSync?: boolean
        syncInterval?: number
        authMethod?: "none" | "https" | "oauth" | "ssh"
        token?: string
        oauthAccountId?: string
      }
    } | null
  ) {
    // Clear previous interval
    for (const [id, interval] of this.syncIntervals.entries()) {
      clearInterval(interval)
      this.syncIntervals.delete(id)
    }

    // Reset conflict notification flag when workspace changes
    this.notifiedConflicts.clear()

    if (!workspace?.git?.enabled) {
      this.state.value = {
        isSyncing: false,
        lastSyncTime: null,
        lastSyncResult: null,
        status: null,
        error: null,
        showConflictModal: false,
        bannerDismissedForWorkspace: null,
      }
      return
    }

    // Refresh status
    await this.refreshStatus()

    // Start auto-sync if enabled
    if (workspace.git.autoSync !== false) {
      this.startAutoSync(
        workspace.id,
        workspace.path,
        workspace.git.syncInterval || 300
      )
    }
  }

  private getCredentialsForWorkspace(workspace: {
    git?: {
      authMethod?: "none" | "https" | "oauth" | "ssh"
      token?: string
      oauthAccountId?: string
    }
  }): GitCredentials | undefined {
    const authMethod = workspace.git?.authMethod ?? "none"

    if (authMethod === "https" && workspace.git?.token) {
      return {
        type: "https",
        token: workspace.git.token,
      }
    }

    if (authMethod === "oauth" && workspace.git?.oauthAccountId) {
      return {
        type: "oauth",
        oauthAccountId: workspace.git.oauthAccountId,
      }
    }

    return undefined
  }

  private startAutoSync(
    workspaceId: string,
    workspacePath: string,
    intervalSeconds: number
  ) {
    // Check if already running for this workspace
    if (this.syncIntervals.has(workspaceId)) {
      console.log(
        `[GitSyncManager] Auto-sync already running for workspace ${workspaceId}`
      )
      return
    }

    console.log(
      `[GitSyncManager] Starting auto-sync for workspace ${workspaceId} every ${intervalSeconds}s`
    )

    const interval = setInterval(async () => {
      const { currentWorkspace } = useWorkspaceStore()

      // Only sync if still on the same workspace and git is enabled
      if (
        currentWorkspace.value?.id === workspaceId &&
        currentWorkspace.value?.git?.enabled
      ) {
        console.log(
          "[GitSyncManager] Auto-sync triggered at",
          new Date().toISOString()
        )
        await this.sync({ initialStrategy: "ask" })
      } else {
        console.log(
          "[GitSyncManager] Auto-sync skipped - workspace changed or git disabled"
        )
      }
    }, intervalSeconds * 1000)

    this.syncIntervals.set(workspaceId, interval)
    console.log(
      `[GitSyncManager] Auto-sync interval set, next sync in ${intervalSeconds}s`
    )
  }

  /**
   * Refresh Git status for current workspace
   */
  async refreshStatus(): Promise<void> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return
    }

    try {
      // Check if it's a git repo first
      const isGitRepo = await this.gitService.isRepo(
        currentWorkspace.value.path
      )
      if (!isGitRepo) {
        console.log(
          "[GitSyncManager] Not a git repo yet, skipping status refresh"
        )
        this.state.value = {
          ...this.state.value,
          status: null,
          error: null,
        }
        return
      }

      console.log(
        "[GitSyncManager] Refreshing status for",
        currentWorkspace.value.path
      )
      const status = await this.gitService.status(currentWorkspace.value.path)

      // Remove resolved conflicts from notified set
      // This allows re-notification if the same file conflicts again later
      const currentConflicts = new Set(status.conflicted)
      for (const file of this.notifiedConflicts) {
        if (!currentConflicts.has(file)) {
          this.notifiedConflicts.delete(file)
        }
      }

      this.state.value = {
        ...this.state.value,
        status,
        error: null,
      }

      console.log("[GitSyncManager] Status:", status)
    } catch (error) {
      console.error("[GitSyncManager] Failed to get status:", error)
      this.state.value = {
        ...this.state.value,
        error: String(error),
      }
    }
  }

  /**
   * Initialize Git repository for current workspace
   */
  async initRepo(): Promise<boolean> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value) {
      return false
    }

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log("[GitSyncManager] File watchers paused for initRepo")

    try {
      // Acquire write lock to block all file writes during Git init
      syncRelease = await gitSyncLock.acquireWrite()
      console.log("[GitSyncManager] Write lock acquired for initRepo")

      console.log(
        "[GitSyncManager] Initializing repo at",
        currentWorkspace.value.path
      )
      const branch = currentWorkspace.value.git?.branch
      await this.gitService.init(currentWorkspace.value.path, branch)
      await this.refreshStatus()
      return true
    } catch (error) {
      console.error("[GitSyncManager] Failed to init repo:", error)
      this.state.value = {
        ...this.state.value,
        error: String(error),
      }
      return false
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log("[GitSyncManager] Write lock released for initRepo")
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log("[GitSyncManager] File watchers resumed after initRepo")
    }
  }

  /**
   * Check if current workspace is a Git repository
   */
  async isRepo(): Promise<boolean> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value) {
      return false
    }

    try {
      return await this.gitService.isRepo(currentWorkspace.value.path)
    } catch {
      return false
    }
  }

  /**
   * Manual sync operation
   */
  async sync(options?: {
    initialStrategy?: "ask" | "remote" | "local"
  }): Promise<SyncResult> {
    const { currentWorkspace } = useWorkspaceStore()
    const t = getI18n()
    const initialStrategy = options?.initialStrategy ?? "remote"

    if (!currentWorkspace.value?.git?.enabled) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: "Git not enabled for this workspace",
      }
    }

    // Check if Git is available before attempting sync
    const availability = await this.gitService.isAvailable()
    if (!availability.available) {
      const toast = useToast()
      toast.error(t("workspace.git_not_available"))
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: availability.error || t("workspace.git_not_available"),
      }
    }

    if (this.state.value.isSyncing) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: "Sync already in progress",
      }
    }

    this.state.value = {
      ...this.state.value,
      isSyncing: true,
      error: null,
    }

    const credentials = this.getCredentialsForWorkspace(currentWorkspace.value)

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock to prevent the
    // watcher -> load -> save -> watcher cycle from blocking lock acquisition
    isGitSyncInProgress = true
    console.log("[GitSyncManager] File watchers paused for sync")

    try {
      // Acquire write lock to block all file writes during Git sync
      syncRelease = await gitSyncLock.acquireWrite()
      console.log("[GitSyncManager] Write lock acquired for sync")

      const workspacePath = currentWorkspace.value.path
      let pulledFromRemote = false

      // Check if it's a git repo, if not initialize it
      const isGitRepo = await this.gitService.isRepo(workspacePath)
      if (!isGitRepo) {
        console.log("[GitSyncManager] Not a git repo, initializing...")
        const branch = currentWorkspace.value.git.branch
        await this.gitService.init(workspacePath, branch)

        // Set remote if configured and try to sync from it
        if (currentWorkspace.value.git.remote) {
          console.log(
            "[GitSyncManager] Setting up remote:",
            currentWorkspace.value.git.remote
          )
          await this.gitService.setRemote(
            workspacePath,
            "origin",
            currentWorkspace.value.git.remote
          )

          // Fetch from remote to get remote content
          console.log("[GitSyncManager] Fetching from remote...")
          await this.gitService.fetch(workspacePath, credentials)

          // Check if remote branch exists and has content
          const branch = currentWorkspace.value.git.branch || "main"
          const remoteBranchExists = await this.gitService.remoteBranchExists(
            workspacePath,
            branch,
            credentials
          )

          if (remoteBranchExists && initialStrategy === "ask") {
            console.log(
              "[GitSyncManager] Initial sync requires user decision, aborting"
            )
            this.state.value = {
              ...this.state.value,
              isSyncing: false,
              lastSyncResult: null,
              error: "INITIAL_SYNC_REQUIRED",
            }
            return {
              success: false,
              pulled: 0,
              pushed: 0,
              conflicts: [],
              error: "INITIAL_SYNC_REQUIRED",
            }
          }

          if (remoteBranchExists && initialStrategy !== "local") {
            console.log(
              "[GitSyncManager] Remote branch exists, resetting to remote content..."
            )
            await this.gitService.resetToRemoteBranch(
              workspacePath,
              branch,
              credentials
            )

            // Reload collections after pulling remote content
            await this.reloadWorkspaceData()

            pulledFromRemote = true
          } else {
            console.log(
              "[GitSyncManager] Remote branch does not exist yet, will push local content"
            )
          }
        }
      }

      // Check if remote is configured
      const remote = await this.gitService.getRemote(workspacePath, "origin")
      if (!remote && currentWorkspace.value.git.remote) {
        await this.gitService.setRemote(
          workspacePath,
          "origin",
          currentWorkspace.value.git.remote
        )
      }

      // If no remote configured, just commit local changes
      if (!remote && !currentWorkspace.value.git.remote) {
        console.log(
          "[GitSyncManager] No remote configured, committing local changes only"
        )
        const status = await this.gitService.status(workspacePath)

        if (status.modified.length > 0 || status.untracked.length > 0) {
          await this.gitService.addAll(workspacePath)
          await this.gitService.commit(
            workspacePath,
            "Auto-sync: Update collections and environments"
          )
        }

        this.state.value = {
          ...this.state.value,
          isSyncing: false,
          lastSyncTime: new Date(),
          lastSyncResult: {
            success: true,
            pulled: 0,
            pushed: 0,
            conflicts: [],
          },
        }

        await this.refreshStatus()
        return { success: true, pulled: 0, pushed: 0, conflicts: [] }
      }

      console.log("[GitSyncManager] Starting sync for", workspacePath)
      const result = await this.gitService.sync(workspacePath, credentials)
      if (pulledFromRemote && result.pulled === 0) {
        result.pulled = 1
      }

      this.state.value = {
        ...this.state.value,
        isSyncing: false,
        lastSyncTime: new Date(),
        lastSyncResult: result,
      }

      if (result.status) {
        this.state.value = {
          ...this.state.value,
          status: result.status,
          error: null,
        }
      } else {
        await this.refreshStatus()
      }

      const statusConflicts = this.state.value.status?.conflicted ?? []
      if (statusConflicts.length > 0 && result.conflicts.length === 0) {
        result.conflicts = statusConflicts
        this.state.value = {
          ...this.state.value,
          lastSyncResult: result,
        }
      }

      // Show toast notification if conflicts detected
      if (statusConflicts.length > 0) {
        this.showConflictToast(statusConflicts, currentWorkspace.value.name)
      } else if (result.conflicts && result.conflicts.length > 0) {
        this.showConflictToast(result.conflicts, currentWorkspace.value.name)
      }

      // Reload collections if pull was successful and had changes
      if (result.success && result.pulled > 0) {
        console.log("[GitSyncManager] Reloading collections after pull")
        await this.reloadWorkspaceData()
      }

      console.log("[GitSyncManager] Sync completed:", result)

      // Record sync history
      addSyncHistoryEntry({
        operation: "sync",
        result: result.success
          ? "success"
          : result.conflicts.length > 0
            ? "conflicts"
            : "failed",
        pulled: result.pulled,
        pushed: result.pushed,
        conflicts: result.conflicts,
        error: result.error,
        workspaceId: currentWorkspace.value.id,
        workspaceName: currentWorkspace.value.name,
      })
      return result
    } catch (error) {
      console.error("[GitSyncManager] Sync failed:", error)
      const errorResult: SyncResult = {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: String(error),
      }

      this.state.value = {
        ...this.state.value,
        isSyncing: false,
        lastSyncResult: errorResult,
        error: String(error),
      }

      return errorResult
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log("[GitSyncManager] Write lock released for sync")
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log("[GitSyncManager] File watchers resumed after sync")
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(): Promise<SyncResult> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: "Git not enabled for this workspace",
      }
    }

    this.state.value = {
      ...this.state.value,
      isSyncing: true,
      error: null,
    }

    const credentials = this.getCredentialsForWorkspace(currentWorkspace.value)

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log("[GitSyncManager] File watchers paused for pull")

    try {
      // Acquire write lock to block all file writes during Git pull
      syncRelease = await gitSyncLock.acquireWrite()
      console.log("[GitSyncManager] Write lock acquired for pull")

      const result = await this.gitService.pull(
        currentWorkspace.value.path,
        credentials
      )

      this.state.value = {
        ...this.state.value,
        isSyncing: false,
        lastSyncTime: new Date(),
        lastSyncResult: result,
      }

      if (result.status) {
        this.state.value = {
          ...this.state.value,
          status: result.status,
          error: null,
        }
      } else {
        await this.refreshStatus()
      }

      const statusConflicts = this.state.value.status?.conflicted ?? []
      if (statusConflicts.length > 0 && result.conflicts.length === 0) {
        result.conflicts = statusConflicts
        this.state.value = {
          ...this.state.value,
          lastSyncResult: result,
        }
      }

      // Show toast notification if conflicts detected
      if (statusConflicts.length > 0) {
        this.showConflictToast(statusConflicts, currentWorkspace.value.name)
      } else if (result.conflicts && result.conflicts.length > 0) {
        this.showConflictToast(result.conflicts, currentWorkspace.value.name)
      }

      // Reload collections if pull was successful and had changes
      if (result.success && result.pulled > 0) {
        console.log("[GitSyncManager] Reloading collections after pull")
        await this.reloadWorkspaceData()
      }

      // Record pull history
      addSyncHistoryEntry({
        operation: "pull",
        result: result.success
          ? "success"
          : result.conflicts.length > 0
            ? "conflicts"
            : "failed",
        pulled: result.pulled,
        pushed: 0,
        conflicts: result.conflicts,
        error: result.error,
        workspaceId: currentWorkspace.value.id,
        workspaceName: currentWorkspace.value.name,
      })

      return result
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: String(error),
      }

      this.state.value = {
        ...this.state.value,
        isSyncing: false,
        error: String(error),
      }

      // Record failed pull history
      addSyncHistoryEntry({
        operation: "pull",
        result: "failed",
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: String(error),
        workspaceId: currentWorkspace.value.id,
        workspaceName: currentWorkspace.value.name,
      })

      return errorResult
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log("[GitSyncManager] Write lock released for pull")
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log("[GitSyncManager] File watchers resumed after pull")
    }
  }

  /**
   * Push changes to remote
   */
  async push(): Promise<SyncResult> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: "Git not enabled for this workspace",
      }
    }

    this.state.value = {
      ...this.state.value,
      isSyncing: true,
      error: null,
    }

    const credentials = this.getCredentialsForWorkspace(currentWorkspace.value)

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log("[GitSyncManager] File watchers paused for push")

    try {
      // Acquire write lock to block all file writes during Git push
      syncRelease = await gitSyncLock.acquireWrite()
      console.log("[GitSyncManager] Write lock acquired for push")

      const result = await this._pushInternal(
        currentWorkspace.value.path,
        credentials
      )

      // Record push history
      addSyncHistoryEntry({
        operation: "push",
        result: result.success ? "success" : "failed",
        pulled: 0,
        pushed: result.pushed,
        conflicts: [],
        error: result.error,
        workspaceId: currentWorkspace.value.id,
        workspaceName: currentWorkspace.value.name,
      })

      return result
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log("[GitSyncManager] Write lock released for push")
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log("[GitSyncManager] File watchers resumed after push")
    }
  }

  /**
   * Internal push implementation (caller must hold write lock)
   */
  private async _pushInternal(
    workspacePath: string,
    credentials?: GitCredentials
  ): Promise<SyncResult> {
    try {
      const result = await this.gitService.push(workspacePath, credentials)

      this.state.value = {
        ...this.state.value,
        isSyncing: false,
        lastSyncTime: new Date(),
        lastSyncResult: result,
      }

      if (result.status) {
        this.state.value = {
          ...this.state.value,
          status: result.status,
          error: null,
        }
      } else {
        await this.refreshStatus()
      }
      return result
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: String(error),
      }

      this.state.value = {
        ...this.state.value,
        isSyncing: false,
        error: String(error),
      }

      return errorResult
    }
  }

  /**
   * Commit local changes
   */
  async commit(message: string): Promise<string | null> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return null
    }

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log("[GitSyncManager] File watchers paused for commit")

    try {
      // Acquire write lock to block all file writes during Git commit
      syncRelease = await gitSyncLock.acquireWrite()
      console.log("[GitSyncManager] Write lock acquired for commit")

      // Stage all changes
      await this.gitService.addAll(currentWorkspace.value.path)

      // Commit
      const hash = await this.gitService.commit(
        currentWorkspace.value.path,
        message
      )

      await this.refreshStatus()
      return hash
    } catch (error) {
      console.error("[GitSyncManager] Commit failed:", error)
      this.state.value = {
        ...this.state.value,
        error: String(error),
      }
      return null
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log("[GitSyncManager] Write lock released for commit")
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log("[GitSyncManager] File watchers resumed after commit")
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    file: string,
    resolution: "ours" | "theirs"
  ): Promise<boolean> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return false
    }

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log("[GitSyncManager] File watchers paused for resolveConflict")

    try {
      // Acquire write lock to block all file writes during conflict resolution
      syncRelease = await gitSyncLock.acquireWrite()
      console.log("[GitSyncManager] Write lock acquired for resolveConflict")

      await this.gitService.resolveConflict(
        currentWorkspace.value.path,
        file,
        resolution
      )
      await this.refreshStatus()
      return true
    } catch (error) {
      console.error("[GitSyncManager] Failed to resolve conflict:", error)
      this.state.value = {
        ...this.state.value,
        error: String(error),
      }
      return false
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log("[GitSyncManager] Write lock released for resolveConflict")
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log(
        "[GitSyncManager] File watchers resumed after resolveConflict"
      )
    }
  }

  /**
   * Resolve a conflict by writing merged content
   */
  async resolveConflictWithContent(
    file: string,
    content: string
  ): Promise<boolean> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return false
    }

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log(
      "[GitSyncManager] File watchers paused for resolveConflictWithContent"
    )

    try {
      // Acquire write lock to block all file writes during conflict resolution
      syncRelease = await gitSyncLock.acquireWrite()
      console.log(
        "[GitSyncManager] Write lock acquired for resolveConflictWithContent"
      )

      await this.gitService.resolveConflictWithContent(
        currentWorkspace.value.path,
        file,
        content
      )
      await this.refreshStatus()
      return true
    } catch (error) {
      console.error("[GitSyncManager] Failed to resolve conflict:", error)
      this.state.value = {
        ...this.state.value,
        error: String(error),
      }
      return false
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log(
          "[GitSyncManager] Write lock released for resolveConflictWithContent"
        )
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log(
        "[GitSyncManager] File watchers resumed after resolveConflictWithContent"
      )
    }
  }

  /**
   * Resolve a conflict and automatically handle modal/rebase continuation
   */
  async resolveConflictAndContinue(
    file: string,
    resolution: "ours" | "theirs"
  ): Promise<boolean> {
    const success = await this.resolveConflict(file, resolution)

    // If no more conflicts, close modal and continue rebase
    if (!this.hasConflicts.value) {
      this.state.value = {
        ...this.state.value,
        showConflictModal: false,
      }

      if (success) {
        await this.continueRebaseAfterConflictResolution()
      }
    }

    return success
  }

  /**
   * Resolve a conflict with merged content and automatically handle modal/rebase continuation
   */
  async resolveConflictWithContentAndContinue(
    file: string,
    content: string
  ): Promise<boolean> {
    const success = await this.resolveConflictWithContent(file, content)

    // If no more conflicts, close modal and continue rebase
    if (!this.hasConflicts.value) {
      this.state.value = {
        ...this.state.value,
        showConflictModal: false,
      }

      if (success) {
        await this.continueRebaseAfterConflictResolution()
      }
    }

    return success
  }

  /**
   * Set remote URL
   */
  async setRemote(url: string): Promise<boolean> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value) {
      return false
    }

    try {
      await this.gitService.setRemote(
        currentWorkspace.value.path,
        "origin",
        url
      )
      return true
    } catch (error) {
      console.error("[GitSyncManager] Failed to set remote:", error)
      this.state.value = {
        ...this.state.value,
        error: String(error),
      }
      return false
    }
  }

  /**
   * Reload workspace data (collections and environments) after git sync
   */
  private async reloadWorkspaceData(): Promise<void> {
    try {
      console.log("[GitSyncManager] Reloading workspace data...")
      await Promise.all([
        this.workspaceCollectionsService.forceReload(),
        this.workspaceEnvironmentsService.forceReload(),
      ])
      console.log("[GitSyncManager] Workspace data reloaded successfully")
    } catch (error) {
      console.error("[GitSyncManager] Failed to reload workspace data:", error)
    }
  }

  /**
   * Continue rebase after all conflicts are resolved
   */
  async continueRebaseAfterConflictResolution(): Promise<SyncResult> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: "Git not enabled for this workspace",
      }
    }

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log(
      "[GitSyncManager] File watchers paused for continueRebaseAfterConflictResolution"
    )

    try {
      // Acquire write lock to block all file writes during rebase continuation
      syncRelease = await gitSyncLock.acquireWrite()
      console.log(
        "[GitSyncManager] Write lock acquired for continueRebaseAfterConflictResolution"
      )

      console.log(
        "[GitSyncManager] Continuing rebase after conflict resolution"
      )

      // Continue the rebase
      await this.gitService.continueRebase(currentWorkspace.value.path)

      // Refresh status
      await this.refreshStatus()

      // Reload workspace data
      await this.reloadWorkspaceData()

      // Now push the changes (use internal method since we already hold the lock)
      const credentials = this.getCredentialsForWorkspace(
        currentWorkspace.value
      )
      const pushResult = await this._pushInternal(
        currentWorkspace.value.path,
        credentials
      )

      return pushResult
    } catch (error) {
      console.error("[GitSyncManager] Failed to continue rebase:", error)
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: String(error),
      }
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log(
          "[GitSyncManager] Write lock released for continueRebaseAfterConflictResolution"
        )
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log(
        "[GitSyncManager] File watchers resumed after continueRebaseAfterConflictResolution"
      )
    }
  }

  /**
   * Abort current rebase and reset to clean state
   */
  async abortRebase(): Promise<boolean> {
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace.value?.git?.enabled) {
      return false
    }

    // Track acquired lock to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null

    // Pause file watchers before acquiring write lock
    isGitSyncInProgress = true
    console.log("[GitSyncManager] File watchers paused for abortRebase")

    try {
      // Acquire write lock to block all file writes during rebase abort
      syncRelease = await gitSyncLock.acquireWrite()
      console.log("[GitSyncManager] Write lock acquired for abortRebase")

      console.log("[GitSyncManager] Aborting rebase")
      await this.gitService.abortRebase(currentWorkspace.value.path)
      await this.refreshStatus()
      await this.reloadWorkspaceData()
      return true
    } catch (error) {
      console.error("[GitSyncManager] Failed to abort rebase:", error)
      this.state.value = {
        ...this.state.value,
        error: String(error),
      }
      return false
    } finally {
      // Only release lock if it was successfully acquired
      if (syncRelease) {
        syncRelease()
        console.log("[GitSyncManager] Write lock released for abortRebase")
      }
      // Always resume file watchers
      isGitSyncInProgress = false
      console.log("[GitSyncManager] File watchers resumed after abortRebase")
    }
  }
}
