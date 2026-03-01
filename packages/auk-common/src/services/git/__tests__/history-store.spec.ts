import { beforeEach, describe, expect, it } from "vitest"
import {
  addSyncHistoryEntry,
  clearAllHistory,
  clearOldEntries,
  clearWorkspaceHistory,
  getLastSyncEntry,
  getSyncHistory,
  getSyncStats,
} from "../history-store"
import {
  storageClear,
  storageGetItem,
  storageSetItem,
} from "../browser-storage"

const STORAGE_KEY = "auk_git_sync_history"

function seed(entries: unknown[]) {
  storageSetItem(STORAGE_KEY, JSON.stringify(entries))
}

describe("git history store (P1)", () => {
  beforeEach(() => {
    storageClear()
  })

  it("addSyncHistoryEntry prepends and caps at 100 entries", () => {
    const existing = Array.from({ length: 100 }).map((_, i) => ({
      id: `id-${i}`,
      timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
      operation: "sync",
      result: "success",
      pulled: 0,
      pushed: 0,
      conflicts: [],
      workspaceId: "ws",
    }))
    seed(existing)

    addSyncHistoryEntry({
      operation: "pull",
      result: "failed",
      pulled: 0,
      pushed: 0,
      conflicts: [],
      error: "boom",
      workspaceId: "ws",
      workspaceName: "Workspace",
    })

    const history = getSyncHistory()
    expect(history).toHaveLength(100)
    expect(history[0].operation).toBe("pull")
  })

  it("getSyncHistory filters by workspace and converts timestamp to Date", () => {
    seed([
      {
        id: "1",
        timestamp: "2026-01-01T00:00:00.000Z",
        operation: "sync",
        result: "success",
        pulled: 1,
        pushed: 2,
        conflicts: [],
        workspaceId: "ws-1",
      },
      {
        id: "2",
        timestamp: "2026-01-02T00:00:00.000Z",
        operation: "pull",
        result: "failed",
        pulled: 0,
        pushed: 0,
        conflicts: ["a"],
        workspaceId: "ws-2",
      },
    ])

    const all = getSyncHistory()
    const ws1 = getSyncHistory("ws-1")

    expect(all).toHaveLength(2)
    expect(all[0].timestamp).toBeInstanceOf(Date)
    expect(ws1.map((e) => e.workspaceId)).toEqual(["ws-1"])
  })

  it("clearOldEntries removes entries beyond keepCount", () => {
    seed(
      Array.from({ length: 5 }).map((_, i) => ({
        id: `${i}`,
        timestamp: new Date().toISOString(),
        operation: "sync",
        result: "success",
        pulled: i,
        pushed: 0,
        conflicts: [],
        workspaceId: "ws",
      }))
    )

    const removed = clearOldEntries(3)

    expect(removed).toBe(2)
    expect(getSyncHistory()).toHaveLength(3)
  })

  it("clearWorkspaceHistory removes only selected workspace entries", () => {
    seed([
      {
        id: "1",
        timestamp: new Date().toISOString(),
        operation: "sync",
        result: "success",
        pulled: 0,
        pushed: 0,
        conflicts: [],
        workspaceId: "ws-1",
      },
      {
        id: "2",
        timestamp: new Date().toISOString(),
        operation: "push",
        result: "failed",
        pulled: 0,
        pushed: 0,
        conflicts: [],
        workspaceId: "ws-2",
      },
    ])

    const removed = clearWorkspaceHistory("ws-1")

    expect(removed).toBe(1)
    expect(getSyncHistory().map((e) => e.workspaceId)).toEqual(["ws-2"])
  })

  it("getLastSyncEntry returns latest entry and getSyncStats aggregates fields", () => {
    seed([
      {
        id: "1",
        timestamp: "2026-01-02T00:00:00.000Z",
        operation: "sync",
        result: "success",
        pulled: 2,
        pushed: 1,
        conflicts: [],
        workspaceId: "ws-1",
      },
      {
        id: "2",
        timestamp: "2026-01-01T00:00:00.000Z",
        operation: "pull",
        result: "conflicts",
        pulled: 1,
        pushed: 0,
        conflicts: ["file"],
        workspaceId: "ws-1",
      },
      {
        id: "3",
        timestamp: "2026-01-03T00:00:00.000Z",
        operation: "push",
        result: "failed",
        pulled: 0,
        pushed: 0,
        conflicts: [],
        workspaceId: "ws-2",
      },
    ])

    const last = getLastSyncEntry("ws-1")
    const stats = getSyncStats("ws-1")

    expect(last?.id).toBe("1")
    expect(stats).toEqual({
      totalSyncs: 2,
      successfulSyncs: 1,
      failedSyncs: 0,
      totalPulled: 3,
      totalPushed: 1,
      totalConflicts: 1,
    })
  })

  it("handles malformed localStorage payloads safely", () => {
    storageSetItem(STORAGE_KEY, "not-json")

    expect(getSyncHistory()).toEqual([])
    expect(clearOldEntries()).toBe(0)
    expect(clearWorkspaceHistory("ws")).toBe(0)

    clearAllHistory()
    expect(storageGetItem(STORAGE_KEY)).toBeNull()
  })
})
