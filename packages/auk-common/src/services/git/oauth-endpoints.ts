import type { GitOAuthProvider } from "./types"

export interface GitOAuthProviderEndpointConfig {
  scopes: string[]
  authUrl: string
  tokenUrl: string
  apiUrl: string
  userInfoUrl: string
}

export const OAUTH_PROVIDER_ENDPOINTS: Record<
  GitOAuthProvider,
  GitOAuthProviderEndpointConfig
> = {
  github: {
    scopes: ["repo", "read:user", "user:email"],
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    apiUrl: "https://api.github.com",
    userInfoUrl: "https://api.github.com/user",
  },
  gitlab: {
    scopes: ["read_user", "read_repository", "write_repository", "api"],
    authUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    apiUrl: "https://gitlab.com/api/v4",
    userInfoUrl: "https://gitlab.com/api/v4/user",
  },
  gitee: {
    scopes: ["user_info", "projects", "pull_requests", "issues"],
    authUrl: "https://gitee.com/oauth/authorize",
    tokenUrl: "https://gitee.com/oauth/token",
    apiUrl: "https://gitee.com/api/v5",
    userInfoUrl: "https://gitee.com/api/v5/user",
  },
  bitbucket: {
    scopes: ["account", "repository", "repository:write"],
    authUrl: "https://bitbucket.org/site/oauth2/authorize",
    tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
    apiUrl: "https://api.bitbucket.org/2.0",
    userInfoUrl: "https://api.bitbucket.org/2.0/user",
  },
}

export function getOAuthTransportAllowList(): string[] {
  const urls = new Set<string>()
  for (const endpoint of Object.values(OAUTH_PROVIDER_ENDPOINTS)) {
    urls.add(endpoint.tokenUrl)
    urls.add(endpoint.userInfoUrl)
  }
  return [...urls]
}
