import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { shallowMount } from "@vue/test-utils"

async function setup() {
  const createWorkspace = vi.fn(async () => {})
  const workspaces = ref([
    { id: "ws-1", name: "Existing", path: "/tmp/existing", version: 1 },
  ])
  const toast = { success: vi.fn(), error: vi.fn() }
  const gitService = {
    isAvailable: vi.fn(async () => ({ available: true, version: "2.0.0" })),
    isRepo: vi.fn(async () => true),
    getRemote: vi.fn(async () => "git@github.com:auk/repo.git"),
    getCurrentBranch: vi.fn(async () => "main"),
    testRemote: vi.fn(async () => ({ success: true })),
    clone: vi.fn(async () => {}),
  }

  const fs = {
    dirExists: vi.fn(async () => false),
    readDir: vi.fn(async () => []),
    joinPath: vi.fn((...parts: string[]) => parts.join("/")),
  }

  vi.doMock("~/store/workspace", () => ({
    useWorkspaceStore: () => ({ createWorkspace, workspaces }),
  }))

  vi.doMock("~/composables/toast", () => ({
    useToast: () => toast,
  }))

  vi.doMock("~/services/workspace-storage/filesystem", () => ({
    getFileSystem: () => fs,
  }))

  vi.doMock("~/platform/capabilities", () => ({
    selectDirectory: vi.fn(async () => "/tmp/selected"),
  }))

  vi.doMock("~/services/git", () => ({
    getGitService: () => gitService,
  }))

  vi.doMock("@composables/i18n", () => ({
    useI18n: () => (key: string) => key,
  }))

  const component = (await import("../WorkspaceCreateModal.vue")).default

  const wrapper = shallowMount(component, {
    global: {
      stubs: {
        AukSmartModal: {
          template: '<div><slot name="body" /><slot name="footer" /></div>',
        },
        AukSmartInput: true,
        AukButtonPrimary: true,
        AukButtonSecondary: true,
      },
    },
  })

  return { wrapper, createWorkspace, toast, gitService }
}

describe("WorkspaceCreateModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("emits close when back on step 1", async () => {
    const { wrapper } = await setup()

    ;(wrapper.vm as any).currentStep = 1
    ;(wrapper.vm as any).handleBack()

    expect(wrapper.emitted("close")).toBeTruthy()
  })

  it("blocks step advance when path is already taken", async () => {
    const { wrapper } = await setup()

    ;(wrapper.vm as any).currentStep = 2
    ;(wrapper.vm as any).workspaceName = "New Workspace"
    ;(wrapper.vm as any).workspacePath = "/tmp/existing///"

    await (wrapper.vm as any).handleNext()

    expect((wrapper.vm as any).currentStep).toBe(2)
  })

  it("creates git workspace with git options and emits created", async () => {
    const { wrapper, createWorkspace, toast } = await setup()

    ;(wrapper.vm as any).currentStep = 3
    ;(wrapper.vm as any).workspaceName = "Remote WS"
    ;(wrapper.vm as any).workspacePath = "/tmp/remote"
    ;(wrapper.vm as any).workspaceDescription = "desc"
    ;(wrapper.vm as any).selectedSource = "git"
    ;(wrapper.vm as any).gitProjectMode = "local"

    await (wrapper.vm as any).handleNext()

    expect(createWorkspace).toHaveBeenCalledWith("Remote WS", "/tmp/remote", {
      description: "desc",
      git: {
        enabled: true,
        remote: undefined,
        branch: "main",
        autoSync: true,
        syncInterval: 300,
        authMethod: "none",
      },
    })
    expect(wrapper.emitted("created")?.[0]).toEqual([{ openSyncCenter: true }])
    expect(toast.success).toHaveBeenCalledWith("workspace.created_sync_hint")
  })

  it("shows path_in_use error for duplicate workspace path create failure", async () => {
    const { wrapper, createWorkspace } = await setup()

    createWorkspace.mockRejectedValueOnce(new Error("WORKSPACE_PATH_IN_USE"))
    ;(wrapper.vm as any).currentStep = 3
    ;(wrapper.vm as any).workspaceName = "Duplicate"
    ;(wrapper.vm as any).workspacePath = "/tmp/existing"

    await (wrapper.vm as any).handleNext()

    expect((wrapper.vm as any).errorMessage).toBe("workspace.path_in_use")
  })

  it("clones remote repo before creating clone-mode git workspace", async () => {
    const { wrapper, createWorkspace, gitService } = await setup()

    gitService.getRemote.mockResolvedValueOnce("git@github.com:auk/clone.git")
    gitService.getCurrentBranch.mockResolvedValueOnce("develop")
    ;(wrapper.vm as any).currentStep = 3
    ;(wrapper.vm as any).workspaceName = "Clone WS"
    ;(wrapper.vm as any).workspacePath = "/tmp/clone"
    ;(wrapper.vm as any).selectedSource = "git"
    ;(wrapper.vm as any).gitProjectMode = "clone"
    ;(wrapper.vm as any).gitCloneRemote = "git@github.com:auk/clone.git"

    await (wrapper.vm as any).handleNext()

    expect(gitService.clone).toHaveBeenCalledWith(
      "git@github.com:auk/clone.git",
      "/tmp/clone"
    )
    expect(createWorkspace).toHaveBeenCalledWith("Clone WS", "/tmp/clone", {
      description: undefined,
      git: {
        enabled: true,
        remote: "git@github.com:auk/clone.git",
        branch: "develop",
        autoSync: true,
        syncInterval: 300,
        authMethod: "ssh",
      },
    })
    expect(wrapper.emitted("created")?.[0]).toEqual([{ openSyncCenter: true }])
  })

  it("tests clone remote connectivity", async () => {
    const { wrapper, gitService } = await setup()

    gitService.testRemote.mockResolvedValueOnce({ success: true })
    ;(wrapper.vm as any).gitCloneRemote = "git@github.com:auk/clone.git"

    await (wrapper.vm as any).handleTestCloneRemote()

    expect(gitService.testRemote).toHaveBeenCalledWith(
      "git@github.com:auk/clone.git"
    )
    expect((wrapper.vm as any).testCloneRemoteResult).toEqual({ success: true })
  })
})
