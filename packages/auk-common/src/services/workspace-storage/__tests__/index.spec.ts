import { beforeEach, describe, expect, it, vi } from "vitest"
import * as E from "fp-ts/Either"
import type { FileSystemOps } from "../types"

function createFsMock(overrides?: Partial<FileSystemOps>) {
  const base: FileSystemOps = {
    readFile: vi.fn(async () => ""),
    writeFile: vi.fn(async () => {}),
    writeFileAtomic: vi.fn(async () => {}),
    deleteFile: vi.fn(async () => {}),
    fileExists: vi.fn(async () => true),
    rename: vi.fn(async () => {}),
    watch: vi.fn(async () => () => {}),
    readDir: vi.fn(async () => []),
    createDir: vi.fn(async () => {}),
    deleteDir: vi.fn(async () => {}),
    dirExists: vi.fn(async () => true),
    joinPath: vi.fn((...parts: string[]) => parts.join("/")),
    getBaseName: vi.fn((path: string) => path.split("/").pop() ?? ""),
    getDirName: vi.fn((path: string) => path.split("/").slice(0, -1).join("/")),
  }

  return {
    ...base,
    ...overrides,
  }
}

const baseWorkspace = {
  version: 1 as const,
  id: "ws-1",
  name: "Workspace 1",
  path: "/tmp/ws-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

async function setupWorkspaceStorageTest(args?: {
  storeGetResult?: E.Either<unknown, unknown>
  storeSetResult?: E.Either<unknown, void>
  fs?: FileSystemOps
}) {
  const Store = {
    init: vi.fn(async () => E.right(undefined)),
    get: vi.fn(async () => args?.storeGetResult ?? E.right(undefined)),
    set: vi.fn(async () => args?.storeSetResult ?? E.right(undefined)),
  }

  vi.doMock("~/kernel/store", () => ({ Store }))

  const module = await import("../index")
  const fs = args?.fs ?? createFsMock()
  const service = new module.WorkspaceStorageServiceImpl(fs)

  return { module, service, fs, Store }
}

describe("workspace storage service (P1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("getWorkspaceList caches store result", async () => {
    const list = {
      version: 1 as const,
      currentWorkspaceId: "ws-1",
      workspaces: [baseWorkspace],
    }

    const { service, Store } = await setupWorkspaceStorageTest({
      storeGetResult: E.right(list),
    })

    const first = await service.getWorkspaceList()
    const second = await service.getWorkspaceList()

    expect(first).toEqual(list)
    expect(second).toEqual(list)
    expect(Store.get).toHaveBeenCalledTimes(1)
  })

  it("getWorkspaceList returns default list for invalid store payload", async () => {
    const { service } = await setupWorkspaceStorageTest({
      storeGetResult: E.right({ version: 999 }),
    })

    const list = await service.getWorkspaceList()

    expect(list).toEqual({
      version: 1,
      currentWorkspaceId: undefined,
      workspaces: [],
    })
  })

  it("createWorkspace creates dirs, .gitignore and sets current workspace", async () => {
    const fs = createFsMock({
      fileExists: vi.fn(async () => false),
    })
    const { service, Store } = await setupWorkspaceStorageTest({
      fs,
      storeGetResult: E.right({
        version: 1,
        currentWorkspaceId: undefined,
        workspaces: [],
      }),
    })

    const created = await service.createWorkspace("My WS", "/tmp/my-ws")

    expect(created.name).toBe("My WS")
    expect(fs.createDir).toHaveBeenCalledWith("/tmp/my-ws")
    expect(fs.createDir).toHaveBeenCalledWith("/tmp/my-ws/collections")
    expect(fs.createDir).toHaveBeenCalledWith("/tmp/my-ws/environments")

    const writeCall = (
      fs.writeFile as ReturnType<typeof vi.fn>
    ).mock.calls.find((x) => x[0] === "/tmp/my-ws/.gitignore")
    expect(writeCall).toBeTruthy()
    expect(writeCall?.[1]).toContain(
      "# --- AUK managed: workspace sync (start) ---"
    )
    expect(writeCall?.[1]).toContain("*.secret.json")

    expect(Store.set).toHaveBeenCalledTimes(1)
    const savedList = (Store.set as ReturnType<typeof vi.fn>).mock.calls[0][2]
    expect(savedList.currentWorkspaceId).toBe(created.id)
    expect(savedList.workspaces).toHaveLength(1)
  })

  it("createWorkspace merges managed rules into existing .gitignore", async () => {
    const existing = "node_modules/\n.env\n"
    const fs = createFsMock({
      fileExists: vi.fn(async () => true),
      readFile: vi.fn(async () => existing),
    })
    const { service } = await setupWorkspaceStorageTest({
      fs,
      storeGetResult: E.right({
        version: 1,
        currentWorkspaceId: undefined,
        workspaces: [],
      }),
    })

    await service.createWorkspace("My WS", "/tmp/my-ws")

    const writeCall = (
      fs.writeFile as ReturnType<typeof vi.fn>
    ).mock.calls.find((x) => x[0] === "/tmp/my-ws/.gitignore")
    expect(writeCall).toBeTruthy()
    expect(writeCall?.[1]).toContain("node_modules/")
    expect(writeCall?.[1]).toContain(".env")
    expect(writeCall?.[1]).toContain(
      "# --- AUK managed: workspace sync (start) ---"
    )
    expect(writeCall?.[1]).toContain(
      "# --- AUK managed: workspace sync (end) ---"
    )
  })

  it("createWorkspace updates existing managed .gitignore block instead of duplicating", async () => {
    const existing = `node_modules/
# --- AUK managed: workspace sync (start) ---
# old
*.tmp
# --- AUK managed: workspace sync (end) ---
`
    const fs = createFsMock({
      fileExists: vi.fn(async () => true),
      readFile: vi.fn(async () => existing),
    })
    const { service } = await setupWorkspaceStorageTest({
      fs,
      storeGetResult: E.right({
        version: 1,
        currentWorkspaceId: undefined,
        workspaces: [],
      }),
    })

    await service.createWorkspace("My WS", "/tmp/my-ws")

    const writeCall = (
      fs.writeFile as ReturnType<typeof vi.fn>
    ).mock.calls.find((x) => x[0] === "/tmp/my-ws/.gitignore")
    expect(writeCall).toBeTruthy()
    const content = String(writeCall?.[1])
    expect(
      content.match(/AUK managed: workspace sync \(start\)/g)?.length
    ).toBe(1)
    expect(content).toContain("*.secret.json")
    expect(content).not.toContain("*.tmp")
  })

  it("setCurrentWorkspace throws for missing workspace", async () => {
    const { service } = await setupWorkspaceStorageTest({
      storeGetResult: E.right({
        version: 1,
        currentWorkspaceId: "ws-1",
        workspaces: [baseWorkspace],
      }),
    })

    await expect(service.setCurrentWorkspace("ws-404")).rejects.toThrow(
      "Workspace not found: ws-404"
    )
  })

  it("deleteWorkspace updates current workspace when deleting active one", async () => {
    const list = {
      version: 1 as const,
      currentWorkspaceId: "ws-1",
      workspaces: [
        baseWorkspace,
        {
          ...baseWorkspace,
          id: "ws-2",
          name: "Workspace 2",
          path: "/tmp/ws-2",
        },
      ],
    }

    const { service, Store } = await setupWorkspaceStorageTest({
      storeGetResult: E.right(list),
    })

    await service.deleteWorkspace("ws-1")

    expect(Store.set).toHaveBeenCalledTimes(1)
    const savedList = (Store.set as ReturnType<typeof vi.fn>).mock.calls[0][2]
    expect(savedList.currentWorkspaceId).toBe("ws-2")
    expect(savedList.workspaces.map((w: { id: string }) => w.id)).toEqual([
      "ws-2",
    ])
  })

  it("listCollections ignores invalid collection files", async () => {
    const fs = createFsMock({
      readDir: vi.fn(async () => ["c1", "c2"]),
      readFile: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            version: 1,
            id: "c1",
            name: "Collection 1",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          })
        )
        .mockResolvedValueOnce("{not-json"),
    })

    const { service } = await setupWorkspaceStorageTest({ fs })
    const result = await service.listCollections("/tmp/ws")

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("c1")
  })

  it("saveCollection uses sanitized folder name", async () => {
    const fs = createFsMock()
    const { service } = await setupWorkspaceStorageTest({ fs })

    await service.saveCollection("/tmp/ws", {
      version: 1,
      id: "collection-id-12345678",
      name: "My Collection!!!",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    })

    expect(fs.createDir).toHaveBeenCalledWith(
      "/tmp/ws/collections/my-collection-collecti"
    )
    expect(fs.writeFile).toHaveBeenCalledWith(
      "/tmp/ws/collections/my-collection-collecti/collection.json",
      expect.any(String)
    )
  })

  it("saveRequest and deleteRequest handle request file lifecycle", async () => {
    const fs = createFsMock({
      readDir: vi.fn(async () => [
        "collection.json",
        "req-a.json",
        "req-b.json",
      ]),
      readFile: vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ id: "r1" }))
        .mockResolvedValueOnce(JSON.stringify({ id: "r2" })),
    })

    const { service } = await setupWorkspaceStorageTest({ fs })

    await service.saveRequest("/tmp/ws", "my-collection", {
      version: 1,
      id: "request-id-12345678",
      name: "Get Users",
      method: "GET",
      endpoint: "https://example.com",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    })

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/tmp/ws/collections/my-collection/get-users-request-.json",
      expect.any(String)
    )

    await service.deleteRequest("/tmp/ws", "my-collection", "r2")

    expect(fs.deleteFile).toHaveBeenCalledWith(
      "/tmp/ws/collections/my-collection/req-b.json"
    )
  })

  it("saveEnvironment and deleteEnvironment handle environment file lifecycle", async () => {
    const fs = createFsMock({
      readDir: vi.fn(async () => ["prod.json", "staging.json"]),
      readFile: vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ id: "env-1" }))
        .mockResolvedValueOnce(JSON.stringify({ id: "env-2" })),
    })

    const { service } = await setupWorkspaceStorageTest({ fs })

    await service.saveEnvironment("/tmp/ws", {
      version: 1,
      id: "env-2",
      name: "Prod Env",
      variables: [{ key: "A", value: "B", secret: false }],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    })

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/tmp/ws/environments/prod-env.json",
      expect.any(String)
    )

    await service.deleteEnvironment("/tmp/ws", "env-2")

    expect(fs.deleteFile).toHaveBeenCalledWith(
      "/tmp/ws/environments/staging.json"
    )
  })
})
