import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"

const emptyStatus = {
  branch: "main",
  ahead: 0,
  behind: 0,
  staged: [],
  modified: [],
  untracked: [],
  conflicted: [],
}

type Workspace = {
  id: string
  name: string
  path: string
  git?: {
    enabled: boolean
    autoSync?: boolean
    syncInterval?: number
    authMethod?: "none" | "https" | "oauth" | "ssh"
    token?: string
    oauthAccountId?: string
    remote?: string
    branch?: string
  }
}

async function setupSyncTest(workspace: Workspace) {
  const currentWorkspace = ref<Workspace | null>(workspace)
  const isInitialized = ref(true)
  const toastError = vi.fn()
  const addSyncHistoryEntry = vi.fn()
  const releaseWrite = vi.fn()

  const gitService = {
    isAvailable: vi.fn(async () => ({ available: true })),
    isRepo: vi.fn(async () => true),
    init: vi.fn(async () => {}),
    setRemote: vi.fn(async () => {}),
    fetch: vi.fn(async () => {}),
    remoteBranchExists: vi.fn(async () => false),
    resetToRemoteBranch: vi.fn(async () => {}),
    getRemote: vi.fn(async () => "origin"),
    status: vi.fn(async () => emptyStatus),
    sync: vi.fn(async () => ({
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: [],
    })),
    pull: vi.fn(async () => ({
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: [],
    })),
    push: vi.fn(async () => ({
      success: true,
      pulled: 0,
      pushed: 1,
      conflicts: [],
    })),
    addAll: vi.fn(async () => {}),
    commit: vi.fn(async () => "hash"),
  }

  vi.doMock("~/store/workspace", () => ({
    useWorkspaceStore: () => ({ currentWorkspace, isInitialized }),
  }))

  vi.doMock("~/services/workspace-storage/async-lock", () => ({
    gitSyncLock: {
      acquireWrite: vi.fn(async () => releaseWrite),
    },
  }))

  vi.doMock("~/services/git/history-store", () => ({
    addSyncHistoryEntry,
  }))

  vi.doMock("~/composables/toast", () => ({
    useToast: () => ({ error: toastError }),
  }))

  vi.doMock("~/modules/i18n", () => ({
    getI18n: () => (key: string) => key,
  }))

  const module = await import("~/services/git/sync-manager")
  const lockModule = await import("~/services/workspace-storage/async-lock")

  const manager = {
    state: ref({
      isSyncing: false,
      lastSyncTime: null,
      lastSyncResult: null,
      status: null,
      error: null,
      showConflictModal: false,
      bannerDismissedForWorkspace: null,
    }),
    gitService,
    notifiedConflicts: new Set<string>(),
    syncIntervals: new Map<string, ReturnType<typeof setInterval>>(),
    refreshStatus: vi.fn(async () => {}),
    reloadWorkspaceData: vi.fn(async () => {}),
    showConflictToast: vi.fn(),
    getCredentialsForWorkspace:
      module.GitSyncManager.prototype.getCredentialsForWorkspace,
    _pushInternal: module.GitSyncManager.prototype._pushInternal,
  }

  return {
    module,
    lockModule,
    manager,
    gitService,
    toastError,
    addSyncHistoryEntry,
    currentWorkspace,
    releaseWrite,
  }
}

