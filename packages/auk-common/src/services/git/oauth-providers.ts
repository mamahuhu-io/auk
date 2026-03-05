/**
 * Git OAuth Provider Configurations
 * Defines OAuth endpoints for GitHub, GitLab, Gitee, etc.
 */

import type { GitOAuthConfig, GitOAuthProvider } from "./types"
import { OAUTH_PROVIDER_ENDPOINTS } from "./oauth-endpoints"

/**
 * GitHub OAuth configuration
 */
export const GITHUB_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "github",
  ...OAUTH_PROVIDER_ENDPOINTS.github,
}

/**
 * GitLab OAuth configuration (gitlab.com)
 */
export const GITLAB_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "gitlab",
  ...OAUTH_PROVIDER_ENDPOINTS.gitlab,
}

/**
 * Gitee OAuth configuration
 */
export const GITEE_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "gitee",
  ...OAUTH_PROVIDER_ENDPOINTS.gitee,
}

/**
 * Bitbucket OAuth configuration
 */
export const BITBUCKET_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "bitbucket",
  ...OAUTH_PROVIDER_ENDPOINTS.bitbucket,
}

const OAUTH_PROVIDER_CONFIGS: Record<
  GitOAuthProvider,
  Omit<GitOAuthConfig, "clientId">
> = {
  github: GITHUB_OAUTH_CONFIG,
  gitlab: GITLAB_OAUTH_CONFIG,
  gitee: GITEE_OAUTH_CONFIG,
  bitbucket: BITBUCKET_OAUTH_CONFIG,
}

/**
 * Get OAuth configuration for a provider
 */
export function getOAuthProviderConfig(
  provider: GitOAuthProvider,
  clientId: string,
  clientSecret?: string
): GitOAuthConfig {
  const baseConfig = OAUTH_PROVIDER_CONFIGS[provider]

  return {
    ...baseConfig,
    clientId,
    clientSecret,
  }
}

/**
 * Infer OAuth provider from Git URL
 */
export function inferProviderFromUrl(url: string): GitOAuthProvider | null {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes("github.com")) {
    return "github"
  }
  if (lowerUrl.includes("gitlab.com")) {
    return "gitlab"
  }
  if (lowerUrl.includes("gitee.com")) {
    return "gitee"
  }
  if (lowerUrl.includes("bitbucket.org")) {
    return "bitbucket"
  }

  // Check for self-hosted GitLab indicators
  if (lowerUrl.includes("gitlab")) {
    return "gitlab"
  }

  return null
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: GitOAuthProvider): string {
  switch (provider) {
    case "github":
      return "GitHub"
    case "gitlab":
      return "GitLab"
    case "gitee":
      return "Gitee"
    case "bitbucket":
      return "Bitbucket"
    default:
      return provider
  }
}

/**
 * Check if provider supports PKCE
 * GitHub doesn't require PKCE but supports it
 * GitLab requires PKCE for public clients
 */
export function providerSupportsPKCE(provider: GitOAuthProvider): boolean {
  switch (provider) {
    case "github":
      return true // Optional but supported
    case "gitlab":
      return true // Required for public clients
    case "gitee":
      return false // Not supported
    case "bitbucket":
      return true // Supported
    default:
      return false
  }
}

/**
 * Get default redirect URI for desktop app
 */
export function getDesktopRedirectUri(): string {
  return "io.mamahuhu.auk://oauth/callback"
}
