import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { shallowMount } from "@vue/test-utils"

async function setup() {
  const deleteWorkspace = vi.fn(async () => {})
  const toast = { success: vi.fn(), error: vi.fn() }

  const workspaces = ref([
    { id: "ws-1", name: "Workspace 1", path: "/tmp/ws-1", version: 1 },
  ])
  const currentWorkspace = ref(workspaces.value[0])

  vi.doMock("~/store/workspace", () => ({
    useWorkspaceStore: () => ({
      workspaces,
      currentWorkspace,
      deleteWorkspace,
    }),
  }))

  vi.doMock("~/composables/toast", () => ({
    useToast: () => toast,
  }))

  vi.doMock("@composables/i18n", () => ({
    useI18n: () => (key: string) => key,
  }))

  vi.doMock("../WorkspaceEditModal.vue", () => ({
    default: {
      name: "WorkspaceEditModal",
      template: "<div />",
    },
  }))

  const component = (await import("../WorkspaceManageModal.vue")).default

  const wrapper = shallowMount(component, {
    global: {
      stubs: {
        AukSmartModal: {
          template: '<div><slot name="body" /><slot name="footer" /></div>',
        },
        AukButtonSecondary: true,
        AukSmartConfirmModal: { template: '<div><slot name="body" /></div>' },
        WorkspaceEditModal: true,
      },
      directives: {
        tippy: () => {},
      },
    },
  })

  return { wrapper, deleteWorkspace, toast, workspaces }
}

describe("WorkspaceManageModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("deletes selected workspace and shows success toast", async () => {
    const { wrapper, deleteWorkspace, toast, workspaces } = await setup()

    ;(wrapper.vm as any).confirmDelete(workspaces.value[0])
    await (wrapper.vm as any).handleDelete()

    expect(deleteWorkspace).toHaveBeenCalledWith("ws-1")
    expect(toast.success).toHaveBeenCalledWith("workspace.deleted")
    expect((wrapper.vm as any).deletingWorkspace).toBeNull()
  })

  it("shows error toast when delete fails", async () => {
    const { wrapper, deleteWorkspace, toast, workspaces } = await setup()

    deleteWorkspace.mockRejectedValueOnce(new Error("delete failed"))
    ;(wrapper.vm as any).confirmDelete(workspaces.value[0])
    await (wrapper.vm as any).handleDelete()

    expect(toast.error).toHaveBeenCalledWith("delete failed")
    expect((wrapper.vm as any).deletingWorkspace).toBeNull()
  })
})