describe("GitSyncManager (P0)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("sync returns Git not enabled when current workspace git.enabled is false", async () => {
    const { module, manager } = await setupSyncTest({
      id: "ws-1",
      name: "ws",
      path: "/tmp/ws",
      git: { enabled: false },
    })

    const result = await module.GitSyncManager.prototype.sync.call(manager)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Git not enabled for this workspace")
  })

  it("sync returns INITIAL_SYNC_REQUIRED when remote exists and initialStrategy=ask", async () => {
    const { module, manager, gitService, releaseWrite, lockModule } =
      await setupSyncTest({
        id: "ws-1",
        name: "ws",
        path: "/tmp/ws",
        git: {
          enabled: true,
          remote: "https://example.com/repo.git",
          branch: "main",
        },
      })

    gitService.isRepo.mockResolvedValue(false)
    gitService.remoteBranchExists.mockResolvedValue(true)

    const result = await module.GitSyncManager.prototype.sync.call(manager, {
      initialStrategy: "ask",
    })

    expect(result.error).toBe("INITIAL_SYNC_REQUIRED")
    expect(manager.state.value.isSyncing).toBe(false)
    expect(gitService.resetToRemoteBranch).not.toHaveBeenCalled()
    expect(lockModule.gitSyncLock.acquireWrite).toHaveBeenCalledTimes(1)
    expect(releaseWrite).toHaveBeenCalledTimes(1)
  })

  it("sync with initialStrategy=local skips resetToRemoteBranch", async () => {
    const { module, manager, gitService } = await setupSyncTest({
      id: "ws-1",
      name: "ws",
      path: "/tmp/ws",
      git: {
        enabled: true,
        remote: "https://example.com/repo.git",
        branch: "main",
      },
    })

    gitService.isRepo.mockResolvedValue(false)
    gitService.remoteBranchExists.mockResolvedValue(true)

    const result = await module.GitSyncManager.prototype.sync.call(manager, {
      initialStrategy: "local",
    })

    expect(result.success).toBe(true)
    expect(gitService.resetToRemoteBranch).not.toHaveBeenCalled()
  })

  it("sync with initialStrategy=remote performs resetToRemoteBranch", async () => {
    const { module, manager, gitService } = await setupSyncTest({
      id: "ws-1",
      name: "ws",
      path: "/tmp/ws",
      git: {
        enabled: true,
        remote: "https://example.com/repo.git",
        branch: "main",
      },
    })

    gitService.isRepo.mockResolvedValue(false)
    gitService.remoteBranchExists.mockResolvedValue(true)

    const result = await module.GitSyncManager.prototype.sync.call(manager, {
      initialStrategy: "remote",
    })

    expect(result.success).toBe(true)
    expect(gitService.resetToRemoteBranch).toHaveBeenCalledTimes(1)
    expect(manager.reloadWorkspaceData).toHaveBeenCalledTimes(2)
  })

  it("sync always resets isSyncing and releases write lock in finally", async () => {
    const { module, manager, gitService, releaseWrite } = await setupSyncTest({
      id: "ws-1",
      name: "ws",
      path: "/tmp/ws",
      git: { enabled: true },
    })

    gitService.isRepo.mockResolvedValue(true)
    gitService.getRemote.mockResolvedValue("origin")
    gitService.sync.mockRejectedValue(new Error("boom"))

    const result = await module.GitSyncManager.prototype.sync.call(manager)

    expect(result.success).toBe(false)
    expect(manager.state.value.isSyncing).toBe(false)
    expect(releaseWrite).toHaveBeenCalledTimes(1)
  })

  it("pull reloads workspace data when pulled > 0", async () => {
    const { module, manager, gitService, addSyncHistoryEntry, releaseWrite } =
      await setupSyncTest({
        id: "ws-1",
        name: "ws",
        path: "/tmp/ws",
        git: { enabled: true },
      })

    gitService.pull.mockResolvedValue({
      success: true,
      pulled: 2,
      pushed: 0,
      conflicts: [],
      status: emptyStatus,
    })

    const result = await module.GitSyncManager.prototype.pull.call(manager)

    expect(result.success).toBe(true)
    expect(manager.reloadWorkspaceData).toHaveBeenCalledTimes(1)
    expect(addSyncHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "pull", result: "success" })
    )
    expect(releaseWrite).toHaveBeenCalledTimes(1)
  })

  it("push records history and updates status", async () => {
    const { module, manager, gitService, addSyncHistoryEntry, releaseWrite } =
      await setupSyncTest({
        id: "ws-1",
        name: "ws",
        path: "/tmp/ws",
        git: { enabled: true },
      })

    gitService.push.mockResolvedValue({
      success: true,
      pulled: 0,
      pushed: 3,
      conflicts: [],
      status: emptyStatus,
    })

    const result = await module.GitSyncManager.prototype.push.call(manager)

    expect(result.success).toBe(true)
    expect(manager.state.value.status).toEqual(emptyStatus)
    expect(addSyncHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "push", pushed: 3 })
    )
    expect(releaseWrite).toHaveBeenCalledTimes(1)
  })

  it("conflicts trigger one toast for new conflicts only", async () => {
    const { module, manager, toastError } = await setupSyncTest({
      id: "ws-1",
      name: "ws",
      path: "/tmp/ws",
      git: { enabled: true },
    })

    manager.showConflictToast =
      module.GitSyncManager.prototype.showConflictToast

    module.GitSyncManager.prototype.showConflictToast.call(
      manager,
      ["a", "b"],
      "ws"
    )
    module.GitSyncManager.prototype.showConflictToast.call(
      manager,
      ["a", "b"],
      "ws"
    )
    module.GitSyncManager.prototype.showConflictToast.call(
      manager,
      ["b", "c"],
      "ws"
    )

    expect(toastError).toHaveBeenCalledTimes(2)
  })
})
