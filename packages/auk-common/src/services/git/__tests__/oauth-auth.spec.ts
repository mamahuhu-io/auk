import { describe, expect, test, beforeEach } from "vitest"
import {
  hasPendingOAuth,
  cancelPendingOAuth,
  PENDING_AUTH_TIMEOUT_MS,
} from "../oauth-auth"
import type { GitOAuthState } from "../types"
import {
  storageClear,
  storageGetItem,
  storageSetItem,
} from "../browser-storage"

const PENDING_AUTH_KEY = "git_oauth_pending"

const baseState: GitOAuthState = {
  provider: "github",
  state: "test-state",
  redirectUri: "io.mamahuhu.auk://oauth/callback",
  config: {
    provider: "github",
    clientId: "client-id",
    scopes: ["repo"],
    authUrl: "https://example.com/auth",
    tokenUrl: "https://example.com/token",
    apiUrl: "https://example.com/api",
    userInfoUrl: "https://example.com/user",
  },
  startedAt: Date.now(),
}

beforeEach(() => {
  storageClear()
})

describe("git oauth pending state", () => {
  test("hasPendingOAuth returns true for a fresh pending auth and clears after cancel", () => {
    storageSetItem(PENDING_AUTH_KEY, JSON.stringify(baseState))

    expect(hasPendingOAuth()).toBe(true)

    cancelPendingOAuth()
    expect(hasPendingOAuth()).toBe(false)
    expect(storageGetItem(PENDING_AUTH_KEY)).toBeNull()
  })

  test("hasPendingOAuth returns false for expired pending auth and clears storage", () => {
    const expiredState = {
      ...baseState,
      startedAt: Date.now() - PENDING_AUTH_TIMEOUT_MS - 1000,
    }
    storageSetItem(PENDING_AUTH_KEY, JSON.stringify(expiredState))

    expect(hasPendingOAuth()).toBe(false)
    expect(storageGetItem(PENDING_AUTH_KEY)).toBeNull()
  })

  test("hasPendingOAuth returns false when startedAt is missing", () => {
    const { startedAt: _ignored, ...noTimestamp } = baseState
    storageSetItem(PENDING_AUTH_KEY, JSON.stringify(noTimestamp))

    expect(hasPendingOAuth()).toBe(false)
    expect(storageGetItem(PENDING_AUTH_KEY)).toBeNull()
  })
})
