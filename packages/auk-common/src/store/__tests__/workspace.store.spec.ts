import { beforeEach, describe, expect, it, vi } from "vitest"

const baseWorkspace = {
  version: 1,
  id: "ws-1",
  name: "Workspace 1",
  path: "/tmp/ws-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

async function setupStoreTest(options?: {
  workspaceList?: {
    version: 1
    currentWorkspaceId?: string
    workspaces: Array<typeof baseWorkspace>
  }
  createWorkspaceResult?: typeof baseWorkspace
}) {
  const storage = {
    getWorkspaceList: vi.fn(
      async () =>
        options?.workspaceList ?? {
          version: 1 as const,
          currentWorkspaceId: undefined,
          workspaces: [],
        }
    ),
    createWorkspace: vi.fn(
      async () => options?.createWorkspaceResult ?? baseWorkspace
    ),
    setCurrentWorkspace: vi.fn(async () => {}),
    saveWorkspaceList: vi.fn(async () => {}),
    deleteWorkspace: vi.fn(async () => {}),
  }

  vi.doMock("~/services/workspace-storage", () => ({
    getWorkspaceStorageService: () => storage,
  }))

  vi.doMock("~/platform/capabilities", () => ({
    getAppDataDirectory: vi.fn(async () => "/appdata"),
    isDesktopPlatform: vi.fn(() => false),
    joinPath: vi.fn(async (...parts: string[]) => parts.join("/")),
  }))

  const workspaceModule = await import("~/store/workspace")

  return { workspaceModule, storage }
}

describe("workspace store (P0)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("initializeWorkspaceStore creates default workspace for empty storage", async () => {
    const defaultWorkspace = {
      ...baseWorkspace,
      id: "default-id",
      name: "Default Workspace",
      path: "/auk/default",
    }

    const { workspaceModule, storage } = await setupStoreTest({
      workspaceList: {
        version: 1,
        currentWorkspaceId: undefined,
        workspaces: [],
      },
      createWorkspaceResult: defaultWorkspace,
    })

    await workspaceModule.initializeWorkspaceStore()

    expect(storage.createWorkspace).toHaveBeenCalledWith(
      "Default Workspace",
      "/auk/default",
      expect.objectContaining({
        description: "Your default workspace for API collections",
      })
    )

    const { workspaces, currentWorkspaceId } =
      workspaceModule.useWorkspaceStore()
    expect(workspaces.value).toEqual([defaultWorkspace])
    expect(currentWorkspaceId.value).toBe("default-id")
  })

  it("createWorkspace throws WORKSPACE_PATH_IN_USE when normalized path conflicts", async () => {
    const existing = { ...baseWorkspace, path: "/tmp/existing" }

    const { workspaceModule, storage } = await setupStoreTest({
      workspaceList: {
        version: 1,
        currentWorkspaceId: existing.id,
        workspaces: [existing],
      },
    })

    await workspaceModule.initializeWorkspaceStore()

    await expect(
      workspaceModule.createWorkspace("New Workspace", "/tmp/existing///")
    ).rejects.toThrow("WORKSPACE_PATH_IN_USE")

    expect(storage.createWorkspace).not.toHaveBeenCalled()
  })

  it("createWorkspace switches to newly created workspace", async () => {
    const existing = { ...baseWorkspace }
    const created = {
      ...baseWorkspace,
      id: "ws-2",
      name: "Workspace 2",
      path: "/tmp/ws-2",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    }

    const workspaceListAfterCreate = {
      version: 1 as const,
      currentWorkspaceId: existing.id,
      workspaces: [existing, created],
    }

    const { workspaceModule, storage } = await setupStoreTest({
      workspaceList: {
        version: 1,
        currentWorkspaceId: existing.id,
        workspaces: [existing],
      },
      createWorkspaceResult: created,
    })

    storage.getWorkspaceList
      .mockResolvedValueOnce({
        version: 1,
        currentWorkspaceId: existing.id,
        workspaces: [existing],
      })
      .mockResolvedValueOnce(workspaceListAfterCreate)

    await workspaceModule.initializeWorkspaceStore()
    await workspaceModule.createWorkspace(created.name, created.path)

    expect(storage.setCurrentWorkspace).toHaveBeenCalledWith("ws-2")
    expect(workspaceModule.useWorkspaceStore().currentWorkspaceId.value).toBe(
      "ws-2"
    )
  })

  it("switchWorkspace throws when workspace id does not exist", async () => {
    const existing = { ...baseWorkspace }

    const { workspaceModule } = await setupStoreTest({
      workspaceList: {
        version: 1,
        currentWorkspaceId: existing.id,
        workspaces: [existing],
      },
    })

    await workspaceModule.initializeWorkspaceStore()

    await expect(workspaceModule.switchWorkspace("missing-id")).rejects.toThrow(
      "Workspace not found: missing-id"
    )
  })

  it("updateWorkspace persists changes and bumps updatedAt", async () => {
    const existing = { ...baseWorkspace }

    const { workspaceModule, storage } = await setupStoreTest({
      workspaceList: {
        version: 1,
        currentWorkspaceId: existing.id,
        workspaces: [existing],
      },
    })

    await workspaceModule.initializeWorkspaceStore()
    await workspaceModule.updateWorkspace(existing.id, {
      name: "Workspace Updated",
    })

    expect(storage.saveWorkspaceList).toHaveBeenCalledTimes(1)
    const savedList = storage.saveWorkspaceList.mock.calls[0][0]

    expect(savedList.workspaces[0].name).toBe("Workspace Updated")
    expect(
      new Date(savedList.workspaces[0].updatedAt).getTime()
    ).toBeGreaterThan(new Date(existing.updatedAt).getTime())
  })

  it("deleteWorkspace prevents deleting the last workspace", async () => {
    const existing = { ...baseWorkspace }

    const { workspaceModule, storage } = await setupStoreTest({
      workspaceList: {
        version: 1,
        currentWorkspaceId: existing.id,
        workspaces: [existing],
      },
    })

    await workspaceModule.initializeWorkspaceStore()

    await expect(workspaceModule.deleteWorkspace(existing.id)).rejects.toThrow(
      "Cannot delete the last workspace"
    )

    expect(storage.deleteWorkspace).not.toHaveBeenCalled()
  })
})
