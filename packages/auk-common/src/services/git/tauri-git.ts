/**
 * Tauri Git Service Implementation
 * Uses Tauri's shell plugin to execute git commands
 */

import { fsAPI, pathAPI, shellAPI } from "~/platform/desktop/tauri"
import type {
  GitService,
  GitStatus,
  SyncResult,
  GitCredentials,
  GitAvailability,
  GitCommit,
  GitDiff,
  GitDiffFile,
  GitDiffHunk,
  GitDiffLine,
  ConflictContent,
  GitBranch,
  BranchOperationResult,
  MergeResult,
} from "./types"
import { getValidAccessToken } from "./oauth-auth"

export class TauriGitService implements GitService {
  // Set to true to simulate Git not installed (for testing)
  private readonly DEBUG_SIMULATE_GIT_NOT_INSTALLED = false

  /** Default timeout for local git commands (ms) */
  private readonly LOCAL_TIMEOUT = 30_000
  /** Default timeout for network git commands (ms) */
  private readonly NETWORK_TIMEOUT = 60_000

  /**
   * Execute a git command with a timeout.
   * Uses spawn + event collection + child.kill() so a hung process
   * never blocks the application indefinitely.
   */
  private executeWithTimeout(
    args: string[],
    options?: { cwd?: string; timeoutMs?: number; env?: Record<string, string> }
  ): Promise<{ code: number | null; stdout: string; stderr: string }> {
    const timeoutMs = options?.timeoutMs ?? this.LOCAL_TIMEOUT

    return new Promise((resolve, reject) => {
      const spawnOpts: { cwd?: string; env?: Record<string, string> } = {}
      if (options?.cwd) spawnOpts.cwd = options.cwd
      if (options?.env) spawnOpts.env = options.env

      const command =
        Object.keys(spawnOpts).length > 0
          ? shellAPI.createCommand("git", args, spawnOpts)
          : shellAPI.createCommand("git", args)

      const stdoutChunks: string[] = []
      const stderrChunks: string[] = []
      let timer: ReturnType<typeof setTimeout> | null = null
      let settled = false

      const settle = () => {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        settled = true
      }

      command.stdout.on("data", (line) => stdoutChunks.push(line))
      command.stderr.on("data", (line) => stderrChunks.push(line))

      command.on("close", (payload) => {
        if (settled) return
        settle()
        resolve({
          code: payload.code,
          stdout: stdoutChunks.join(""),
          stderr: stderrChunks.join(""),
        })
      })

      command.on("error", (err) => {
        if (settled) return
        settle()
        reject(new Error(err))
      })

      command
        .spawn()
        .then((child) => {
          if (settled) return
          timer = setTimeout(async () => {
            if (settled) return
            settle()
            try {
              await child.kill()
            } catch {
              /* already exited */
            }
            reject(
              new Error(
                `Git command timed out after ${timeoutMs / 1000}s: git ${args.join(" ")}`
              )
            )
          }, timeoutMs)
        })
        .catch((err) => {
          if (settled) return
          settle()
          reject(err)
        })
    })
  }

  /**
   * Resolve credentials into a username/password pair for HTTPS auth.
   * Returns null when no credentials apply (SSH, missing config, etc.).
   */
  private async resolveCredentials(
    credentials?: GitCredentials
  ): Promise<{ username: string; password: string } | null> {
    if (!credentials) return null

    switch (credentials.type) {
      case "oauth": {
        if (!credentials.oauthAccountId) {
          console.warn("[Git] OAuth account ID not provided")
          return null
        }
        const accessToken = await getValidAccessToken(
          credentials.oauthAccountId
        )
        if (!accessToken) {
          console.error("[Git] Failed to get valid OAuth access token")
          throw new Error(
            "OAuth token expired or invalid. Please re-authenticate."
          )
        }
        return { username: "oauth2", password: accessToken }
      }

      case "https": {
        if (credentials.token) {
          return { username: credentials.token, password: "x-oauth-basic" }
        }
        if (credentials.username && credentials.password) {
          return {
            username: credentials.username,
            password: credentials.password,
          }
        }
        return null
      }

      case "ssh":
      default:
        return null
    }
  }

  /**
   * Build environment variables that inject credentials via GIT_ASKPASS.
   *
   * Instead of embedding tokens in command-line arguments (visible via
   * `ps aux`), we set GIT_ASKPASS to a tiny shell script that echoes
   * the credential from an environment variable.  Git calls the script
   * twice — once for the username, once for the password — and the
   * prompt text lets us distinguish between the two.
   *
   * The credentials only live in the process environment of the child
   * git process and are never written to disk or visible in the
   * process argument list.
   */
  private buildCredentialEnv(cred: {
    username: string
    password: string
  }): Record<string, string> {
    // GIT_ASKPASS script: git invokes it with a prompt like
    //   "Username for 'https://github.com': " or "Password for …"
    // We use `sh -c` with a case on "$1" to return the right value.
    const askpassScript = `sh -c 'case "$1" in *sername*) echo "$GIT_CRED_USERNAME";; *) echo "$GIT_CRED_PASSWORD";; esac'`

    return {
      GIT_ASKPASS: askpassScript,
      GIT_CRED_USERNAME: cred.username,
      GIT_CRED_PASSWORD: cred.password,
      // Prevent git from using any system credential helpers
      GIT_TERMINAL_PROMPT: "0",
    }
  }

