/**
 * Git OAuth Composable
 * Provides reactive OAuth authentication for Git operations
 */

import { ref, computed, onMounted, onUnmounted } from "vue"
import { useI18n } from "./i18n"
import { useToast } from "./toast"
import type { GitOAuthProvider, GitOAuthAccount } from "~/services/git/types"
import { openExternalURL } from "~/platform/capabilities"
import {
  startOAuthFlow,
  getValidAccessToken,
  refreshOAuthToken,
  cancelPendingOAuth,
  PENDING_AUTH_TIMEOUT_MS,
  getOAuthClientCredentials,
} from "~/services/git/oauth-auth"
import {
  useGitOAuthAccounts,
  loadOAuthAccounts,
} from "~/services/git/oauth-store"
import {
  inferProviderFromUrl,
  getProviderDisplayName,
} from "~/services/git/oauth-providers"
import {
  initOAuthCallbackHandler,
  onOAuthSuccess,
  onOAuthError,
} from "~/services/git/oauth-callback-handler"

// OAuth client configuration resolved from environment variables
const getOAuthClientConfig = getOAuthClientCredentials

export function useGitOAuth() {
  const t = useI18n()
  const toast = useToast()

  // Get account management functions
  const {
    accounts,
    isLoading,
    isHydrated,
    githubAccounts,
    gitlabAccounts,
    giteeAccounts,
    bitbucketAccounts,
    getAccount,
    removeAccount,
    isExpired,
    hasValidToken,
    getValidAccountForProvider,
  } = useGitOAuthAccounts()

  // State
  const isAuthenticating = ref(false)
  const authError = ref<string | null>(null)
  const authProvider = ref<GitOAuthProvider | null>(null)

  // Cleanup functions
  let _cleanupCallbackHandler: (() => void) | null = null
  let cleanupSuccessListener: (() => void) | null = null
  let cleanupErrorListener: (() => void) | null = null
  let authTimeoutId: ReturnType<typeof setTimeout> | null = null

  function clearAuthTimeout(): void {
    if (authTimeoutId) {
      clearTimeout(authTimeoutId)
      authTimeoutId = null
    }
  }

  // Initialize callback handler and listeners
  onMounted(async () => {
    // Initialize deep link handler
    try {
      _cleanupCallbackHandler = await initOAuthCallbackHandler()
    } catch (error) {
      console.error("[GitOAuth] Failed to initialize callback handler:", error)
    }

    // Listen for OAuth success
    cleanupSuccessListener = onOAuthSuccess((event) => {
      clearAuthTimeout()
      isAuthenticating.value = false
      authError.value = null
      authProvider.value = null

      toast.success(
        t("workspace.git_oauth_success", {
          provider: getProviderDisplayName(event.account.provider),
          username: event.account.user.username,
        })
      )
    })

    // Listen for OAuth errors
    cleanupErrorListener = onOAuthError((event) => {
      clearAuthTimeout()
      isAuthenticating.value = false
      authError.value = event.errorDescription || event.error
      authProvider.value = null

      toast.error(
        t("workspace.git_oauth_error", {
          error: event.errorDescription || event.error,
        })
      )
    })

    // Load accounts on mount
    loadOAuthAccounts()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    // Keep the deep-link callback handler alive for the app lifetime.
    // It can be invoked from different UI entry points (modals/routes).
    clearAuthTimeout()
    cleanupSuccessListener?.()
    cleanupErrorListener?.()
  })

  /**
   * Check if a provider is configured
   */
  function isProviderConfigured(provider: GitOAuthProvider): boolean {
    return getOAuthClientConfig(provider) !== null
  }

  /**
   * Start OAuth authentication for a provider
   */
  async function authenticate(provider: GitOAuthProvider): Promise<void> {
    const clientConfig = getOAuthClientConfig(provider)

    if (!clientConfig) {
      toast.error(
        t("workspace.git_oauth_not_configured", {
          provider: getProviderDisplayName(provider),
        })
      )
      return
    }

    clearAuthTimeout()
    isAuthenticating.value = true
    authError.value = null
    authProvider.value = provider

    try {
      // Build authorization URL
      const authUrl = await startOAuthFlow(
        provider,
        clientConfig.clientId,
        clientConfig.clientSecret
      )

      // Open in system browser
      await openExternalURL(authUrl)

      toast.info(t("workspace.git_oauth_browser_opened"))

      authTimeoutId = setTimeout(() => {
        if (!isAuthenticating.value) return
        cancelPendingOAuth()
        isAuthenticating.value = false
        authError.value = t("workspace.git_oauth_timeout")
        authProvider.value = null
        toast.error(authError.value)
      }, PENDING_AUTH_TIMEOUT_MS)
    } catch (error) {
      clearAuthTimeout()
      isAuthenticating.value = false
      authError.value =
        error instanceof Error ? error.message : "Authentication failed"
      authProvider.value = null
      toast.error(authError.value)
    }
  }

  /**
   * Cancel ongoing authentication
   */
  function cancelAuthentication(): void {
    cancelPendingOAuth()
    clearAuthTimeout()
    isAuthenticating.value = false
    authError.value = null
    authProvider.value = null
  }

  /**
   * Disconnect an OAuth account
   */
  async function disconnect(accountId: string): Promise<void> {
    const account = await getAccount(accountId)
    if (account) {
      await removeAccount(accountId)
      toast.success(
        t("workspace.git_oauth_disconnected", {
          provider: getProviderDisplayName(account.provider),
          username: account.user.username,
        })
      )
    }
  }

  /**
   * Get the best account for a Git URL
   */
  function getAccountForUrl(url: string): GitOAuthAccount | null {
    const provider = inferProviderFromUrl(url)
    if (!provider) return null
    return getValidAccountForProvider(provider)
  }

  /**
   * Check if a provider has any connected accounts
   */
  function isAuthenticated(provider: GitOAuthProvider): boolean {
    return accounts.value.some(
      (acc) => acc.provider === provider && hasValidToken(acc)
    )
  }

  /**
   * Get valid access token for an account
   */
  async function getAccessToken(accountId: string): Promise<string | null> {
    const account = await getAccount(accountId)
    if (!account) return null

    const clientConfig = getOAuthClientConfig(account.provider)
    if (!clientConfig) return null

    return getValidAccessToken(
      accountId,
      clientConfig.clientId,
      clientConfig.clientSecret
    )
  }

  /**
   * Refresh token for an account
   */
  async function refreshToken(accountId: string): Promise<boolean> {
    const account = await getAccount(accountId)
    if (!account) return false

    const clientConfig = getOAuthClientConfig(account.provider)
    if (!clientConfig) return false

    const newToken = await refreshOAuthToken(
      accountId,
      clientConfig.clientId,
      clientConfig.clientSecret
    )

    return newToken !== null
  }

  // Computed: configured providers
  const configuredProviders = computed<GitOAuthProvider[]>(() => {
    const providers: GitOAuthProvider[] = []
    if (isProviderConfigured("github")) providers.push("github")
    if (isProviderConfigured("gitlab")) providers.push("gitlab")
    if (isProviderConfigured("gitee")) providers.push("gitee")
    if (isProviderConfigured("bitbucket")) providers.push("bitbucket")
    return providers
  })

  return {
    // State
    accounts,
    isLoading,
    isHydrated,
    githubAccounts,
    gitlabAccounts,
    giteeAccounts,
    bitbucketAccounts,
    isAuthenticating,
    authError,
    authProvider,
    configuredProviders,

    // Methods
    authenticate,
    cancelAuthentication,
    disconnect,
    getAccount,
    getAccountForUrl,
    isAuthenticated,
    isProviderConfigured,
    isExpired,
    hasValidToken,
    getAccessToken,
    refreshToken,
    getProviderDisplayName,
  }
}
