/**
 * Workspace Environments Service
 * Syncs environments between the in-memory store and workspace file system
 *
 * - When workspace exists: saves non-sensitive environment variables to workspace/environments/*.json
 * - When no workspace: continues using Tauri Store (existing logic)
 * - Sensitive variable values are always stored in SecretEnvironmentService
 */

import { Service } from "dioc"
import { watch } from "vue"
import { Subscription } from "rxjs"
import { Environment } from "@auk/data"
import {
  environmentsStore,
  environments$,
  replaceEnvironments,
} from "~/store/environments"
import { useWorkspaceStore, initializeWorkspaceStore } from "~/store/workspace"
import { getFileSystem } from "~/services/workspace-storage/filesystem"
import type { FileSystemOps } from "~/services/workspace-storage/types"
import { EnvironmentFileSchema } from "~/services/workspace-storage/types"
import type { EnvironmentFile } from "~/services/workspace-storage/types"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { getIsGitSyncInProgress } from "~/services/git/sync-manager"
import {
  logger,
  createDebouncedChangeHandler,
  createDebouncedSave,
} from "~/services/workspace-storage/utils"
import { md5 } from "js-md5"

const LOG_PREFIX = "WES"
const ENVIRONMENTS_DIR = "environments"

/**
 * Sanitize a name for use as a filename
 */
function sanitizeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "unnamed"
  )
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString()
}

export class WorkspaceEnvironmentsService extends Service {
  public static readonly ID = "WORKSPACE_ENVIRONMENTS_SERVICE"

  private fs!: FileSystemOps
  private isSaving = false
  private _isLoading = false
  private environmentsSubscription: Subscription | null = null
  private secretEnvironmentService = this.bind(SecretEnvironmentService)
  private lastSavedHashes: Map<string, string> = new Map()
  private environmentMetadata: Map<
    string,
    { createdAt: string; updatedAt: string }
  > = new Map()

  // Watcher
  private watcher: (() => void) | null = null

  // Debounced handlers using shared utilities
  private changeHandler: ReturnType<
    typeof createDebouncedChangeHandler
  > | null = null
  private saveHandler: ReturnType<typeof createDebouncedSave> | null = null

  // Track if we're in workspace mode to control persistence behavior
  private _hasWorkspace = false

  get hasWorkspace(): boolean {
    return this._hasWorkspace
  }

  /**
   * 是否正在加载环境，供 PersistenceService 检查以避免竞态
   */
  get isLoading(): boolean {
    return this._isLoading
  }

  override onServiceInit() {
    logger.debug(LOG_PREFIX, "onServiceInit called")
    this.fs = getFileSystem()

    // Initialize workspace store on service init
    initializeWorkspaceStore()
      .then(() => {
        logger.debug(LOG_PREFIX, "Workspace store initialized")
      })
      .catch((error) => {
        logger.error(LOG_PREFIX, "Failed to initialize workspace store:", error)
      })

    const { currentWorkspace, isInitialized } = useWorkspaceStore()
    logger.debug(
      LOG_PREFIX,
      "Initial state - isInitialized:",
      isInitialized.value,
      "currentWorkspace:",
      currentWorkspace.value
    )

    // Watch for workspace changes
    watch(
      () => currentWorkspace.value,
      async (newWorkspace, oldWorkspace) => {
        logger.debug(
          LOG_PREFIX,
          "Workspace changed - new:",
          newWorkspace?.name,
          "old:",
          oldWorkspace?.name,
          "isInitialized:",
          isInitialized.value
        )
        if (!isInitialized.value) return
        if (newWorkspace?.id === oldWorkspace?.id) return

        // Save current environments to old workspace before switching
        if (oldWorkspace) {
          this.stopWatcher()
          await this.saveEnvironmentsToWorkspace(oldWorkspace.path)
        }

        // Update workspace mode flag
        this._hasWorkspace = !!newWorkspace

        // Load environments from new workspace
        if (newWorkspace) {
          await this.loadEnvironmentsFromWorkspace(newWorkspace.path)
          this.setupWatcher(newWorkspace.path)
        }
      },
      { immediate: false }
    )

    // Subscribe to environment changes using RxJS
    this.environmentsSubscription = environments$.subscribe(() => {
      console.log(
        "[WES] Environments changed (RxJS), isLoading:",
        this._isLoading,
        "isInitialized:",
        isInitialized.value,
        "currentWorkspace:",
        currentWorkspace.value?.name
      )
      if (this._isLoading) return
      if (!isInitialized.value) return
      if (!currentWorkspace.value) return
      this.debouncedSave()
    })

    // Initial load when workspace is ready
    // 先检查初始状态，避免 immediate: true 导致的时序问题
    if (isInitialized.value && currentWorkspace.value) {
      this._hasWorkspace = true
      this.loadEnvironmentsFromWorkspace(currentWorkspace.value.path)
    }

    // Watch for subsequent isInitialized changes
    watch(
      () => isInitialized.value,
      async (initialized, wasInitialized) => {
        console.log(
          "[WES] isInitialized changed to:",
          initialized,
          "was:",
          wasInitialized,
          "currentWorkspace:",
          currentWorkspace.value?.name
        )
        // 只在从 false 变为 true 时触发，避免重复加载
        if (initialized && !wasInitialized && currentWorkspace.value) {
          this._hasWorkspace = true
          await this.loadEnvironmentsFromWorkspace(currentWorkspace.value.path)
          this.setupWatcher(currentWorkspace.value.path)
        }
      },
      { immediate: false }
    )
  }

