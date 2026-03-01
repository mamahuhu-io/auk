/**
 * Git OAuth Authentication Service
 * Handles OAuth authorization code flow with PKCE
 */

import { ref } from "vue"
import type {
  GitOAuthProvider,
  GitOAuthConfig,
  GitOAuthToken,
  GitOAuthUser,
  GitOAuthAccount,
  GitOAuthState,
} from "./types"
import {
  getOAuthProviderConfig,
  providerSupportsPKCE,
  getDesktopRedirectUri,
} from "./oauth-providers"
import {
  saveOAuthAccount,
  updateOAuthToken,
  getOAuthAccount,
  isTokenExpired,
} from "./oauth-store"
import { getPlatformFetch } from "~/platform/capabilities"
import {
  storageGetItem,
  storageRemoveItem,
  storageSetItem,
} from "./browser-storage"

const PENDING_AUTH_KEY = "git_oauth_pending"
export const PENDING_AUTH_TIMEOUT_MS = 2 * 60 * 1000

// Current authentication state
const pendingAuth = ref<GitOAuthState | null>(null)

async function getNetworkFetch(): Promise<typeof fetch> {
  return getPlatformFetch()
}

/**
 * Generate cryptographically random string
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}

/**
 * Generate OAuth state parameter
 */
function generateState(): string {
  return generateRandomString(32)
}

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

/**
 * Save pending auth state to localStorage.
 * Strips clientSecret from the config — it will be re-resolved from
 * environment variables when the callback is handled.
 */
function savePendingAuth(state: GitOAuthState): void {
  pendingAuth.value = state
  try {
    // Strip clientSecret before persisting to localStorage
    const { clientSecret: _, ...safeConfig } = state.config
    const safeState = { ...state, config: safeConfig }
    storageSetItem(PENDING_AUTH_KEY, JSON.stringify(safeState))
  } catch (error) {
    console.error("[GitOAuth] Failed to save pending auth:", error)
  }
}

/**
 * Load pending auth state from localStorage.
 * Re-hydrates clientSecret from environment variables (it was stripped
 * before persisting for security).
 */
function loadPendingAuth(): GitOAuthState | null {
  if (pendingAuth.value) {
    return pendingAuth.value
  }

  try {
    const stored = storageGetItem(PENDING_AUTH_KEY)
    if (stored) {
      const parsed: GitOAuthState = JSON.parse(stored)
      if (
        typeof parsed.startedAt !== "number" ||
        Date.now() - parsed.startedAt > PENDING_AUTH_TIMEOUT_MS
      ) {
        clearPendingAuth()
        return null
      }
      // Re-hydrate clientSecret from env vars
      const creds = getOAuthClientCredentials(parsed.provider)
      if (creds?.clientSecret) {
        parsed.config.clientSecret = creds.clientSecret
      }
      pendingAuth.value = parsed
      return pendingAuth.value
    }
  } catch (error) {
    console.error("[GitOAuth] Failed to load pending auth:", error)
  }

  return null
}

/**
 * Clear pending auth state
 */
function clearPendingAuth(): void {
  pendingAuth.value = null
  try {
    storageRemoveItem(PENDING_AUTH_KEY)
  } catch (error) {
    console.error("[GitOAuth] Failed to clear pending auth:", error)
  }
}

/**
 * Start OAuth authorization flow
 * Returns the authorization URL to open in browser
 */
export async function startOAuthFlow(
  provider: GitOAuthProvider,
  clientId: string,
  clientSecret?: string
): Promise<string> {
  const config = getOAuthProviderConfig(provider, clientId, clientSecret)
  const state = generateState()
  const redirectUri = getDesktopRedirectUri()

  // Generate PKCE codes if supported
  let codeVerifier: string | undefined
  let codeChallenge: string | undefined

  if (providerSupportsPKCE(provider)) {
    codeVerifier = generateCodeVerifier()
    codeChallenge = await generateCodeChallenge(codeVerifier)
  }

  // Save pending auth state
  const authState: GitOAuthState = {
    provider,
    state,
    codeVerifier,
    redirectUri,
    config,
    startedAt: Date.now(),
  }
  savePendingAuth(authState)

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state,
    response_type: "code",
  })

  // Add PKCE parameters if supported
  if (codeChallenge) {
    params.append("code_challenge", codeChallenge)
    params.append("code_challenge_method", "S256")
  }

  return `${config.authUrl}?${params.toString()}`
}

/**
 * Handle OAuth callback with authorization code
 */
export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<GitOAuthAccount> {
  // Load and validate pending auth state
  const authState = loadPendingAuth()

  if (!authState) {
    throw new Error("No pending OAuth authentication found")
  }

  if (authState.state !== state) {
    clearPendingAuth()
    throw new Error("Invalid OAuth state - possible CSRF attack")
  }

  // Clear pending auth immediately
  clearPendingAuth()

  // Exchange code for token
  const token = await exchangeCodeForToken(
    code,
    authState.codeVerifier,
    authState.config,
    authState.redirectUri
  )

  // Fetch user info
  const user = await fetchUserInfo(authState.config, token.accessToken)

  // Save and return account
  const account = await saveOAuthAccount(authState.provider, user, token)

  return account
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  codeVerifier: string | undefined,
  config: GitOAuthConfig,
  redirectUri: string
): Promise<GitOAuthToken> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
  })

  // Add code verifier for PKCE
  if (codeVerifier) {
    body.append("code_verifier", codeVerifier)
  }

  // Add client secret if provided
  if (config.clientSecret) {
    body.append("client_secret", config.clientSecret)
  }

  const networkFetch = await getNetworkFetch()
  const response = await networkFetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[GitOAuth] Token exchange failed:", errorText)
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  const data = await response.json()

  // Handle GitHub's non-standard response format
  if (data.error) {
    throw new Error(data.error_description || data.error)
  }

  return {
    provider: config.provider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
    tokenType: data.token_type || "bearer",
    scope: data.scope || config.scopes.join(" "),
  }
}

