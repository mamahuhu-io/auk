/**
 * Git Service Types
 * Defines interfaces for Git operations
 */

/**
 * Result of Git availability check
 */
export interface GitAvailability {
  available: boolean
  version?: string
  error?: string
}

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  untracked: string[]
  conflicted: string[]
}

export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: string[]
  error?: string
  /** Optional status snapshot captured during the sync operation. */
  status?: GitStatus
  /** When true, the OAuth token has expired and the user must re-authenticate. */
  authExpired?: boolean
}

export interface GitRemoteTestResult {
  success: boolean
  error?: string
}

export interface GitCredentials {
  type: "ssh" | "https" | "oauth"
  // SSH
  privateKeyPath?: string
  passphrase?: string
  // HTTPS
  username?: string
  password?: string
  token?: string
  // OAuth
  oauthAccountId?: string
}

/**
 * OAuth provider types
 */
export type GitOAuthProvider = "github" | "gitlab" | "gitee" | "bitbucket"

/**
 * OAuth configuration for a provider
 */
export interface GitOAuthConfig {
  provider: GitOAuthProvider
  clientId: string
  clientSecret?: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
  apiUrl: string
  userInfoUrl: string
}

/**
 * OAuth token information
 */
export interface GitOAuthToken {
  provider: GitOAuthProvider
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  tokenType: string
  scope: string
}

/**
 * OAuth user information
 */
export interface GitOAuthUser {
  provider: GitOAuthProvider
  id: string
  username: string
  email: string
  avatarUrl?: string
  name?: string
}

/**
 * Complete OAuth account (user + token)
 */
export interface GitOAuthAccount {
  id: string
  provider: GitOAuthProvider
  user: GitOAuthUser
  token: GitOAuthToken
  createdAt: Date
  updatedAt: Date
}

/**
 * OAuth authentication state during flow
 */
export interface GitOAuthState {
  provider: GitOAuthProvider
  state: string
  codeVerifier?: string
  redirectUri: string
  config: GitOAuthConfig
  startedAt: number
}

/**
 * Sync history entry for tracking sync operations
 */
export interface SyncHistoryEntry {
  id: string
  timestamp: Date
  operation: "sync" | "pull" | "push"
  result: "success" | "failed" | "conflicts"
  pulled: number
  pushed: number
  conflicts: string[]
  error?: string
  workspaceId: string
  workspaceName?: string
}

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string
  shortHash: string
  message: string
  author: string
  authorEmail: string
  date: Date
  files?: GitCommitFile[]
}

/**
 * File changed in a commit
 */
export interface GitCommitFile {
  path: string
  status: "added" | "modified" | "deleted" | "renamed"
  additions?: number
  deletions?: number
}

/**
 * Git diff information
 */
export interface GitDiff {
  files: GitDiffFile[]
  stats: {
    filesChanged: number
    additions: number
    deletions: number
  }
}

/**
 * Single file diff
 */
export interface GitDiffFile {
  path: string
  status: "added" | "modified" | "deleted" | "renamed"
  oldPath?: string
  additions: number
  deletions: number
  hunks: GitDiffHunk[]
}

/**
 * Diff hunk (chunk of changes)
 */
export interface GitDiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: GitDiffLine[]
}

/**
 * Single line in a diff
 */
export interface GitDiffLine {
  type: "context" | "add" | "delete"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

/**
 * Conflict content with all three versions
 */
export interface ConflictContent {
  ours: string
  theirs: string
  base?: string
  file: string
  markers?: ConflictMarker[]
}

/**
 * Conflict marker positions
 */
export interface ConflictMarker {
  start: number
  middle: number
  end: number
  oursContent: string
  theirsContent: string
}

/**
 * Git branch information
 */
export interface GitBranch {
  name: string
  current: boolean
  remote: boolean
  remoteName?: string
  ahead: number
  behind: number
  lastCommit?: {
    hash: string
    message: string
    date: Date
  }
}

/**
 * Result of branch operations
 */
export interface BranchOperationResult {
  success: boolean
  message?: string
  error?: string
  branch?: string
}

/**
 * Result of merge operation
 */
export interface MergeResult {
  success: boolean
  merged: boolean
  conflicts: string[]
  error?: string
  commitHash?: string
}

export interface GitService {
  // Availability check
  isAvailable(): Promise<GitAvailability>
  testRemote(
    remoteUrl: string,
    credentials?: GitCredentials
  ): Promise<GitRemoteTestResult>

  // Initialize
  init(path: string, branch?: string): Promise<void>
  clone(
    remote: string,
    path: string,
    credentials?: GitCredentials
  ): Promise<void>

  // Status
  status(path: string): Promise<GitStatus>
  isRepo(path: string): Promise<boolean>

  // Sync operations
  pull(path: string, credentials?: GitCredentials): Promise<SyncResult>
  push(path: string, credentials?: GitCredentials): Promise<SyncResult>
  sync(path: string, credentials?: GitCredentials): Promise<SyncResult>
  fetch(path: string, credentials?: GitCredentials): Promise<void>
  remoteBranchExists(
    path: string,
    branch: string,
    credentials?: GitCredentials
  ): Promise<boolean>
  resetToRemoteBranch(
    path: string,
    branch: string,
    credentials?: GitCredentials
  ): Promise<void>

  // Commit operations
  add(path: string, files: string[]): Promise<void>
  addAll(path: string): Promise<void>
  commit(path: string, message: string): Promise<string>
  stashChanges(path: string, message?: string): Promise<void>
  discardChanges(path: string): Promise<void>

  // Conflict handling
  getConflicts(path: string): Promise<string[]>
  resolveConflict(
    path: string,
    file: string,
    resolution: "ours" | "theirs"
  ): Promise<void>
  resolveConflictWithContent(
    path: string,
    file: string,
    content: string
  ): Promise<void>
  continueRebase(path: string): Promise<void>
  abortRebase(path: string): Promise<void>

  // Configuration
  setRemote(path: string, name: string, url: string): Promise<void>
  getRemote(path: string, name: string): Promise<string | null>

  // History and Diff
  getCommitLog(path: string, limit?: number): Promise<GitCommit[]>
  getDiff(path: string, commitHash?: string): Promise<GitDiff>
  getDiffBetween(path: string, fromRef: string, toRef: string): Promise<GitDiff>
  getFileDiff(
    path: string,
    file: string,
    staged?: boolean,
    commitHash?: string
  ): Promise<GitDiffFile>
  getConflictContent(path: string, file: string): Promise<ConflictContent>

  // Branch management
  listBranches(path: string): Promise<GitBranch[]>
  getCurrentBranch(path: string): Promise<string>
  checkoutBranch(path: string, branch: string): Promise<BranchOperationResult>
  createBranch(
    path: string,
    name: string,
    startPoint?: string
  ): Promise<BranchOperationResult>
  deleteBranch(
    path: string,
    name: string,
    force?: boolean
  ): Promise<BranchOperationResult>
  mergeBranch(path: string, branch: string): Promise<MergeResult>
}
