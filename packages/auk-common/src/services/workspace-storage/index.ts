/**
 * Workspace Storage Service Implementation
 * Git-friendly file structure for collections and environments
 */

import type {
  WorkspaceStorageService,
  WorkspaceList,
  Workspace,
  CollectionMeta,
  RequestFile,
  EnvironmentFile,
  FileSystemOps,
} from "./types"
import {
  WorkspaceListSchema,
  CollectionMetaSchema,
  RequestFileSchema,
  EnvironmentFileSchema,
} from "./types"
import { getFileSystem } from "./filesystem"
import { Store } from "~/kernel/store"
import * as E from "fp-ts/Either"

// Constants for file/directory names
const WORKSPACE_LIST_KEY = "workspaces"
const WORKSPACE_NAMESPACE = "workspace.v1"
const COLLECTIONS_DIR = "collections"
const ENVIRONMENTS_DIR = "environments"
const COLLECTION_META_FILE = "collection.json"
const GITIGNORE_FILE = ".gitignore"
const AUK_GITIGNORE_START = "# --- AUK managed: workspace sync (start) ---"
const AUK_GITIGNORE_END = "# --- AUK managed: workspace sync (end) ---"
const AUK_GITIGNORE_LINES = [
  "# Secrets (never commit)",
  "*.secret.json",
  "secrets/",
  "",
  "# Local state",
  ".local/",
  "*.local.json",
  "",
  "# System files",
  ".DS_Store",
  "Thumbs.db",
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Store initialization state
let storeInitialized = false
let storeInitPromise: Promise<void> | null = null

/**
 * Initialize the Store (must be called before using Store operations)
 */
async function ensureStoreInit(): Promise<void> {
  if (storeInitialized) return

  if (!storeInitPromise) {
    storeInitPromise = (async () => {
      try {
        const result = await Store.init()
        if (E.isLeft(result)) {
          console.warn("Store init returned error:", result.left)
        }
        storeInitialized = true
      } catch (error) {
        console.warn("Store init failed:", error)
        storeInitialized = true // Continue anyway, will use defaults
      }
    })()
  }

  await storeInitPromise
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString()
}

/**
 * Sanitize a name for use as a filename
 */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
}

/**
 * Workspace Storage Service Implementation
 */
export class WorkspaceStorageServiceImpl implements WorkspaceStorageService {
  private fs: FileSystemOps
  private workspaceListCache: WorkspaceList | null = null

  constructor(fs?: FileSystemOps) {
    this.fs = fs || getFileSystem()
  }

  private getManagedGitignoreBlock(): string {
    return [
      AUK_GITIGNORE_START,
      ...AUK_GITIGNORE_LINES,
      AUK_GITIGNORE_END,
    ].join("\n")
  }

  private mergeGitignoreContent(existingContent: string): string {
    const normalizedExisting = existingContent.replace(/\r\n/g, "\n")
    const managedBlock = this.getManagedGitignoreBlock()
    const managedBlockRegex = new RegExp(
      `${escapeRegExp(AUK_GITIGNORE_START)}[\\s\\S]*?${escapeRegExp(AUK_GITIGNORE_END)}`,
      "m"
    )

    if (managedBlockRegex.test(normalizedExisting)) {
      return `${normalizedExisting.replace(managedBlockRegex, managedBlock).trimEnd()}\n`
    }

    const trimmed = normalizedExisting.trimEnd()
    if (!trimmed) return `${managedBlock}\n`
    return `${trimmed}\n\n${managedBlock}\n`
  }

  private async ensureWorkspaceGitignore(workspacePath: string): Promise<void> {
    const gitignorePath = this.fs.joinPath(workspacePath, GITIGNORE_FILE)
    const managedBlock = `${this.getManagedGitignoreBlock()}\n`

    try {
      const exists = await this.fs.fileExists(gitignorePath)
      if (!exists) {
        await this.fs.writeFile(gitignorePath, managedBlock)
        return
      }

      const currentContent = await this.fs.readFile(gitignorePath)
      const mergedContent = this.mergeGitignoreContent(currentContent)
      if (mergedContent !== currentContent.replace(/\r\n/g, "\n")) {
        await this.fs.writeFile(gitignorePath, mergedContent)
      }
    } catch (error) {
      console.warn("Failed to ensure workspace .gitignore:", error)
    }
  }

  // ==================== Workspace Management ====================

  async getWorkspaceList(): Promise<WorkspaceList> {
    if (this.workspaceListCache) {
      return this.workspaceListCache
    }

    await ensureStoreInit()

    try {
      const result = await Store.get<WorkspaceList>(
        WORKSPACE_NAMESPACE,
        WORKSPACE_LIST_KEY
      )

      if (E.isRight(result) && result.right) {
        const parsed = WorkspaceListSchema.safeParse(result.right)
        if (parsed.success) {
          this.workspaceListCache = parsed.data
          return parsed.data
        }
      }
    } catch (error) {
      console.warn("Failed to get workspace list from store:", error)
    }

    // Return default empty list
    const defaultList: WorkspaceList = {
      version: 1,
      currentWorkspaceId: undefined,
      workspaces: [],
    }
    return defaultList
  }

