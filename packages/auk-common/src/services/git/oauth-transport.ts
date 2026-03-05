import {
  getPlatformFetch,
  invokeDesktopCommand,
  isDesktopPlatform,
} from "~/platform/capabilities"
import { OAUTH_PROVIDER_ENDPOINTS } from "./oauth-endpoints"
import type { GitOAuthProvider } from "./types"

const OAUTH_NETWORK_TIMEOUT_MS = 30 * 1000
const OAUTH_BODY_TIMEOUT_MS = 30 * 1000
const OAUTH_DESKTOP_TIMEOUT_MS =
  OAUTH_NETWORK_TIMEOUT_MS + OAUTH_BODY_TIMEOUT_MS

export interface OAuthRequest {
  url: string
  method: "GET" | "POST"
  headers?: Record<string, string>
  body?: string
}

export interface OAuthResponse {
  status: number
  body: string
}

interface OAuthDesktopRequest {
  provider: GitOAuthProvider
  action: "token" | "user_info"
  body?: string
  accessToken?: string
  timeoutMs: number
}

async function getNetworkFetch(): Promise<typeof fetch> {
  return getPlatformFetch()
}

function readHeader(
  headers: Record<string, string> | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined
  const target = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value
  }
  return undefined
}

function extractBearerToken(
  headers: Record<string, string> | undefined
): string | undefined {
  const authorization = readHeader(headers, "authorization")
  if (!authorization) return undefined

  const prefix = "Bearer "
  if (authorization.startsWith(prefix)) {
    return authorization.slice(prefix.length)
  }
  return undefined
}

function toDesktopOAuthRequest(request: OAuthRequest): OAuthDesktopRequest {
  for (const [provider, endpoint] of Object.entries(OAUTH_PROVIDER_ENDPOINTS)) {
    const typedProvider = provider as GitOAuthProvider
    if (request.url === endpoint.tokenUrl) {
      if (request.method !== "POST") {
        throw new Error(
          `OAuth desktop bridge expects POST for token endpoint: ${request.url}`
        )
      }
      return {
        provider: typedProvider,
        action: "token",
        body: request.body,
        timeoutMs: OAUTH_DESKTOP_TIMEOUT_MS,
      }
    }

    if (request.url === endpoint.userInfoUrl) {
      if (request.method !== "GET") {
        throw new Error(
          `OAuth desktop bridge expects GET for user info endpoint: ${request.url}`
        )
      }
      const accessToken = extractBearerToken(request.headers)
      if (!accessToken) {
        throw new Error(
          `OAuth desktop bridge requires Bearer token for user info endpoint: ${request.url}`
        )
      }
      return {
        provider: typedProvider,
        action: "user_info",
        accessToken,
        timeoutMs: OAUTH_DESKTOP_TIMEOUT_MS,
      }
    }
  }

  throw new Error(`Unsupported OAuth desktop endpoint: ${request.url}`)
}

async function fetchWithTimeout(
  networkFetch: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1]
): Promise<Response> {
  const controller = new AbortController()
  const timeoutMessage = `OAuth request timed out after ${OAUTH_NETWORK_TIMEOUT_MS / 1000}s`
  const requestPromise = networkFetch(input, {
    ...init,
    signal: controller.signal,
  })

  let didTimeout = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      didTimeout = true
      controller.abort()
      reject(new Error(timeoutMessage))
    }, OAUTH_NETWORK_TIMEOUT_MS)
  })

  try {
    return await Promise.race([requestPromise, timeoutPromise])
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(timeoutMessage)
    }
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    // Tauri plugin-http may ignore AbortSignal. Keep the UI from waiting forever
    // by timing out via Promise.race and swallowing late rejections.
    if (didTimeout) {
      void requestPromise.catch(() => undefined)
    }
  }
}

async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let didTimeout = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      didTimeout = true
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (didTimeout) {
      void promise.catch(() => undefined)
    }
  }
}

async function readResponseTextWithTimeout(
  response: Response,
  context: string
): Promise<string> {
  return promiseWithTimeout(
    response.text(),
    OAUTH_BODY_TIMEOUT_MS,
    `${context} timed out after ${OAUTH_BODY_TIMEOUT_MS / 1000}s`
  )
}

export function parseJsonPayload<T>(payload: string, context: string): T {
  if (!payload) {
    throw new Error(`${context} returned empty JSON payload`)
  }

  try {
    return JSON.parse(payload) as T
  } catch (error) {
    console.error("[GitOAuth] Failed to parse JSON response:", payload, error)
    throw new Error(`${context} returned invalid JSON`)
  }
}

export async function sendOAuthRequest(
  request: OAuthRequest,
  context: string
): Promise<OAuthResponse> {
  if (isDesktopPlatform()) {
    const desktopRequest = toDesktopOAuthRequest(request)
    console.log(
      "[GitOAuth] Using desktop OAuth HTTP bridge:",
      desktopRequest.provider,
      desktopRequest.action
    )
    return promiseWithTimeout(
      invokeDesktopCommand<OAuthResponse>("oauth_http_request", {
        request: desktopRequest,
      }),
      OAUTH_DESKTOP_TIMEOUT_MS,
      `${context} timed out after ${OAUTH_DESKTOP_TIMEOUT_MS / 1000}s`
    )
  }

  const networkFetch = await getNetworkFetch()
  const response = await fetchWithTimeout(networkFetch, request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })
  const body = await readResponseTextWithTimeout(response, context)

  return {
    status: response.status,
    body,
  }
}
