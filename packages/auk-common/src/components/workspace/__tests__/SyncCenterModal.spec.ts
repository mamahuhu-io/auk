import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { shallowMount } from "@vue/test-utils"

async function setup(overrides?: { hasConflicts?: boolean; show?: boolean }) {
  const refreshStatus = vi.fn(async () => {})
  const loadDiff = vi.fn(async () => {})
  const clearDiff = vi.fn()

  const fs = {
    fileExists: vi.fn(async () => true),
    readFile: vi.fn(async () => "# Secrets\n*.secret.json\n"),
  }

  vi.doMock("~/store/workspace", () => ({
    useWorkspaceStore: () => ({
      currentWorkspace: ref({
        id: "ws-1",
        path: "/tmp/ws-1",
        name: "Workspace 1",
      }),
    }),
  }))

  vi.doMock("~/composables/useGitStatus", () => ({
    useGitStatus: () => ({
      isGitEnabled: ref(true),
      isSyncing: ref(false),
      hasConflicts: ref(!!overrides?.hasConflicts),
      changesCount: ref(2),
      conflictsCount: ref(overrides?.hasConflicts ? 1 : 0),
      lastSyncTime: ref(new Date("2026-02-01T00:00:00.000Z")),
      lastSyncResult: ref({
        success: true,
        pulled: 0,
        pushed: 0,
        conflicts: [],
      }),
      error: ref(null),
      gitSyncManager: {
        refreshStatus,
      },
    }),
  }))

  vi.doMock("~/composables/useGitOAuth", () => ({
    useGitOAuth: () => ({
      accounts: ref([]),
      isExpired: vi.fn(() => false),
      isHydrated: ref(true),
    }),
  }))

  vi.doMock("~/composables/useGitDiff", () => ({
    useGitDiff: () => ({
      isLoading: ref(false),
      filesChanged: ref(1),
      totalAdditions: ref(3),
      totalDeletions: ref(1),
      loadDiff,
      clearDiff,
    }),
  }))

  vi.doMock("~/services/workspace-storage/filesystem", () => ({
    getFileSystem: () => fs,
  }))

  vi.doMock("~/platform/capabilities", () => ({
    joinPath: vi.fn(async (...parts: string[]) => parts.join("/")),
  }))

  vi.doMock("~/composables/i18n", () => ({
    useI18n: () => (key: string) => key,
  }))

  const component = (await import("../SyncCenterModal.vue")).default

  const wrapper = shallowMount(component, {
    props: { show: overrides?.show ?? false },
    global: {
      stubs: {
        AukSmartModal: {
          template: '<div><slot name="body" /><slot name="footer" /></div>',
        },
        AukButtonPrimary: true,
        AukButtonSecondary: true,
        GitDiffModal: true,
      },
      directives: {
        tippy: () => {},
      },
    },
  })

  return { wrapper, refreshStatus, loadDiff, clearDiff, fs }
}

describe("SyncCenterModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("loads status/diff/gitignore when modal opens", async () => {
    const { wrapper, refreshStatus, loadDiff, fs } = await setup({
      show: false,
    })

    await wrapper.setProps({ show: true })

    expect(refreshStatus).toHaveBeenCalledTimes(1)
    expect(loadDiff).toHaveBeenCalledTimes(1)
    expect(fs.fileExists).toHaveBeenCalledWith("/tmp/ws-1/.gitignore")
  })

  it("clears diff when modal closes", async () => {
    const { wrapper, clearDiff } = await setup({ show: true })

    await wrapper.setProps({ show: false })

    expect(clearDiff).toHaveBeenCalledTimes(1)
  })

  it("emits primary-action with computed status", async () => {
    const { wrapper } = await setup({ hasConflicts: true, show: true })

    await (wrapper.vm as any).handlePrimaryAction()

    expect(wrapper.emitted("primary-action")?.[0]).toEqual(["conflicts"])
  })

  it("opens changes modal", async () => {
    const { wrapper } = await setup({ show: true })

    expect((wrapper.vm as any).showChangesModal).toBe(false)
    ;(wrapper.vm as any).openChangesModal()

    expect((wrapper.vm as any).showChangesModal).toBe(true)
  })
})