  async saveWorkspaceList(list: WorkspaceList): Promise<void> {
    await ensureStoreInit()

    const validated = WorkspaceListSchema.parse(list)
    try {
      const result = await Store.set(
        WORKSPACE_NAMESPACE,
        WORKSPACE_LIST_KEY,
        validated
      )
      if (E.isLeft(result)) {
        console.warn("Failed to save workspace list:", result.left)
      }
    } catch (error) {
      console.warn("Failed to save workspace list:", error)
    }
    this.workspaceListCache = validated
  }

  async getCurrentWorkspace(): Promise<Workspace | null> {
    const list = await this.getWorkspaceList()
    if (!list.currentWorkspaceId) return null
    return list.workspaces.find((w) => w.id === list.currentWorkspaceId) || null
  }

  async setCurrentWorkspace(workspaceId: string): Promise<void> {
    const list = await this.getWorkspaceList()
    const workspace = list.workspaces.find((w) => w.id === workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }
    list.currentWorkspaceId = workspaceId
    await this.saveWorkspaceList(list)
  }

  async createWorkspace(
    name: string,
    path: string,
    options?: Partial<Workspace>
  ): Promise<Workspace> {
    const workspace: Workspace = {
      version: 1,
      id: generateId(),
      name,
      path,
      description: options?.description,
      git: options?.git,
      settings: options?.settings,
      createdAt: now(),
      updatedAt: now(),
    }

    // Create workspace directory structure
    await this.fs.createDir(path)
    await this.fs.createDir(this.fs.joinPath(path, COLLECTIONS_DIR))
    await this.fs.createDir(this.fs.joinPath(path, ENVIRONMENTS_DIR))

    // Create or merge .gitignore managed section without overwriting user content
    await this.ensureWorkspaceGitignore(path)

    // Add to workspace list
    const list = await this.getWorkspaceList()
    list.workspaces.push(workspace)
    if (!list.currentWorkspaceId) {
      list.currentWorkspaceId = workspace.id
    }
    await this.saveWorkspaceList(list)

    return workspace
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const list = await this.getWorkspaceList()
    const index = list.workspaces.findIndex((w) => w.id === workspaceId)
    if (index === -1) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }

    if (list.workspaces.length <= 1) {
      throw new Error("Cannot delete the last workspace")
    }

    list.workspaces.splice(index, 1)

    // Update current workspace if needed
    if (list.currentWorkspaceId === workspaceId) {
      list.currentWorkspaceId = list.workspaces[0]?.id
    }