/**
 * Fetch user information from provider API
 */
async function fetchUserInfo(
  config: GitOAuthConfig,
  accessToken: string
): Promise<GitOAuthUser> {
  const networkFetch = await getNetworkFetch()
  const response = await networkFetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`)
  }

  const data = await response.json()

  // Parse user info based on provider
  return parseUserInfo(config.provider, data)
}

/**
 * Parse user info response based on provider
 */
function parseUserInfo(provider: GitOAuthProvider, data: any): GitOAuthUser {
  switch (provider) {
    case "github":
      return {
        provider: "github",
        id: String(data.id),
        username: data.login,
        email: data.email || "",
        avatarUrl: data.avatar_url,
        name: data.name,
      }

    case "gitlab":
      return {
        provider: "gitlab",
        id: String(data.id),
        username: data.username,
        email: data.email || "",
        avatarUrl: data.avatar_url,
        name: data.name,
      }

    case "gitee":
      return {
        provider: "gitee",
        id: String(data.id),
        username: data.login,
        email: data.email || "",
        avatarUrl: data.avatar_url,
        name: data.name,
      }

    case "bitbucket":
      return {
        provider: "bitbucket",
        id: data.uuid || data.account_id,
        username: data.username,
        email: data.email || "",
        avatarUrl: data.links?.avatar?.href,
        name: data.display_name,
      }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Refresh an expired OAuth token
 */
export async function refreshOAuthToken(
  accountId: string,
  clientId: string,
  clientSecret?: string
): Promise<GitOAuthToken | null> {
  const account = await getOAuthAccount(accountId)

  if (!account) {
    console.error("[GitOAuth] Account not found:", accountId)
    return null
  }

  if (!account.token.refreshToken) {
    console.error("[GitOAuth] No refresh token available for:", accountId)
    return null
  }

  const config = getOAuthProviderConfig(
    account.provider,
    clientId,
    clientSecret
  )

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.token.refreshToken,
    client_id: config.clientId,
  })

  if (config.clientSecret) {
    body.append("client_secret", config.clientSecret)
  }

  try {
    const networkFetch = await getNetworkFetch()
    const response = await networkFetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    })

    if (!response.ok) {
      console.error("[GitOAuth] Token refresh failed:", response.status)
      return null
    }

    const data = await response.json()

    if (data.error) {
      console.error("[GitOAuth] Token refresh error:", data.error)
      return null
    }

    const newToken: GitOAuthToken = {
      provider: account.provider,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || account.token.refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      tokenType: data.token_type || "bearer",
      scope: data.scope || account.token.scope,
    }

    await updateOAuthToken(accountId, newToken)
    return newToken
  } catch (error) {
    console.error("[GitOAuth] Token refresh failed:", error)
    return null
  }
}

/**
 * Resolve OAuth client credentials from environment variables.
 * Centralised so both the composable and service layers can use it.
 */
export function getOAuthClientCredentials(
  provider: GitOAuthProvider
): { clientId: string; clientSecret?: string } | null {
  switch (provider) {
    case "github": {
      const id = import.meta.env.VITE_GITHUB_CLIENT_ID
      if (!id) return null
      return {
        clientId: id,
        clientSecret: import.meta.env.VITE_GITHUB_CLIENT_SECRET,
      }
    }
    case "gitlab": {
      const id = import.meta.env.VITE_GITLAB_CLIENT_ID
      if (!id) return null
      return {
        clientId: id,
        clientSecret: import.meta.env.VITE_GITLAB_CLIENT_SECRET,
      }
    }
    case "gitee": {
      const id = import.meta.env.VITE_GITEE_CLIENT_ID
      if (!id) return null
      return {
        clientId: id,
        clientSecret: import.meta.env.VITE_GITEE_CLIENT_SECRET,
      }
    }
    case "bitbucket": {
      const id = import.meta.env.VITE_BITBUCKET_CLIENT_ID
      if (!id) return null
      return {
        clientId: id,
        clientSecret: import.meta.env.VITE_BITBUCKET_CLIENT_SECRET,
      }
    }
    default:
      return null
  }
}

/**
 * Get a valid access token for an account
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(
  accountId: string,
  clientId?: string,
  clientSecret?: string
): Promise<string | null> {
  const account = await getOAuthAccount(accountId)

  if (!account) {
    return null
  }

  // Check if token is expired
  if (isTokenExpired(account)) {
    // Resolve clientId from explicit arg or from env vars
    let resolvedClientId = clientId
    let resolvedClientSecret = clientSecret
    if (!resolvedClientId) {
      const creds = getOAuthClientCredentials(account.provider)
      if (creds) {
        resolvedClientId = creds.clientId
        resolvedClientSecret = resolvedClientSecret ?? creds.clientSecret
      }
    }

    if (!resolvedClientId) {
      console.error("[GitOAuth] Cannot refresh token: no client ID available")
      return null
    }

    const newToken = await refreshOAuthToken(
      accountId,
      resolvedClientId,
      resolvedClientSecret
    )
    if (newToken) {
      return newToken.accessToken
    }
    return null
  }

  return account.token.accessToken
}

/**
 * Check if there's a pending OAuth flow
 */
export function hasPendingOAuth(): boolean {
  return loadPendingAuth() !== null
}

/**
 * Cancel any pending OAuth flow
 */
export function cancelPendingOAuth(): void {
  clearPendingAuth()
}