  /**
   * Run a git operation with credentials injected via environment variables.
   *
   * The callback receives `authEnv` — a Record of env vars to pass to the
   * git process.  If no credentials are needed the record is empty.
   */
  private async withAuthenticatedRemote<T>(
    path: string,
    credentials: GitCredentials | undefined,
    operation: (
      authArgs: string[],
      authEnv: Record<string, string>
    ) => Promise<T>
  ): Promise<T> {
    if (!credentials || credentials.type === "ssh") {
      return operation([], {})
    }

    try {
      const cred = await this.resolveCredentials(credentials)
      if (!cred) {
        return operation([], {})
      }
      const env = this.buildCredentialEnv(cred)
      return operation([], env)
    } catch (error) {
      if (error instanceof Error && error.message.includes("OAuth")) {
        throw error
      }
      console.error("[Git] Failed to resolve credentials:", error)
      return operation([], {})
    }
  }

  /**
   * Check if Git is available on the system
   */
  async isAvailable(): Promise<GitAvailability> {
    // Debug: simulate Git not installed
    if (this.DEBUG_SIMULATE_GIT_NOT_INSTALLED) {
      console.warn("[Git] DEBUG: Simulating Git not installed")
      return {
        available: false,
        error: "Git is not installed or not in PATH",
      }
    }

    try {
      const output = await this.executeWithTimeout(["--version"])

      if (output.code === 0) {
        // Parse version from output like "git version 2.39.0"
        const versionMatch = output.stdout.match(/git version (\S+)/)
        const version = versionMatch ? versionMatch[1] : undefined

        console.log("[Git] Git is available, version:", version)
        return {
          available: true,
          version,
        }
      }

      console.warn("[Git] Git command failed:", output.stderr)
      return {
        available: false,
        error: output.stderr || "Git command failed",
      }
    } catch (error) {
      console.warn("[Git] Git is not available:", error)
      return {
        available: false,
        error:
          error instanceof Error
            ? error.message
            : "Git is not installed or not in PATH",
      }
    }
  }