    await this.saveWorkspaceList(list)
  }

  // ==================== Collection Operations ====================

  private getCollectionsPath(workspacePath: string): string {
    return this.fs.joinPath(workspacePath, COLLECTIONS_DIR)
  }

  async listCollections(workspacePath: string): Promise<CollectionMeta[]> {
    const collectionsPath = this.getCollectionsPath(workspacePath)

    try {
      const entries = await this.fs.readDir(collectionsPath)
      const collections: CollectionMeta[] = []

      for (const entry of entries) {
        const metaPath = this.fs.joinPath(
          collectionsPath,
          entry,
          COLLECTION_META_FILE
        )
        try {
          const content = await this.fs.readFile(metaPath)
          const parsed = CollectionMetaSchema.safeParse(JSON.parse(content))
          if (parsed.success) {
            collections.push(parsed.data)
          }
        } catch {
          // Skip invalid collections
        }
      }

      return collections
    } catch {
      return []
    }
  }

  async getCollection(
    workspacePath: string,
    collectionId: string
  ): Promise<CollectionMeta | null> {
    const collections = await this.listCollections(workspacePath)
    return collections.find((c) => c.id === collectionId) || null
  }

  async saveCollection(
    workspacePath: string,
    collection: CollectionMeta
  ): Promise<void> {
    const validated = CollectionMetaSchema.parse(collection)
    const collectionDir = this.fs.joinPath(
      this.getCollectionsPath(workspacePath),
      sanitizeFileName(collection.name) + "-" + collection.id.slice(0, 8)
    )

    await this.fs.createDir(collectionDir)

    const metaPath = this.fs.joinPath(collectionDir, COLLECTION_META_FILE)
    await this.fs.writeFile(metaPath, JSON.stringify(validated, null, 2))
  }

  async deleteCollection(
    workspacePath: string,
    collectionId: string
  ): Promise<void> {
    const collectionsPath = this.getCollectionsPath(workspacePath)
    const entries = await this.fs.readDir(collectionsPath)

    for (const entry of entries) {
      const metaPath = this.fs.joinPath(
        collectionsPath,
        entry,
        COLLECTION_META_FILE
      )
      try {
        const content = await this.fs.readFile(metaPath)
        const meta = JSON.parse(content)
        if (meta.id === collectionId) {
          await this.fs.deleteDir(this.fs.joinPath(collectionsPath, entry))
          return
        }
      } catch {
        // Continue searching
      }
    }
  }

  // ==================== Request Operations ====================

  async listRequests(
    workspacePath: string,
    collectionPath: string
  ): Promise<RequestFile[]> {
    const fullPath = this.fs.joinPath(
      this.getCollectionsPath(workspacePath),
      collectionPath
    )

    try {
      const entries = await this.fs.readDir(fullPath)
      const requests: RequestFile[] = []

      for (const entry of entries) {
        if (entry === COLLECTION_META_FILE || !entry.endsWith(".json")) {
          continue
        }

        try {
          const content = await this.fs.readFile(
            this.fs.joinPath(fullPath, entry)
          )
          const parsed = RequestFileSchema.safeParse(JSON.parse(content))
          if (parsed.success) {
            requests.push(parsed.data)
          }
        } catch {
          // Skip invalid requests
        }
      }

      return requests
    } catch {
      return []
    }
  }

  async getRequest(
    workspacePath: string,
    collectionPath: string,
    requestId: string
  ): Promise<RequestFile | null> {
    const requests = await this.listRequests(workspacePath, collectionPath)
    return requests.find((r) => r.id === requestId) || null
  }

  async saveRequest(
    workspacePath: string,
    collectionPath: string,
    request: RequestFile
  ): Promise<void> {
    const validated = RequestFileSchema.parse(request)
    const fileName =
      sanitizeFileName(request.name) + "-" + request.id.slice(0, 8) + ".json"
    const filePath = this.fs.joinPath(
      this.getCollectionsPath(workspacePath),
      collectionPath,
      fileName
    )

    await this.fs.writeFile(filePath, JSON.stringify(validated, null, 2))
  }

  async deleteRequest(
    workspacePath: string,
    collectionPath: string,
    requestId: string
  ): Promise<void> {
    const fullPath = this.fs.joinPath(
      this.getCollectionsPath(workspacePath),
      collectionPath
    )

    const entries = await this.fs.readDir(fullPath)

    for (const entry of entries) {
      if (!entry.endsWith(".json") || entry === COLLECTION_META_FILE) {
        continue
      }

      try {
        const content = await this.fs.readFile(
          this.fs.joinPath(fullPath, entry)
        )
        const request = JSON.parse(content)
        if (request.id === requestId) {
          await this.fs.deleteFile(this.fs.joinPath(fullPath, entry))
          return
        }
      } catch {
        // Continue searching
      }
    }
  }

  // ==================== Environment Operations ====================

  private getEnvironmentsPath(workspacePath: string): string {
    return this.fs.joinPath(workspacePath, ENVIRONMENTS_DIR)
  }

  async listEnvironments(workspacePath: string): Promise<EnvironmentFile[]> {
    const envsPath = this.getEnvironmentsPath(workspacePath)

    try {
      const entries = await this.fs.readDir(envsPath)
      const environments: EnvironmentFile[] = []

      for (const entry of entries) {
        if (!entry.endsWith(".json")) continue

        try {
          const content = await this.fs.readFile(
            this.fs.joinPath(envsPath, entry)
          )
          const parsed = EnvironmentFileSchema.safeParse(JSON.parse(content))
          if (parsed.success) {
            environments.push(parsed.data)
          }
        } catch {
          // Skip invalid environments
        }
      }

      return environments
    } catch {
      return []
    }
  }

  async getEnvironment(
    workspacePath: string,
    envId: string
  ): Promise<EnvironmentFile | null> {
    const environments = await this.listEnvironments(workspacePath)
    return environments.find((e) => e.id === envId) || null
  }

  async saveEnvironment(
    workspacePath: string,
    env: EnvironmentFile
  ): Promise<void> {
    const validated = EnvironmentFileSchema.parse(env)
    const fileName = sanitizeFileName(env.name) + ".json"
    const filePath = this.fs.joinPath(
      this.getEnvironmentsPath(workspacePath),
      fileName
    )

    await this.fs.writeFile(filePath, JSON.stringify(validated, null, 2))
  }

  async deleteEnvironment(workspacePath: string, envId: string): Promise<void> {
    const envsPath = this.getEnvironmentsPath(workspacePath)
    const entries = await this.fs.readDir(envsPath)

    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue

      try {
        const content = await this.fs.readFile(
          this.fs.joinPath(envsPath, entry)
        )
        const env = JSON.parse(content)
        if (env.id === envId) {
          await this.fs.deleteFile(this.fs.joinPath(envsPath, entry))
          return
        }
      } catch {
        // Continue searching
      }
    }
  }
}

// Singleton instance
let storageServiceInstance: WorkspaceStorageServiceImpl | null = null

export function getWorkspaceStorageService(): WorkspaceStorageServiceImpl {
  if (!storageServiceInstance) {
    storageServiceInstance = new WorkspaceStorageServiceImpl()
  }
  return storageServiceInstance
}
