/**
 * Git OAuth Account Storage
 *
 * Account metadata (provider, user info, expiresAt, etc.) is persisted in
 * localStorage.  Sensitive tokens (accessToken, refreshToken) are stored in
 * the system Keychain via credential-store.ts.
 *
 * On first load after migration the store detects tokens still present in
 * localStorage, moves them to the Keychain, and strips them from the JSON.
 */

import { ref, computed } from "vue"
import type {
  GitOAuthAccount,
  GitOAuthToken,
  GitOAuthUser,
  GitOAuthProvider,
} from "./types"
import {
  storeCredential,
  getCredential,
  deleteCredential,
} from "./credential-store"
import { storageGetItem, storageSetItem } from "./browser-storage"

const STORAGE_KEY = "git_oauth_accounts"

// ---------------------------------------------------------------------------
// Keychain key helpers
// ---------------------------------------------------------------------------
function accessTokenKey(accountId: string): string {
  return `oauth_access_token:${accountId}`
}
function refreshTokenKey(accountId: string): string {
  return `oauth_refresh_token:${accountId}`
}

// ---------------------------------------------------------------------------
// In-memory account store
// ---------------------------------------------------------------------------
const accounts = ref<GitOAuthAccount[]>([])
const isLoadingAccounts = ref(false)
const isHydratedAccounts = ref(false)

/** Deduplicating load promise — ensures only one load runs at a time. */
let loadPromise: Promise<GitOAuthAccount[]> | null = null
let lastLoadFailed = false

interface LoadOAuthAccountsOptions {
  force?: boolean
}

/**
 * Serialisable shape stored in localStorage — tokens are stripped out.
 */
