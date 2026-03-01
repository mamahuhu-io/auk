/**
 * Git OAuth Provider Configurations
 * Defines OAuth endpoints for GitHub, GitLab, Gitee, etc.
 */

import type { GitOAuthConfig, GitOAuthProvider } from "./types"

/**
 * GitHub OAuth configuration
 */
export const GITHUB_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "github",
  scopes: ["repo", "read:user", "user:email"],
  authUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  apiUrl: "https://api.github.com",
  userInfoUrl: "https://api.github.com/user",
}

/**
 * GitLab OAuth configuration (gitlab.com)
 */
export const GITLAB_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "gitlab",
  scopes: ["read_user", "read_repository", "write_repository", "api"],
  authUrl: "https://gitlab.com/oauth/authorize",
  tokenUrl: "https://gitlab.com/oauth/token",
  apiUrl: "https://gitlab.com/api/v4",
  userInfoUrl: "https://gitlab.com/api/v4/user",
}

/**
 * Gitee OAuth configuration
 */
export const GITEE_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "gitee",
  scopes: ["user_info", "projects", "pull_requests", "issues"],
  authUrl: "https://gitee.com/oauth/authorize",
  tokenUrl: "https://gitee.com/oauth/token",
  apiUrl: "https://gitee.com/api/v5",
  userInfoUrl: "https://gitee.com/api/v5/user",
}

/**
 * Bitbucket OAuth configuration
 */
export const BITBUCKET_OAUTH_CONFIG: Omit<GitOAuthConfig, "clientId"> = {
  provider: "bitbucket",
  scopes: ["account", "repository", "repository:write"],
  authUrl: "https://bitbucket.org/site/oauth2/authorize",
  tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
  apiUrl: "https://api.bitbucket.org/2.0",
  userInfoUrl: "https://api.bitbucket.org/2.0/user",
}

/**
 * Get OAuth configuration for a provider
 */
export function getOAuthProviderConfig(
  provider: GitOAuthProvider,
  clientId: string,
  clientSecret?: string
): GitOAuthConfig {
  let baseConfig: Omit<GitOAuthConfig, "clientId">

  switch (provider) {
    case "github":
      baseConfig = GITHUB_OAUTH_CONFIG
      break
    case "gitlab":
      baseConfig = GITLAB_OAUTH_CONFIG
      break
    case "gitee":
      baseConfig = GITEE_OAUTH_CONFIG
      break
    case "bitbucket":
      baseConfig = BITBUCKET_OAUTH_CONFIG
      break
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`)
  }

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