  onServiceDestroy() {
    this.stopWatcher()
    if (this.environmentsSubscription) {
      this.environmentsSubscription.unsubscribe()
      this.environmentsSubscription = null
    }
    // Cleanup handlers
    if (this.changeHandler) {
      this.changeHandler.cleanup()
      this.changeHandler = null
    }
    if (this.saveHandler) {
      this.saveHandler.cleanup()
      this.saveHandler = null
    }
  }

  private stopWatcher() {
    if (this.watcher) {
      this.watcher()
      this.watcher = null
    }
    if (this.changeHandler) {
      this.changeHandler.cleanup()
      this.changeHandler = null
    }
    if (this.saveHandler) {
      this.saveHandler.cleanup()
      this.saveHandler = null
    }
  }

  private async setupWatcher(workspacePath: string) {
    this.stopWatcher()
    const envPath = this.fs.joinPath(workspacePath, ENVIRONMENTS_DIR)

    try {
      await this.fs.createDir(envPath)
    } catch {}

    // Create debounced change handler using shared utility
    this.changeHandler = createDebouncedChangeHandler({
      isSaving: () => this.isSaving,
      isGitSyncing: getIsGitSyncInProgress,
      onReload: async () => {
        const { currentWorkspace } = useWorkspaceStore()
        if (currentWorkspace.value) {
          await this.loadEnvironmentsFromWorkspace(currentWorkspace.value.path)
        }
      },
      logPrefix: LOG_PREFIX,
    })

    // Create debounced save handler
    this.saveHandler = createDebouncedSave({
      isGitSyncing: getIsGitSyncInProgress,
      onSave: async () => {
        const { currentWorkspace } = useWorkspaceStore()
        if (currentWorkspace.value) {
          await this.saveEnvironmentsToWorkspace(currentWorkspace.value.path)
        }
      },
      logPrefix: LOG_PREFIX,
    })

    try {
      this.watcher = await this.fs.watch(envPath, () => {
        this.changeHandler?.handler()
      })
      logger.debug(LOG_PREFIX, "Started watching environments")
    } catch (e) {
      logger.warn(LOG_PREFIX, "Failed to watch environments:", e)
    }
  }

  /**
   * Debounced save to avoid too frequent writes
   * Uses shared utility for consistent behavior with collections service
   */
  private debouncedSave() {
    this.saveHandler?.trigger()
  }

  /**
   * Convert Environment (in-memory) to EnvironmentFile (file system)
   * - Sensitive variable values are cleared (stored in SecretEnvironmentService)
   */
  private environmentToFile(
    env: Environment,
    metadata?: { createdAt: string; updatedAt: string }
  ): EnvironmentFile {
    const variables = env.variables.map((v) => ({
      key: v.key,
      // For secret variables, store empty value in file (actual value in SecretEnvironmentService)
      value: v.secret ? "" : "initialValue" in v ? v.initialValue : "",
      secret: v.secret,
    }))

    const timestamps = metadata || {
      createdAt: now(),
      updatedAt: now(),
    }

    return {
      version: 1,
      id: env.id,
      name: env.name,
      variables,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    }
  }

  /**
   * Convert EnvironmentFile (file system) to Environment (in-memory)
   * - Restores sensitive variable values from SecretEnvironmentService
   */
  private fileToEnvironment(file: EnvironmentFile): Environment {
    const secretVars = this.secretEnvironmentService.getSecretEnvironment(
      file.id
    )

    // Store metadata for later use in saving
    this.environmentMetadata.set(file.id, {
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    })

    const variables = file.variables.map((v, index) => {
      if (v.secret) {
        // Restore secret value from SecretEnvironmentService
        const secretVar = secretVars?.find((sv) => sv.varIndex === index)
        return {
          key: v.key,
          initialValue: secretVar?.initialValue ?? "",
          currentValue: secretVar?.value ?? "",
          secret: true as const,
        }
      }
      return {
        key: v.key,
        initialValue: v.value,
        currentValue: v.value,
        secret: false as const,
      }
    })

    return {
      v: 2,
      id: file.id,
      name: file.name,
      variables,
    }
  }