interface StoredAccount {
  id: string
  provider: GitOAuthProvider
  user: GitOAuthUser
  token: {
    provider: GitOAuthProvider
    // tokens omitted — stored in Keychain
    accessToken?: string // only present in legacy data (pre-migration)
    refreshToken?: string // only present in legacy data (pre-migration)
    expiresAt?: string
    tokenType: string
    scope: string
  }
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/** Write account metadata (without tokens) to localStorage. */
function saveAccountsToStorage(): void {
  try {
    const stripped: StoredAccount[] = accounts.value.map((acc) => ({
      id: acc.id,
      provider: acc.provider,
      user: acc.user,
      token: {
        provider: acc.token.provider,
        expiresAt: acc.token.expiresAt?.toISOString(),
        tokenType: acc.token.tokenType,
        scope: acc.token.scope,
      },
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    }))
    storageSetItem(STORAGE_KEY, JSON.stringify(stripped))
  } catch (error) {
    console.error("[GitOAuth] Failed to save accounts:", error)
  }
}

/** Save a single account's tokens to the Keychain. */
async function saveTokensToKeychain(account: GitOAuthAccount): Promise<void> {
  await storeCredential(accessTokenKey(account.id), account.token.accessToken)
  if (account.token.refreshToken) {
    await storeCredential(
      refreshTokenKey(account.id),
      account.token.refreshToken
    )
  }
}

/** Load tokens from the Keychain into an in-memory account object. */
async function hydrateTokens(account: GitOAuthAccount): Promise<void> {
  const at = await getCredential(accessTokenKey(account.id))
  if (at) account.token.accessToken = at

  const rt = await getCredential(refreshTokenKey(account.id))
  if (rt) account.token.refreshToken = rt
}

// ---------------------------------------------------------------------------
// Migration: move legacy tokens from localStorage → Keychain
// ---------------------------------------------------------------------------
async function migrateLegacyTokens(stored: StoredAccount[]): Promise<boolean> {
  let migrated = false
  for (const raw of stored) {
    if (raw.token.accessToken) {
      await storeCredential(accessTokenKey(raw.id), raw.token.accessToken)
      delete raw.token.accessToken
      migrated = true
    }
    if (raw.token.refreshToken) {
      await storeCredential(refreshTokenKey(raw.id), raw.token.refreshToken)
      delete raw.token.refreshToken
      migrated = true
    }
  }
  if (migrated) {
    // Re-write localStorage without tokens
    storageSetItem(STORAGE_KEY, JSON.stringify(stored))
    console.info("[GitOAuth] Migrated legacy tokens to Keychain")
  }
  return migrated
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load OAuth accounts from localStorage + Keychain.
 * Uses a deduplicating promise so concurrent callers share the same load.
 */
export function loadOAuthAccounts(
  options: LoadOAuthAccountsOptions = {}
): Promise<GitOAuthAccount[]> {
  // Force refresh only when there is no active load in-flight.
  if (options.force && !isLoadingAccounts.value) {
    invalidateOAuthCache()
  }

  if (!loadPromise) {
    isLoadingAccounts.value = true
    lastLoadFailed = false
    loadPromise = doLoadOAuthAccounts().finally(() => {
      isLoadingAccounts.value = false
      isHydratedAccounts.value = true

      // Allow retry if loading failed.
      if (lastLoadFailed) {
        loadPromise = null
      }
    })
  }
  return loadPromise
}

export function invalidateOAuthCache(): void {
  if (isLoadingAccounts.value) return
  loadPromise = null
}

async function doLoadOAuthAccounts(): Promise<GitOAuthAccount[]> {
  try {
    const stored = storageGetItem(STORAGE_KEY)
    if (stored) {
      const parsed: StoredAccount[] = JSON.parse(stored)

      // Migrate legacy tokens if present
      await migrateLegacyTokens(parsed)

      // Build in-memory accounts (tokens will be hydrated next)
      accounts.value = parsed.map((acc) => ({
        id: acc.id,
        provider: acc.provider,
        user: acc.user,
        token: {
          provider: acc.token.provider,
          accessToken: "", // placeholder — hydrated below
          refreshToken: undefined,
          expiresAt: acc.token.expiresAt
            ? new Date(acc.token.expiresAt)
            : undefined,
          tokenType: acc.token.tokenType,
          scope: acc.token.scope,
        },
        createdAt: new Date(acc.createdAt),
        updatedAt: new Date(acc.updatedAt),
      }))

      // Hydrate tokens from Keychain
      await Promise.all(accounts.value.map(hydrateTokens))
    } else {
      accounts.value = []
    }
  } catch (error) {
    console.error("[GitOAuth] Failed to load accounts:", error)
    accounts.value = []
    lastLoadFailed = true
  }

  return accounts.value
}

function generateAccountId(provider: GitOAuthProvider, userId: string): string {
  return `${provider}-${userId}`
}

/**
 * Add or update an OAuth account.
 */
export async function saveOAuthAccount(
  provider: GitOAuthProvider,
  user: GitOAuthUser,
  token: GitOAuthToken
): Promise<GitOAuthAccount> {
  await loadOAuthAccounts()

  const now = new Date()
  const accountId = generateAccountId(provider, user.id)

  const existingIndex = accounts.value.findIndex((acc) => acc.id === accountId)

  const account: GitOAuthAccount = {
    id: accountId,
    provider,
    user,
    token,
    createdAt:
      existingIndex >= 0 ? accounts.value[existingIndex].createdAt : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    accounts.value[existingIndex] = account
  } else {
    accounts.value.push(account)
  }

  // Persist tokens to Keychain, metadata to localStorage
  await saveTokensToKeychain(account)
  saveAccountsToStorage()
  return account
}

/**
 * Get an OAuth account by ID (with tokens already hydrated).
 */
export async function getOAuthAccount(
  accountId: string
): Promise<GitOAuthAccount | null> {
  await loadOAuthAccounts()
  return accounts.value.find((acc) => acc.id === accountId) || null
}

export async function getAccountsByProvider(
  provider: GitOAuthProvider
): Promise<GitOAuthAccount[]> {
  await loadOAuthAccounts()
  return accounts.value.filter((acc) => acc.provider === provider)
}

export async function getAllOAuthAccounts(): Promise<GitOAuthAccount[]> {
  await loadOAuthAccounts()
  return [...accounts.value]
}

/**
 * Remove an OAuth account (including Keychain entries).
 */
export async function removeOAuthAccount(accountId: string): Promise<boolean> {
  await loadOAuthAccounts()

  const index = accounts.value.findIndex((acc) => acc.id === accountId)
  if (index >= 0) {
    accounts.value.splice(index, 1)
    saveAccountsToStorage()
    // Best-effort cleanup from Keychain
    await deleteCredential(accessTokenKey(accountId)).catch(() => {})
    await deleteCredential(refreshTokenKey(accountId)).catch(() => {})
    return true
  }
  return false
}

/**
 * Update token for an account.
 */
export async function updateOAuthToken(
  accountId: string,
  token: GitOAuthToken
): Promise<boolean> {
  await loadOAuthAccounts()

  const account = accounts.value.find((acc) => acc.id === accountId)
  if (account) {
    account.token = token
    account.updatedAt = new Date()
    await saveTokensToKeychain(account)
    saveAccountsToStorage()
    return true
  }
  return false
}

/**
 * Check if a token is expired (with 5-minute buffer).
 */
export function isTokenExpired(account: GitOAuthAccount): boolean {
  if (!account.token.expiresAt) {
    return false
  }
  const buffer = 5 * 60 * 1000
  return new Date().getTime() >= account.token.expiresAt.getTime() - buffer
}

export function hasValidToken(account: GitOAuthAccount): boolean {
  return !!account.token.accessToken && !isTokenExpired(account)
}

/**
 * Clear all OAuth accounts (including Keychain entries).
 */
export async function clearAllOAuthAccounts(): Promise<void> {
  const ids = accounts.value.map((a) => a.id)
  accounts.value = []
  saveAccountsToStorage()
  // Best-effort cleanup
  await Promise.all(
    ids.flatMap((id) => [
      deleteCredential(accessTokenKey(id)).catch(() => {}),
      deleteCredential(refreshTokenKey(id)).catch(() => {}),
    ])
  )
}

/**
 * Vue Composable for Git OAuth accounts
 */
export function useGitOAuthAccounts() {
  // Trigger async load (fire-and-forget; reactive refs will update)
  loadOAuthAccounts()

  const allAccounts = computed(() => accounts.value)
  const isLoading = computed(() => isLoadingAccounts.value)
  const isHydrated = computed(() => isHydratedAccounts.value)

  const githubAccounts = computed(() =>
    accounts.value.filter((acc) => acc.provider === "github")
  )

  const gitlabAccounts = computed(() =>
    accounts.value.filter((acc) => acc.provider === "gitlab")
  )

  const giteeAccounts = computed(() =>
    accounts.value.filter((acc) => acc.provider === "gitee")
  )

  const bitbucketAccounts = computed(() =>
    accounts.value.filter((acc) => acc.provider === "bitbucket")
  )

  const getValidAccountForProvider = (
    provider: GitOAuthProvider
  ): GitOAuthAccount | null => {
    const providerAccounts = accounts.value.filter(
      (acc) => acc.provider === provider
    )
    return providerAccounts.find((acc) => hasValidToken(acc)) || null
  }

  return {
    accounts: allAccounts,
    isLoading,
    isHydrated,
    githubAccounts,
    gitlabAccounts,
    giteeAccounts,
    bitbucketAccounts,
    getAccount: getOAuthAccount,
    getAccountsByProvider,
    saveAccount: saveOAuthAccount,
    removeAccount: removeOAuthAccount,
    updateToken: updateOAuthToken,
    isExpired: isTokenExpired,
    hasValidToken,
    getValidAccountForProvider,
    clearAll: clearAllOAuthAccounts,
    refreshAccounts: () => loadOAuthAccounts({ force: true }),
    invalidateCache: invalidateOAuthCache,
  }
}