  async testRemote(
    remoteUrl: string,
    credentials?: GitCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cred = await this.resolveCredentials(credentials)
      const env = cred ? this.buildCredentialEnv(cred) : undefined
      const result = await this.execGitNoCwd(
        ["ls-remote", "--heads", remoteUrl],
        this.NETWORK_TIMEOUT,
        env
      )
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: result.stderr || result.stdout || "Failed to connect to remote",
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to remote",
      }
    }
  }

  /**
   * Execute a git command and return the output
   */
  private async execGit(
    path: string,
    args: string[],
    timeoutMs?: number,
    env?: Record<string, string>
  ): Promise<string> {
    console.log("[Git] Executing:", "git", args.join(" "), "in", path)

    const output = await this.executeWithTimeout(args, {
      cwd: path,
      timeoutMs,
      env,
    })

    if (output.code !== 0) {
      const error = output.stderr || output.stdout || "Unknown git error"
      console.error("[Git] Error:", error)
      throw new Error(error)
    }

    console.log("[Git] Output:", output.stdout)
    return output.stdout
  }

  /**
   * Execute a git command without setting a working directory
   * Useful for operations that don't require a repo
   */
  private async execGitNoCwd(
    args: string[],
    timeoutMs?: number,
    env?: Record<string, string>
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    console.log("[Git] Executing (no cwd):", "git", args.join(" "))

    const output = await this.executeWithTimeout(args, { timeoutMs, env })

    return {
      success: output.code === 0,
      stdout: output.stdout,
      stderr: output.stderr,
    }
  }

  /**
   * Execute a git command without throwing on error
   */
  private async execGitSafe(
    path: string,
    args: string[],
    timeoutMs?: number,
    env?: Record<string, string>
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    console.log("[Git] Executing (safe):", "git", args.join(" "), "in", path)

    const output = await this.executeWithTimeout(args, {
      cwd: path,
      timeoutMs,
      env,
    })

    return {
      success: output.code === 0,
      stdout: output.stdout,
      stderr: output.stderr,
    }
  }

  async init(path: string, branch?: string): Promise<void> {
    await this.execGit(path, ["init"])

    // Create .gitignore using Tauri FS API (cross-platform)
    const gitignoreContent = `# Secrets
*.secret.json
secrets/

# Local state
.local/
*.local.json

# System files
.DS_Store
Thumbs.db`

    const gitignorePath = await pathAPI.join(path, ".gitignore")
    await fsAPI.writeTextFile(gitignorePath, gitignoreContent)

    await this.execGit(path, ["add", ".gitignore"])
    await this.execGit(path, ["commit", "-m", "Initial commit"])

    // Rename branch if specified
    if (branch) {
      await this.execGit(path, ["branch", "-m", branch])
    }
  }

  async clone(
    remote: string,
    path: string,
    credentials?: GitCredentials
  ): Promise<void> {
    const cred = await this.resolveCredentials(credentials)
    const env = cred ? this.buildCredentialEnv(cred) : undefined

    // Clone to parent directory with target folder name (cross-platform)
    const targetDir = await pathAPI.basename(path)
    const parentDir = await pathAPI.dirname(path)

    const output = await this.executeWithTimeout(["clone", remote, targetDir], {
      cwd: parentDir,
      timeoutMs: this.NETWORK_TIMEOUT,
      env,
    })

    if (output.code !== 0) {
      throw new Error(output.stderr || "Clone failed")
    }
  }

  async status(path: string): Promise<GitStatus> {
    // Parse branch + ahead/behind + file status in one command when available.
    let statusResult = await this.execGitSafe(path, [
      "status",
      "--porcelain=v2",
      "--branch",
    ])
    const usingPorcelainV2 = statusResult.success
    if (!statusResult.success) {
      statusResult = await this.execGitSafe(path, [
        "status",
        "--porcelain",
        "-b",
      ])
    }
    if (!statusResult.success) {
      throw new Error(statusResult.stderr || "Failed to get git status")
    }

    let branch = "main"
    let ahead = 0
    let behind = 0
    let hasAheadBehindInfo = false

    const staged: string[] = []
    const modified: string[] = []
    const untracked: string[] = []
    const conflicted: string[] = []
    const pushStatus = (x: string, y: string, file: string) => {
      if (!file) return

      // Conflicted files
      if (
        x === "U" ||
        y === "U" ||
        (x === "A" && y === "A") ||
        (x === "D" && y === "D")
      ) {
        conflicted.push(file)
      }
      // Staged files
      else if (x !== " " && x !== "." && x !== "?") {
        staged.push(file)
      }
      // Modified files (not staged)
      else if (y === "M" || y === "D") {
        modified.push(file)
      }
      // Untracked files
      else if (x === "?" && y === "?") {
        untracked.push(file)
      }
    }

    for (const rawLine of statusResult.stdout.split("\n")) {
      const line = rawLine.trimEnd()
      if (!line) continue

      if (usingPorcelainV2) {
        if (line.startsWith("# branch.head ")) {
          const head = line.slice("# branch.head ".length).trim()
          if (head && head !== "(detached)") {
            branch = head
          } else if (head === "(detached)") {
            branch = "HEAD"
          }
          continue
        }

        if (line.startsWith("# branch.ab ")) {
          const abMatch = line.match(/^\# branch\.ab \+(\d+) \-(\d+)$/)
          if (abMatch) {
            ahead = parseInt(abMatch[1]) || 0
            behind = parseInt(abMatch[2]) || 0
            hasAheadBehindInfo = true
          }
          continue
        }

        if (line.startsWith("u ")) {
          const parts = line.split(" ")
          const file = parts.slice(10).join(" ").trim()
          if (file) conflicted.push(file)
          continue
        }

        if (line.startsWith("? ")) {
          const file = line.slice(2).trim()
          if (file) untracked.push(file)
          continue
        }

        if (line.startsWith("1 ")) {
          const parts = line.split(" ")
          const xy = parts[1] || ".."
          const file = parts.slice(8).join(" ").trim()
          pushStatus(xy[0] ?? ".", xy[1] ?? ".", file)
          continue
        }

        if (line.startsWith("2 ")) {
          const parts = line.split("\t")
          const toPath = parts[parts.length - 1]?.trim()
          const meta = parts[0].split(" ")
          const xy = meta[1] || ".."
          pushStatus(xy[0] ?? ".", xy[1] ?? ".", toPath)
        }

        continue
      }

      if (line.startsWith("## ")) {
        const branchLine = line.slice(3).trim()
        const headPart = branchLine.split("...")[0].trim()
        if (headPart.startsWith("HEAD")) {
          branch = "HEAD"
        } else if (headPart) {
          branch = headPart
        }

        const aheadMatch = branchLine.match(/ahead (\d+)/)
        const behindMatch = branchLine.match(/behind (\d+)/)
        if (aheadMatch) ahead = parseInt(aheadMatch[1]) || 0
        if (behindMatch) behind = parseInt(behindMatch[1]) || 0
        if (aheadMatch || behindMatch) hasAheadBehindInfo = true
        continue
      }

      const indexStatus = line[0]
      const workTreeStatus = line[1]
      const file = line.slice(3).trim()
      pushStatus(indexStatus, workTreeStatus, file)
    }

    // Keep old behavior for repos without upstream config by probing origin/<branch>.
    if (!hasAheadBehindInfo && branch !== "HEAD") {
      const trackingResult = await this.execGitSafe(path, [
        "rev-list",
        "--left-right",
        "--count",
        `${branch}...origin/${branch}`,
      ])
      if (trackingResult.success) {
        const parts = trackingResult.stdout.trim().split(/\s+/)
        ahead = parseInt(parts[0]) || 0
        behind = parseInt(parts[1]) || 0
      }
    }

    if (conflicted.length === 0) {
      conflicted.push(...(await this.getUnmergedFiles(path)))
    }

    return {
      branch,
      ahead,
      behind,
      staged,
      modified,
      untracked,
      conflicted,
    }
  }

  private async getUnmergedFiles(path: string): Promise<string[]> {
    const lsFilesResult = await this.execGitSafe(path, ["ls-files", "-u"])
    if (!lsFilesResult.success || !lsFilesResult.stdout.trim()) {
      return []
    }

    const files = new Set<string>()
    for (const line of lsFilesResult.stdout.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const parts = trimmed.split(/\s+/)
      const filePath = parts[parts.length - 1]
      if (filePath) files.add(filePath)
    }

    return [...files]
  }

  async isRepo(path: string): Promise<boolean> {
    const result = await this.execGitSafe(path, [
      "rev-parse",
      "--is-inside-work-tree",
    ])
    return result.success && result.stdout.trim() === "true"
  }

  async pull(path: string, credentials?: GitCredentials): Promise<SyncResult> {
    try {
      // Get current branch
      const branchResult = await this.execGitSafe(path, [
        "rev-parse",
        "--abbrev-ref",
        "HEAD",
      ])
      const currentBranch = branchResult.success
        ? branchResult.stdout.trim()
        : "master"

      // Check if tracking is set up
      const trackingResult = await this.execGitSafe(path, [
        "config",
        `branch.${currentBranch}.remote`,
      ])

      if (!trackingResult.success || !trackingResult.stdout.trim()) {
        // No tracking set up, try to set it up
        console.log("[Git] Setting up tracking for branch:", currentBranch)

        // First fetch to get remote branches (with auth)
        await this.withAuthenticatedRemote(
          path,
          credentials,
          async (_authArgs, authEnv) => {
            await this.execGitSafe(
              path,
              ["fetch", "origin"],
              this.NETWORK_TIMEOUT,
              authEnv
            )
          }
        )

        // Check if remote branch exists
        const remoteBranchResult = await this.withAuthenticatedRemote(
          path,
          credentials,
          async (_authArgs, authEnv) => {
            return await this.execGitSafe(
              path,
              ["ls-remote", "--heads", "origin", currentBranch],
              this.NETWORK_TIMEOUT,
              authEnv
            )
          }
        )

        if (remoteBranchResult.success && remoteBranchResult.stdout.trim()) {
          // Remote branch exists, set up tracking
          await this.execGitSafe(path, [
            "branch",
            "--set-upstream-to",
            `origin/${currentBranch}`,
            currentBranch,
          ])
        } else {
          // Remote branch doesn't exist, push to create it
          console.log("[Git] Remote branch doesn't exist, pushing to create it")
          await this.withAuthenticatedRemote(
            path,
            credentials,
            async (_authArgs, authEnv) => {
              await this.execGit(
                path,
                ["push", "-u", "origin", currentBranch],
                this.NETWORK_TIMEOUT,
                authEnv
              )
            }
          )
          return {
            success: true,
            pulled: 0,
            pushed: 1,
            conflicts: [],
          }
        }
      }

      // Pull with authentication
      const output = await this.withAuthenticatedRemote(
        path,
        credentials,
        async (_authArgs, authEnv) => {
          return await this.execGit(
            path,
            ["pull", "--rebase"],
            this.NETWORK_TIMEOUT,
            authEnv
          )
        }
      )

      // Parse pull output to get number of changes
      const changesMatch = output.match(/(\d+) files? changed/)
      const pulled = changesMatch ? parseInt(changesMatch[1]) : 0

      return {
        success: true,
        pulled,
        pushed: 0,
        conflicts: [],
      }
    } catch (error) {
      const conflicts = await this.getUnmergedFiles(path)

      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts,
        error: String(error),
        authExpired:
          error instanceof Error &&
          error.message.includes("OAuth token expired"),
      }
    }
  }

  private async pushWithKnownAhead(
    path: string,
    credentials: GitCredentials | undefined,
    pushed: number,
    statusBeforePush?: GitStatus
  ): Promise<SyncResult> {
    try {
      // Push with authentication
      await this.withAuthenticatedRemote(
        path,
        credentials,
        async (_authArgs, authEnv) => {
          await this.execGit(path, ["push"], this.NETWORK_TIMEOUT, authEnv)
        }
      )

      return {
        success: true,
        pulled: 0,
        pushed,
        conflicts: [],
        status: statusBeforePush
          ? {
              ...statusBeforePush,
              ahead: 0,
            }
          : undefined,
      }
    } catch (error) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        error: String(error),
        authExpired:
          error instanceof Error &&
          error.message.includes("OAuth token expired"),
      }
    }
  }

  async push(path: string, credentials?: GitCredentials): Promise<SyncResult> {
    // Get ahead count before push
    const statusBefore = await this.status(path)
    return this.pushWithKnownAhead(
      path,
      credentials,
      statusBefore.ahead,
      statusBefore
    )
  }

  async sync(path: string, credentials?: GitCredentials): Promise<SyncResult> {
    // Check if we're in the middle of a rebase
    const isRebasing = await this.isRebaseInProgress(path)
    if (isRebasing) {
      console.log("[Git] Rebase in progress, checking status...")
      const status = await this.status(path)

      if (status.conflicted.length > 0) {
        // Still have conflicts
        return {
          success: false,
          pulled: 0,
          pushed: 0,
          conflicts: status.conflicted,
          error:
            "Rebase in progress with conflicts. Please resolve conflicts first.",
        }
      }

      // No conflicts, try to continue or abort
      if (status.staged.length > 0) {
        // Has staged changes, try to continue rebase
        try {
          console.log("[Git] Continuing interrupted rebase...")
          await this.continueRebase(path)
        } catch (e) {
          console.error("[Git] Failed to continue rebase, aborting...", e)
          await this.abortRebase(path)
        }
      } else {
        // No staged changes, abort rebase
        console.log("[Git] Aborting stale rebase...")
        await this.abortRebase(path)
      }
    }

    // First, check status and auto-commit local changes
    const status = await this.status(path)

    if (status.modified.length > 0 || status.untracked.length > 0) {
      await this.addAll(path)
      await this.commit(path, "Auto-sync: Update collections and environments")
    }

    // Pull
    const pullResult = await this.pull(path, credentials)
    if (!pullResult.success) {
      return pullResult
    }

    // Check for conflicts after pull
    const statusAfterPull = await this.status(path)
    if (statusAfterPull.conflicted.length > 0) {
      return {
        success: false,
        pulled: pullResult.pulled,
        pushed: 0,
        conflicts: statusAfterPull.conflicted,
        error: "Conflicts detected",
      }
    }

    // Push
    const pushResult = await this.pushWithKnownAhead(
      path,
      credentials,
      statusAfterPull.ahead
    )

    return {
      success: pushResult.success,
      pulled: pullResult.pulled,
      pushed: pushResult.pushed,
      conflicts: [],
      status: pushResult.success
        ? {
            ...statusAfterPull,
            ahead: 0,
            behind: 0,
          }
        : undefined,
      error: pushResult.error,
    }
  }

  /**

             * Check if a rebase is in progress (cross-platform using Tauri FS API)

             */

  async isRebaseInProgress(path: string): Promise<boolean> {
    try {
      // Check for rebase-merge or rebase-apply directories
      const rebaseMergePath = await pathAPI.join(path, ".git", "rebase-merge")
      const rebaseApplyPath = await pathAPI.join(path, ".git", "rebase-apply")

      const [rebaseMergeExists, rebaseApplyExists] = await Promise.all([
        this.dirExists(rebaseMergePath),
        this.dirExists(rebaseApplyPath),
      ])

      return rebaseMergeExists || rebaseApplyExists
    } catch {
      return false
    }
  }

  /**
   * Check if a directory exists
   */
  private async dirExists(path: string): Promise<boolean> {
    try {
      const pathExists = await fsAPI.exists(path)
      if (!pathExists) return false
      const info = await fsAPI.stat(path)
      return info.isDirectory
    } catch {
      return false
    }
  }

  async add(path: string, files: string[]): Promise<void> {
    if (files.length === 0) return
    await this.execGit(path, ["add", ...files])
  }

  async addAll(path: string): Promise<void> {
    await this.execGit(path, ["add", "-A"])
  }

  async commit(path: string, message: string): Promise<string> {
    const output = await this.execGit(path, ["commit", "-m", message])

    // Extract commit hash from output
    const hashMatch = output.match(/\[[\w-]+ ([a-f0-9]+)\]/)
    return hashMatch ? hashMatch[1] : ""
  }

  async stashChanges(path: string, message?: string): Promise<void> {
    const args = ["stash", "push", "-u"]
    if (message) {
      args.push("-m", message)
    }
    const result = await this.execGitSafe(path, args)
    if (!result.success) {
      const combined = `${result.stderr} ${result.stdout}`.trim()
      if (combined.includes("No local changes to save")) return
      throw new Error(combined || "Failed to stash changes")
    }
  }

  async discardChanges(path: string): Promise<void> {
    await this.execGit(path, ["reset", "--hard"])
    await this.execGit(path, ["clean", "-fd"])
  }

  async getConflicts(path: string): Promise<string[]> {
    const status = await this.status(path)
    return status.conflicted
  }

  async resolveConflict(
    path: string,
    file: string,
    resolution: "ours" | "theirs"
  ): Promise<void> {
    // During rebase, --ours and --theirs are REVERSED compared to merge!
    // Rebase: --ours = remote (branch we're rebasing onto), --theirs = local (our commits)
    // Merge:  --ours = local (current branch), --theirs = remote (branch being merged)
    // We swap only in rebase context so "ours" always means local to the user.
    const rebasing = await this.isRebaseInProgress(path)

    if (rebasing) {
      if (resolution === "ours") {
        console.log(
          "[Git] Resolving conflict with LOCAL version (--theirs in rebase)"
        )
        await this.execGit(path, ["checkout", "--theirs", file])
      } else {
        console.log(
          "[Git] Resolving conflict with REMOTE version (--ours in rebase)"
        )
        await this.execGit(path, ["checkout", "--ours", file])
      }
    } else {
      // Merge context: --ours = local, --theirs = remote — no swap needed
      if (resolution === "ours") {
        console.log(
          "[Git] Resolving conflict with LOCAL version (--ours in merge)"
        )
        await this.execGit(path, ["checkout", "--ours", file])
      } else {
        console.log(
          "[Git] Resolving conflict with REMOTE version (--theirs in merge)"
        )
        await this.execGit(path, ["checkout", "--theirs", file])
      }
    }

    await this.execGit(path, ["add", file])
  }

  async resolveConflictWithContent(
    path: string,
    file: string,
    content: string
  ): Promise<void> {
    const filePath = await pathAPI.join(path, file)
    await fsAPI.writeTextFile(filePath, content)
    await this.execGit(path, ["add", file])
  }

  async continueRebase(path: string): Promise<void> {
    console.log("[Git] Continuing rebase")

    // Check if there are still conflicts
    const status = await this.status(path)
    if (status.conflicted.length > 0) {
      throw new Error(
        `Still have ${status.conflicted.length} unresolved conflicts`
      )
    }

    // Use -c core.editor=true to skip editor (cross-platform, no shell env vars needed)
    const result = await this.execGitSafe(path, [
      "-c",
      "core.editor=true",
      "rebase",
      "--continue",
    ])

    if (!result.success) {
      throw new Error(result.stderr || "Failed to continue rebase")
    }

    console.log("[Git] Rebase continue result:", result.stdout)
  }

  async abortRebase(path: string): Promise<void> {
    console.log("[Git] Aborting rebase")
    await this.execGit(path, ["rebase", "--abort"])
  }

  async setRemote(path: string, name: string, url: string): Promise<void> {
    // Try to set URL first, if remote exists
    const result = await this.execGitSafe(path, [
      "remote",
      "set-url",
      name,
      url,
    ])

    if (!result.success) {
      // Remote doesn't exist, add it
      await this.execGit(path, ["remote", "add", name, url])
    }
  }

  async getRemote(path: string, name: string): Promise<string | null> {
    const result = await this.execGitSafe(path, ["remote", "get-url", name])

    if (result.success) {
      return result.stdout.trim()
    }

    return null
  }

  async fetch(path: string, credentials?: GitCredentials): Promise<void> {
    await this.withAuthenticatedRemote(
      path,
      credentials,
      async (_authArgs, authEnv) => {
        await this.execGitSafe(
          path,
          ["fetch", "origin"],
          this.NETWORK_TIMEOUT,
          authEnv
        )
      }
    )
  }

  async remoteBranchExists(
    path: string,
    branch: string,
    credentials?: GitCredentials
  ): Promise<boolean> {
    const result = await this.withAuthenticatedRemote(
      path,
      credentials,
      async (_authArgs, authEnv) => {
        return await this.execGitSafe(
          path,
          ["ls-remote", "--heads", "origin", branch],
          this.NETWORK_TIMEOUT,
          authEnv
        )
      }
    )
    return result.success && result.stdout.trim().length > 0
  }

  async resetToRemoteBranch(
    path: string,
    branch: string,
    credentials?: GitCredentials
  ): Promise<void> {
    // Check if remote branch has any commits
    const result = await this.withAuthenticatedRemote(
      path,
      credentials,
      async (_authArgs, _authEnv) => {
        return await this.execGitSafe(path, ["rev-parse", `origin/${branch}`])
      }
    )

    if (result.success && result.stdout.trim()) {
      // Remote branch exists and has commits, reset to it
      console.log(`[Git] Resetting to origin/${branch}`)
      await this.execGit(path, ["reset", "--hard", `origin/${branch}`])

      // Set up tracking
      await this.execGitSafe(path, [
        "branch",
        "--set-upstream-to",
        `origin/${branch}`,
        branch,
      ])
    } else {
      console.log(`[Git] Remote branch origin/${branch} has no commits yet`)
    }
  }

  // ============ History and Diff Methods ============

  async getCommitLog(path: string, limit: number = 50): Promise<GitCommit[]> {
    const format = "%H%n%h%n%s%n%an%n%ae%n%aI%n---COMMIT_END---"
    const result = await this.execGitSafe(path, [
      "log",
      `--pretty=format:${format}`,
      `-n`,
      String(limit),
    ])

    if (!result.success) {
      console.warn("[Git] Failed to get commit log:", result.stderr)
      return []
    }

    const commits: GitCommit[] = []
    const commitBlocks = result.stdout.split("---COMMIT_END---")

    for (const block of commitBlocks) {
      const lines = block.trim().split("\n")
      if (lines.length >= 6) {
        commits.push({
          hash: lines[0],
          shortHash: lines[1],
          message: lines[2],
          author: lines[3],
          authorEmail: lines[4],
          date: new Date(lines[5]),
        })
      }
    }

    return commits
  }

  async getDiff(path: string, commitHash?: string): Promise<GitDiff> {
    let args: string[]

    if (commitHash) {
      // Diff for specific commit
      args = ["diff", `${commitHash}^`, commitHash, "--stat", "--numstat"]
    } else {
      // Diff for working directory (staged + unstaged)
      args = ["diff", "HEAD", "--stat", "--numstat"]
    }

    const result = await this.execGitSafe(path, args)

    const files: GitDiffFile[] = []
    let totalAdditions = 0
    let totalDeletions = 0

    if (result.success && result.stdout.trim()) {
      // Parse numstat output (additions, deletions, filename)
      const lines = result.stdout.trim().split("\n")
      for (const line of lines) {
        const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/)
        if (match) {
          const additions = match[1] === "-" ? 0 : parseInt(match[1])
          const deletions = match[2] === "-" ? 0 : parseInt(match[2])
          const filePath = match[3]

          totalAdditions += additions
          totalDeletions += deletions

          files.push({
            path: filePath,
            status: "modified",
            additions,
            deletions,
            hunks: [],
          })
        }
      }
    }

    return {
      files,
      stats: {
        filesChanged: files.length,
        additions: totalAdditions,
        deletions: totalDeletions,
      },
    }
  }

  async getDiffBetween(
    path: string,
    fromRef: string,
    toRef: string
  ): Promise<GitDiff> {
    const args = ["diff", fromRef, toRef, "--stat", "--numstat"]
    const result = await this.execGitSafe(path, args)

    const files: GitDiffFile[] = []
    let totalAdditions = 0
    let totalDeletions = 0

    if (result.success && result.stdout.trim()) {
      const lines = result.stdout.trim().split("\n")
      for (const line of lines) {
        const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/)
        if (match) {
          const additions = match[1] === "-" ? 0 : parseInt(match[1])
          const deletions = match[2] === "-" ? 0 : parseInt(match[2])
          const filePath = match[3]

          totalAdditions += additions
          totalDeletions += deletions

          files.push({
            path: filePath,
            status: "modified",
            additions,
            deletions,
            hunks: [],
          })
        }
      }
    }

    return {
      files,
      stats: {
        filesChanged: files.length,
        additions: totalAdditions,
        deletions: totalDeletions,
      },
    }
  }

  async getFileDiff(
    path: string,
    file: string,
    staged: boolean = false,
    commitHash?: string
  ): Promise<GitDiffFile> {
    let args: string[]
    if (commitHash) {
      args = ["diff", `${commitHash}^`, commitHash, "--unified=3", "--", file]
    } else {
      args = staged
        ? ["diff", "--cached", "--unified=3", "--", file]
        : ["diff", "--unified=3", "--", file]
    }

    const result = await this.execGitSafe(path, args)

    const hunks: GitDiffHunk[] = []
    let additions = 0
    let deletions = 0

    if (result.success && result.stdout.trim()) {
      // Parse unified diff format
      const lines = result.stdout.split("\n")
      let currentHunk: GitDiffHunk | null = null
      let oldLineNum = 0
      let newLineNum = 0

      for (const line of lines) {
        // Parse hunk header: @@ -start,count +start,count @@
        const hunkMatch = line.match(
          /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/
        )
        if (hunkMatch) {
          if (currentHunk) {
            hunks.push(currentHunk)
          }
          oldLineNum = parseInt(hunkMatch[1])
          newLineNum = parseInt(hunkMatch[3])
          currentHunk = {
            oldStart: oldLineNum,
            oldLines: parseInt(hunkMatch[2] || "1"),
            newStart: newLineNum,
            newLines: parseInt(hunkMatch[4] || "1"),
            header: line,
            lines: [],
          }
          continue
        }

        if (currentHunk) {
          const diffLine: GitDiffLine = {
            type: "context",
            content: line.slice(1),
          }

          if (line.startsWith("+")) {
            diffLine.type = "add"
            diffLine.newLineNumber = newLineNum++
            additions++
          } else if (line.startsWith("-")) {
            diffLine.type = "delete"
            diffLine.oldLineNumber = oldLineNum++
            deletions++
          } else if (line.startsWith(" ")) {
            diffLine.type = "context"
            diffLine.oldLineNumber = oldLineNum++
            diffLine.newLineNumber = newLineNum++
          }

          currentHunk.lines.push(diffLine)
        }
      }

      if (currentHunk) {
        hunks.push(currentHunk)
      }
    }

    return {
      path: file,
      status: "modified",
      additions,
      deletions,
      hunks,
    }
  }

  async getConflictContent(
    path: string,
    file: string
  ): Promise<ConflictContent> {
    // Git stage :2 = ours, :3 = theirs
    // Rebase: :2 = remote (branch rebasing onto), :3 = local (our commits) — need swap
    // Merge:  :2 = local (current branch), :3 = remote (branch being merged) — no swap
    const stage2Result = await this.execGitSafe(path, ["show", `:2:${file}`])
    const stage3Result = await this.execGitSafe(path, ["show", `:3:${file}`])
    const baseResult = await this.execGitSafe(path, ["show", `:1:${file}`])

    const rebasing = await this.isRebaseInProgress(path)

    const stage2 = stage2Result.success ? stage2Result.stdout : ""
    const stage3 = stage3Result.success ? stage3Result.stdout : ""

    return {
      file,
      ours: rebasing ? stage3 : stage2,
      theirs: rebasing ? stage2 : stage3,
      base: baseResult.success ? baseResult.stdout : undefined,
    }
  }

  // ============ Branch Management Methods ============

  async listBranches(path: string): Promise<GitBranch[]> {
    // Get all branches with verbose info
    const localResult = await this.execGitSafe(path, [
      "branch",
      "-v",
      "--format=%(refname:short)|%(objectname:short)|%(subject)|%(upstream:short)|%(upstream:track)|%(creatordate:iso-strict)",
    ])

    const remoteResult = await this.execGitSafe(path, [
      "branch",
      "-r",
      "--format=%(refname:short)|%(objectname:short)|%(subject)|%(creatordate:iso-strict)",
    ])

    const currentBranchResult = await this.execGitSafe(path, [
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ])
    const currentBranch = currentBranchResult.success
      ? currentBranchResult.stdout.trim()
      : ""

    const branches: GitBranch[] = []

    // Parse local branches
    if (localResult.success) {
      for (const line of localResult.stdout.trim().split("\n")) {
        if (!line.trim()) continue

        const parts = line.split("|")
        const name = parts[0]
        const hash = parts[1]
        const dateStr = parts[parts.length - 1] || ""
        const track = parts[parts.length - 2] || ""
        const upstream = parts[parts.length - 3] || ""
        const message = parts.slice(2, parts.length - 3).join("|")
        const date = new Date(dateStr)

        // Parse ahead/behind from track info like "[ahead 2, behind 1]"
        let ahead = 0
        let behind = 0
        const trackMatch = track.match(/ahead (\d+)/)
        const behindMatch = track.match(/behind (\d+)/)
        if (trackMatch) ahead = parseInt(trackMatch[1])
        if (behindMatch) behind = parseInt(behindMatch[1])

        branches.push({
          name,
          current: name === currentBranch,
          remote: false,
          remoteName: upstream || undefined,
          ahead,
          behind,
          lastCommit: {
            hash,
            message,
            date: Number.isNaN(date.getTime()) ? new Date(0) : date,
          },
        })
      }
    }

    // Parse remote branches
    if (remoteResult.success) {
      for (const line of remoteResult.stdout.trim().split("\n")) {
        if (!line.trim()) continue

        const parts = line.split("|")
        const name = parts[0]
        const hash = parts[1]
        const dateStr = parts[parts.length - 1] || ""
        const message = parts.slice(2, parts.length - 1).join("|")
        const date = new Date(dateStr)

        // Skip HEAD pointer and the remote itself if listed
        if (name.endsWith("/HEAD") || name === "origin") continue

        branches.push({
          name,
          current: false,
          remote: true,
          ahead: 0,
          behind: 0,
          lastCommit: {
            hash,
            message,
            date: Number.isNaN(date.getTime()) ? new Date(0) : date,
          },
        })
      }
    }

    return branches
  }

  async getCurrentBranch(path: string): Promise<string> {
    const result = await this.execGitSafe(path, [
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ])
    return result.success ? result.stdout.trim() : "main"
  }

  async checkoutBranch(
    path: string,
    branch: string
  ): Promise<BranchOperationResult> {
    // Check for uncommitted changes
    const status = await this.status(path)
    if (
      status.modified.length > 0 ||
      status.staged.length > 0 ||
      status.untracked.length > 0
    ) {
      return {
        success: false,
        error:
          "You have uncommitted changes. Please commit or stash them first.",
        branch,
      }
    }

    // Handle remote branches (origin/...) to avoid detached HEAD
    if (branch.startsWith("origin/")) {
      const localBranch = branch.replace("origin/", "")

      // Check if local branch exists
      const localCheck = await this.execGitSafe(path, [
        "rev-parse",
        "--verify",
        `refs/heads/${localBranch}`,
      ])

      if (localCheck.success) {
        // Checkout existing local branch
        const result = await this.execGitSafe(path, ["checkout", localBranch])
        if (result.success) {
          return {
            success: true,
            message: `Switched to branch '${localBranch}'`,
            branch: localBranch,
          }
        }
      } else {
        // Create new local branch tracking remote
        const trackResult = await this.execGitSafe(path, [
          "checkout",
          "-b",
          localBranch,
          "--track",
          branch,
        ])

        if (trackResult.success) {
          return {
            success: true,
            message: `Created and switched to branch '${localBranch}' tracking '${branch}'`,
            branch: localBranch,
          }
        }
      }
    }

    const result = await this.execGitSafe(path, ["checkout", branch])

    if (result.success) {
      return {
        success: true,
        message: `Switched to branch '${branch}'`,
        branch,
      }
    }

    return {
      success: false,
      error: result.stderr || "Failed to checkout branch",
      branch,
    }
  }

  async createBranch(
    path: string,
    name: string,
    startPoint?: string
  ): Promise<BranchOperationResult> {
    const args = ["checkout", "-b", name]
    if (startPoint) {
      args.push(startPoint)
    }

    const result = await this.execGitSafe(path, args)

    if (result.success) {
      return {
        success: true,
        message: `Created and switched to branch '${name}'`,
        branch: name,
      }
    }

    return {
      success: false,
      error: result.stderr || "Failed to create branch",
      branch: name,
    }
  }

  async deleteBranch(
    path: string,
    name: string,
    force: boolean = false
  ): Promise<BranchOperationResult> {
    // Don't allow deleting current branch
    const currentBranch = await this.getCurrentBranch(path)
    if (name === currentBranch) {
      return {
        success: false,
        error: "Cannot delete the currently checked out branch",
        branch: name,
      }
    }

    const args = ["branch", force ? "-D" : "-d", name]
    const result = await this.execGitSafe(path, args)

    if (result.success) {
      return {
        success: true,
        message: `Deleted branch '${name}'`,
        branch: name,
      }
    }

    return {
      success: false,
      error: result.stderr || "Failed to delete branch",
      branch: name,
    }
  }

  async mergeBranch(path: string, branch: string): Promise<MergeResult> {
    // Check for uncommitted changes
    const status = await this.status(path)
    if (status.modified.length > 0 || status.staged.length > 0) {
      return {
        success: false,
        merged: false,
        conflicts: [],
        error:
          "You have uncommitted changes. Please commit or stash them first.",
      }
    }

    const result = await this.execGitSafe(path, ["merge", branch])

    if (result.success) {
      // Get the merge commit hash
      const hashResult = await this.execGitSafe(path, ["rev-parse", "HEAD"])
      return {
        success: true,
        merged: true,
        conflicts: [],
        commitHash: hashResult.success ? hashResult.stdout.trim() : undefined,
      }
    }

    // Check for conflicts
    const statusAfter = await this.status(path)
    if (statusAfter.conflicted.length > 0) {
      return {
        success: false,
        merged: false,
        conflicts: statusAfter.conflicted,
        error: "Merge conflicts detected",
      }
    }

    return {
      success: false,
      merged: false,
      conflicts: [],
      error: result.stderr || "Merge failed",
    }
  }
}

// Export singleton instance
let gitServiceInstance: GitService | null = null

export function getGitService(): GitService {
  if (!gitServiceInstance) {
    gitServiceInstance = new TauriGitService()
  }
  return gitServiceInstance
}
