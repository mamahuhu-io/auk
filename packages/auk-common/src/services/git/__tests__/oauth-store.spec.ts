import { beforeEach, describe, expect, test, vi } from "vitest"
import { storageClear, storageSetItem } from "../browser-storage"

const STORAGE_KEY = "git_oauth_accounts"

describe("git oauth store hydration", () => {
  const makeStoredAccount = (id: string) => ({
    id,
    provider: "github",
    user: {
      id: id.replace("github-", ""),
      username: "octocat",
      name: "Octocat",
    },
    token: {
      provider: "github",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      tokenType: "bearer",
      scope: "repo",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  beforeEach(() => {
    storageClear()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  test("exposes hydration state to avoid rendering empty-state before keychain load", async () => {
    storageSetItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          ...makeStoredAccount("github-1"),
        },
      ])
    )

    let releaseKeychainLoad: (() => void) | null = null
    const keychainGate = new Promise<void>((resolve) => {
      releaseKeychainLoad = resolve
    })

    vi.doMock("../credential-store", () => ({
      storeCredential: vi.fn(async () => {}),
      getCredential: vi.fn(async (key: string) => {
        await keychainGate
        return key.startsWith("oauth_access_token:") ? "access-token" : null
      }),
      deleteCredential: vi.fn(async () => {}),
    }))

    const { useGitOAuthAccounts, loadOAuthAccounts } =
      await import("../oauth-store")
    const state = useGitOAuthAccounts()

    expect(state.isHydrated.value).toBe(false)
    expect(state.isLoading.value).toBe(true)

    const loadPromise = loadOAuthAccounts()

    releaseKeychainLoad?.()
    await loadPromise

    expect(state.isHydrated.value).toBe(true)
    expect(state.isLoading.value).toBe(false)
    expect(state.accounts.value).toHaveLength(1)
  })

  test("force reload refreshes in-memory accounts from storage", async () => {
    storageSetItem(STORAGE_KEY, JSON.stringify([makeStoredAccount("github-1")]))

    vi.doMock("../credential-store", () => ({
      storeCredential: vi.fn(async () => {}),
      getCredential: vi.fn(async () => null),
      deleteCredential: vi.fn(async () => {}),
    }))

    const { loadOAuthAccounts } = await import("../oauth-store")

    const firstLoad = await loadOAuthAccounts()
    expect(firstLoad.map((a) => a.id)).toEqual(["github-1"])

    storageSetItem(STORAGE_KEY, JSON.stringify([makeStoredAccount("github-2")]))

    // Cached result should remain unchanged unless force refresh is used.
    const cachedLoad = await loadOAuthAccounts()
    expect(cachedLoad.map((a) => a.id)).toEqual(["github-1"])

    const refreshed = await loadOAuthAccounts({ force: true })
    expect(refreshed.map((a) => a.id)).toEqual(["github-2"])
  })

  test("failed load does not poison cache and allows subsequent retry", async () => {
    storageSetItem(STORAGE_KEY, JSON.stringify([makeStoredAccount("github-1")]))

    let attempts = 0
    const getCredential = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) {
        throw new Error("keychain unavailable")
      }
      return null
    })

    vi.doMock("../credential-store", () => ({
      storeCredential: vi.fn(async () => {}),
      getCredential,
      deleteCredential: vi.fn(async () => {}),
    }))

    const { loadOAuthAccounts } = await import("../oauth-store")

    const firstLoad = await loadOAuthAccounts()
    expect(firstLoad).toEqual([])

    const secondLoad = await loadOAuthAccounts()
    expect(secondLoad.map((a) => a.id)).toEqual(["github-1"])
    expect(getCredential).toHaveBeenCalledTimes(3)
  })
})
