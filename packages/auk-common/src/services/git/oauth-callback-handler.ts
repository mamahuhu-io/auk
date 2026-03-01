/**
 * Git OAuth Callback Handler
 * Handles deep link callbacks from OAuth authorization
 */

import { handleOAuthCallback, hasPendingOAuth } from "./oauth-auth"
import type { GitOAuthAccount } from "./types"
import { listenDesktopEvent } from "~/platform/capabilities"

// Event types for OAuth callbacks
export interface GitOAuthSuccessEvent {
  account: GitOAuthAccount
}

export interface GitOAuthErrorEvent {
  error: string
  errorDescription?: string
}

// Custom event names
export const GIT_OAUTH_SUCCESS_EVENT = "git-oauth-success"
export const GIT_OAUTH_ERROR_EVENT = "git-oauth-error"

// Track if handler is initialized
let isInitialized = false

/**
 * Parse OAuth callback URL
 */
function parseCallbackUrl(url: string): {
  code?: string
  state?: string
  error?: string
  errorDescription?: string
} {
  try {
    // Handle custom protocol URL
    // io.auk.desktop://oauth/callback?code=xxx&state=xxx
    const urlObj = new URL(url)
    const params = urlObj.searchParams

    return {
      code: params.get("code") || undefined,
      state: params.get("state") || undefined,
      error: params.get("error") || undefined,
      errorDescription: params.get("error_description") || undefined,
    }
  } catch (error) {
    console.error("[GitOAuth] Failed to parse callback URL:", url, error)
    return {}
  }
}

/**
 * Check if URL is an OAuth callback
 */
function isOAuthCallback(url: string): boolean {
  try {
    const urlObj = new URL(url)
    if (urlObj.pathname.includes("/oauth/callback")) return true
  } catch {
    // Ignore URL parse errors; fall back to substring checks below.
  }
  return url.includes("oauth/callback") || url.includes("oauth%2Fcallback")
}

/**
 * Normalize deep link payload into a URL string.
 */
function normalizeDeepLinkPayload(payload: unknown): string | null {
  if (typeof payload === "string") return payload
  if (Array.isArray(payload) && typeof payload[0] === "string") {
    return payload[0]
  }
  if (payload && typeof payload === "object") {
    const maybeUrl = (payload as { url?: unknown }).url
    if (typeof maybeUrl === "string") return maybeUrl
  }
  return null
}

/**
 * Handle deep link event
 */
async function handleDeepLink(url: string): Promise<void> {
  console.log("[GitOAuth] Deep link received:", url)

  // Check if this is an OAuth callback
  if (!isOAuthCallback(url)) {
    console.log("[GitOAuth] Not an OAuth callback, ignoring")
    return
  }

  // Check if we have a pending OAuth flow
  if (!hasPendingOAuth()) {
    console.warn("[GitOAuth] No pending OAuth flow, ignoring callback")
    return
  }

  const { code, state, error, errorDescription } = parseCallbackUrl(url)

  // Handle OAuth error
  if (error) {
    console.error("[GitOAuth] OAuth error:", error, errorDescription)

    const errorEvent: GitOAuthErrorEvent = {
      error,
      errorDescription,
    }

    window.dispatchEvent(
      new CustomEvent(GIT_OAUTH_ERROR_EVENT, { detail: errorEvent })
    )
    return
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("[GitOAuth] Missing code or state in callback")

    const errorEvent: GitOAuthErrorEvent = {
      error: "invalid_callback",
      errorDescription: "Missing authorization code or state parameter",
    }

    window.dispatchEvent(
      new CustomEvent(GIT_OAUTH_ERROR_EVENT, { detail: errorEvent })
    )
    return
  }

  try {
    // Process the OAuth callback
    const account = await handleOAuthCallback(code, state)

    console.log("[GitOAuth] OAuth successful for:", account.user.username)

    const successEvent: GitOAuthSuccessEvent = {
      account,
    }

    window.dispatchEvent(
      new CustomEvent(GIT_OAUTH_SUCCESS_EVENT, { detail: successEvent })
    )
  } catch (error) {
    console.error("[GitOAuth] Failed to handle OAuth callback:", error)

    const errorEvent: GitOAuthErrorEvent = {
      error: "callback_failed",
      errorDescription:
        error instanceof Error ? error.message : "Unknown error",
    }

    window.dispatchEvent(
      new CustomEvent(GIT_OAUTH_ERROR_EVENT, { detail: errorEvent })
    )
  }
}

/**
 * Initialize OAuth callback handler
 * Should be called once when the app starts
 */
export async function initOAuthCallbackHandler(): Promise<() => void> {
  if (isInitialized) {
    console.warn("[GitOAuth] Callback handler already initialized")
    return () => {}
  }

  console.log("[GitOAuth] Initializing callback handler")

  // Listen for deep link events from Tauri
  const unlisten = await listenDesktopEvent<unknown>(
    "scheme-request-received",
    (payload) => {
      const url = normalizeDeepLinkPayload(payload)
      if (!url) {
        console.warn("[GitOAuth] Invalid deep link payload:", payload)
        return
      }
      handleDeepLink(url)
    }
  )

  isInitialized = true

  // Return cleanup function
  return () => {
    unlisten()
    isInitialized = false
    console.log("[GitOAuth] Callback handler cleaned up")
  }
}

/**
 * Add listener for OAuth success events
 */
export function onOAuthSuccess(
  callback: (event: GitOAuthSuccessEvent) => void
): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<GitOAuthSuccessEvent>
    callback(customEvent.detail)
  }

  window.addEventListener(GIT_OAUTH_SUCCESS_EVENT, handler)

  return () => {
    window.removeEventListener(GIT_OAUTH_SUCCESS_EVENT, handler)
  }
}

/**
 * Add listener for OAuth error events
 */
export function onOAuthError(
  callback: (event: GitOAuthErrorEvent) => void
): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<GitOAuthErrorEvent>
    callback(customEvent.detail)
  }

  window.addEventListener(GIT_OAUTH_ERROR_EVENT, handler)

  return () => {
    window.removeEventListener(GIT_OAUTH_ERROR_EVENT, handler)
  }
}