  /**
   * Calculate hash of environment content (excluding timestamps)
   */
  private getEnvContentHash(env: Environment): string {
    const variables = env.variables.map((v) => ({
      key: v.key,
      value: v.secret ? "" : "initialValue" in v ? v.initialValue : "",
      secret: v.secret,
    }))
    return md5(
      JSON.stringify({
        id: env.id,
        name: env.name,
        variables,
      })
    )
  }

  /**
   * Save environments to workspace directory
   */
  async saveEnvironmentsToWorkspace(workspacePath: string): Promise<void> {
    console.log(
      "[WES] saveEnvironmentsToWorkspace called, isSaving:",
      this.isSaving,
      "path:",
      workspacePath
    )
    if (this.isSaving) {
      console.log("[WES] Already saving, skipping")
      return
    }

    const environments = environmentsStore.value.environments

    // Calculate hash of current environments to check if anything changed
    // We only hash the parts that are stored in files
    const currentGlobalHash = md5(
      JSON.stringify(
        environments.map((env) => ({
          id: env.id,
          name: env.name,
          variables: env.variables.map((v) => ({
            key: v.key,
            value: v.secret ? "" : "initialValue" in v ? v.initialValue : "",
            secret: v.secret,
          })),
        }))
      )
    )

    const lastSavedGlobalHash = this.lastSavedHashes.get(workspacePath)
    if (currentGlobalHash === lastSavedGlobalHash) {
      console.log("[WES] Environments unchanged, skipping save")
      return
    }

    this.isSaving = true

    try {
      console.log("[WES] Environments to save:", environments.length)
      const environmentsPath = this.fs.joinPath(workspacePath, ENVIRONMENTS_DIR)

      // Ensure environments directory exists
      try {
        await this.fs.createDir(environmentsPath)
      } catch (_e) {
        // Directory might exist
      }

      // Get existing files to track deletions
      let existingFiles: string[] = []
      try {
        existingFiles = await this.fs.readDir(environmentsPath)
      } catch {
        // Directory might not exist yet
      }

      const savedFileNames = new Set<string>()

      // Save each environment
      for (const env of environments) {
        const currentContentHash = this.getEnvContentHash(env)
        let metadata = this.environmentMetadata.get(env.id)

        // If content changed or new environment, update metadata
        if (!metadata) {
          metadata = {
            createdAt: now(),
            updatedAt: now(),
          }
          this.environmentMetadata.set(env.id, metadata)
          // We need to write this new environment
        } else {
          // Check if content actually changed compared to what we have in metadata
          // We need a way to store the hash of the last SAVED content
          const lastSavedEnvHashKey = `hash::${env.id}`
          const lastSavedEnvHash = this.lastSavedHashes.get(lastSavedEnvHashKey)

          if (currentContentHash !== lastSavedEnvHash) {
            metadata.updatedAt = now()
            this.lastSavedHashes.set(lastSavedEnvHashKey, currentContentHash)
          } else {
            // Content didn't change for THIS environment, but maybe it did for others
            // OR the order of environments changed (which changed the global hash)
            // Either way, we don't NEED to rewrite this file if it already exists
          }
        }

        const envFile = this.environmentToFile(env, metadata)
        const fileName = `${sanitizeFileName(env.name)}-${env.id.slice(0, 8)}.json`
        savedFileNames.add(fileName)

        const filePath = this.fs.joinPath(environmentsPath, fileName)

        // Only write if file doesn't exist OR content hash changed
        const lastSavedEnvHashKey = `hash::${env.id}`
        const lastSavedEnvHash = this.lastSavedHashes.get(lastSavedEnvHashKey)

        if (
          !existingFiles.includes(fileName) ||
          currentContentHash !== lastSavedEnvHash
        ) {
          console.log("[WES] Writing environment file:", fileName)
          try {
            await this.fs.writeFileAtomic(
              filePath,
              JSON.stringify(envFile, null, 2)
            )
            this.lastSavedHashes.set(lastSavedEnvHashKey, currentContentHash)
          } catch (e) {
            console.error("[WES] Failed to save environment:", e)
          }
        } else {
          console.log(
            "[WES] Environment file unchanged, skipping write:",
            fileName
          )
        }
      }

      // Delete files that no longer correspond to any environment
      for (const existingFile of existingFiles) {
        if (
          existingFile.endsWith(".json") &&
          !savedFileNames.has(existingFile)
        ) {
          try {
            const filePath = this.fs.joinPath(environmentsPath, existingFile)
            console.log("[WES] Deleting orphaned environment file:", filePath)
            await this.fs.deleteFile(filePath)
          } catch (e) {
            console.error("[WES] Failed to delete orphaned file:", e)
          }
        }
      }

      // Update global hash after successful save
      this.lastSavedHashes.set(workspacePath, currentGlobalHash)

      console.log(
        `[WES] Saved ${environments.length} environments to ${workspacePath}`
      )
    } catch (error) {
      console.error("[WES] Failed to save environments:", error)
    } finally {
      this.isSaving = false
    }
  }

  /**
   * Load environments from workspace directory
   */
  async loadEnvironmentsFromWorkspace(workspacePath: string): Promise<void> {
    console.log(
      "[WES] loadEnvironmentsFromWorkspace called, isLoading:",
      this._isLoading,
      "path:",
      workspacePath
    )
    if (this._isLoading) {
      console.log("[WES] Already loading, skipping")
      return
    }
    this._isLoading = true

    try {
      const environmentsPath = this.fs.joinPath(workspacePath, ENVIRONMENTS_DIR)
      console.log("[WES] Environments path:", environmentsPath)

      // Check if environments directory exists
      const exists = await this.fs.dirExists(environmentsPath)
      console.log("[WES] Environments directory exists:", exists)

      if (!exists) {
        console.log(
          "[WES] No environments directory, keeping current environments"
        )
        // Don't replace environments if directory doesn't exist
        // This preserves environments from Tauri Store on first workspace use
        this._isLoading = false

        // Save current environments to workspace for migration
        const currentEnvs = environmentsStore.value.environments
        if (currentEnvs.length > 0) {
          console.log(
            "[WES] Migrating",
            currentEnvs.length,
            "environments to workspace"
          )
          this._isLoading = false
          await this.saveEnvironmentsToWorkspace(workspacePath)
        }
        return
      }

      // Read all environment files
      const entries = await this.fs.readDir(environmentsPath)
      console.log("[WES] Environment entries:", entries)
      const environments: Environment[] = []

      for (const entry of entries) {
        // Skip hidden files and non-JSON files
        if (entry.startsWith(".") || !entry.endsWith(".json")) continue

        try {
          const filePath = this.fs.joinPath(environmentsPath, entry)
          const content = await this.fs.readFile(filePath)
          const parsed = EnvironmentFileSchema.safeParse(JSON.parse(content))

          if (parsed.success) {
            const env = this.fileToEnvironment(parsed.data)
            console.log("[WES] Loaded environment:", env.name)
            environments.push(env)
          } else {
            console.error(
              "[WES] Invalid environment file:",
              entry,
              parsed.error
            )
          }
        } catch (e) {
          console.error("[WES] Failed to load environment file:", entry, e)
        }
      }

      // If no environments found, create a default one
      if (environments.length === 0) {
        console.log("[WES] No environments found, creating default")
        environments.push({
          v: 2,
          id: crypto.randomUUID(),
          name: "My Environment Variables",
          variables: [],
        })
      }

      // Update the store
      console.log("[WES] Setting", environments.length, "environments to store")
      replaceEnvironments(environments)

      // Update hashes after successful load
      for (const env of environments) {
        this.lastSavedHashes.set(`hash::${env.id}`, this.getEnvContentHash(env))
      }
      const finalGlobalHash = md5(
        JSON.stringify(
          environments.map((env) => ({
            id: env.id,
            name: env.name,
            variables: env.variables.map((v) => ({
              key: v.key,
              value: v.secret ? "" : "initialValue" in v ? v.initialValue : "",
              secret: v.secret,
            })),
          }))
        )
      )
      this.lastSavedHashes.set(workspacePath, finalGlobalHash)

      console.log("[WES] Environments set successfully")
      console.log(
        `[WES] Loaded ${environments.length} environments from ${workspacePath}`
      )
    } catch (error) {
      console.error("[WES] Failed to load environments:", error)
    } finally {
      this._isLoading = false
      console.log("[WES] Loading complete")
    }
  }

  /**
   * Force save current environments to workspace
   */
  async forceSave(): Promise<void> {
    const { currentWorkspace } = useWorkspaceStore()
    if (currentWorkspace.value) {
      await this.saveEnvironmentsToWorkspace(currentWorkspace.value.path)
    }
  }

  /**
   * Force reload environments from workspace
   */
  async forceReload(): Promise<void> {
    const { currentWorkspace } = useWorkspaceStore()
    if (currentWorkspace.value) {
      await this.loadEnvironmentsFromWorkspace(currentWorkspace.value.path)
    }
  }
}
