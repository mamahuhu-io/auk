/**
 * Workspace Collections Service
 * Syncs collections between the in-memory store and workspace file system
 */

import { Service } from "dioc"
import { watch } from "vue"
import { Subscription } from "rxjs"
import {
  AukCollection,
  AukRESTRequest,
  AukGQLRequest,
  makeCollection,
  translateToNewRequest,
  translateToGQLRequest,
} from "@auk/data"
import {
  restCollectionStore,
  setRESTCollections,
  graphqlCollectionStore,
  setGraphqlCollections,
} from "~/store/collections"
import { useWorkspaceStore, initializeWorkspaceStore } from "~/store/workspace"
import { getFileSystem } from "~/services/workspace-storage/filesystem"
import type { FileSystemOps } from "~/services/workspace-storage/types"
import { getIsGitSyncInProgress } from "~/services/git/sync-manager"
import {
  logger,
  createDebouncedChangeHandler,
  createDebouncedSave,
} from "~/services/workspace-storage/utils"
import { md5 } from "js-md5"

const LOG_PREFIX = "WCS"

const REST_COLLECTIONS_DIR = "collections"
const GQL_COLLECTIONS_DIR = "graphql-collections"
const REQUESTS_DIR = "requests"
const COLLECTION_META_FILE = "_collection.json"

/**
 * Sanitize a name for use as a filename
 */
function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
      .replace(/^\.+/, "")
      .replace(/\.+$/, "")
      .trim()
      .slice(0, 100) || "unnamed"
  )
}

export class WorkspaceCollectionsService extends Service {
  public static readonly ID = "WORKSPACE_COLLECTIONS_SERVICE"

  private fs!: FileSystemOps
  private isSavingRest = false
  private isSavingGql = false
  private isLoadingRest = false
  private isLoadingGql = false
  private restCollectionSubscription: Subscription | null = null
  private gqlCollectionSubscription: Subscription | null = null
  private lastSavedHashes: Map<string, string> = new Map()

  // Watchers
  private restWatcher: (() => void) | null = null
  private gqlWatcher: (() => void) | null = null

  // Debounced handlers using shared utilities
  private restChangeHandler: ReturnType<
    typeof createDebouncedChangeHandler
  > | null = null
  private gqlChangeHandler: ReturnType<
    typeof createDebouncedChangeHandler
  > | null = null
  private saveHandler: ReturnType<typeof createDebouncedSave> | null = null

  override onServiceInit() {
    logger.debug(LOG_PREFIX, "onServiceInit called")
    this.fs = getFileSystem()

    // Initialize workspace store on service init
    initializeWorkspaceStore()
      .then(() => {
        console.log(
          "[WCS] Workspace store initialized by WorkspaceCollectionsService"
        )
      })
      .catch((error) => {
        console.error("[WCS] Failed to initialize workspace store:", error)
      })

    const { currentWorkspace, isInitialized } = useWorkspaceStore()
    console.log(
      "[WCS] Initial state - isInitialized:",
      isInitialized.value,
      "currentWorkspace:",
      currentWorkspace.value
    )

    // Watch for workspace changes
    watch(
      () => currentWorkspace.value,
      async (newWorkspace, oldWorkspace) => {
        console.log(
          "[WCS] Workspace changed - new:",
          newWorkspace?.name,
          "old:",
          oldWorkspace?.name,
          "isInitialized:",
          isInitialized.value
        )
        if (!isInitialized.value) return
        if (newWorkspace?.id === oldWorkspace?.id) return

        // Save current collections to old workspace before switching
        if (oldWorkspace) {
          this.stopWatchers()
          await this.saveAllCollectionsToWorkspace(oldWorkspace.path)
        }

        // Load collections from new workspace
        if (newWorkspace) {
          await this.loadAllCollectionsFromWorkspace(newWorkspace.path)
          this.setupWatchers(newWorkspace.path)
        }
      },
      { immediate: false }
    )

    // Subscribe to REST collection changes using RxJS
    this.restCollectionSubscription = restCollectionStore.subject$.subscribe(
      () => {
        console.log(
          "[WCS] REST Collection changed (RxJS), isLoadingRest:",
          this.isLoadingRest,
          "isInitialized:",
          isInitialized.value,
          "currentWorkspace:",
          currentWorkspace.value?.name
        )
        if (this.isLoadingRest) return
        if (!isInitialized.value) return
        if (!currentWorkspace.value) return
        this.debouncedSave()
      }
    )

    // Subscribe to GraphQL collection changes using RxJS
    this.gqlCollectionSubscription = graphqlCollectionStore.subject$.subscribe(
      () => {
        console.log(
          "[WCS] GQL Collection changed (RxJS), isLoadingGql:",
          this.isLoadingGql,
          "isInitialized:",
          isInitialized.value,
          "currentWorkspace:",
          currentWorkspace.value?.name
        )
        if (this.isLoadingGql) return
        if (!isInitialized.value) return
        if (!currentWorkspace.value) return
        this.debouncedSave()
      }
    )

    // Initial load when workspace is ready
    watch(
      () => isInitialized.value,
      async (initialized) => {
        console.log(
          "[WCS] isInitialized changed to:",
          initialized,
          "currentWorkspace:",
          currentWorkspace.value?.name
        )
        if (initialized && currentWorkspace.value) {
          await this.loadAllCollectionsFromWorkspace(
            currentWorkspace.value.path
          )
          this.setupWatchers(currentWorkspace.value.path)
        }
      },
      { immediate: true }
    )
  }

  onServiceDestroy() {
    this.stopWatchers()
    if (this.restCollectionSubscription) {
      this.restCollectionSubscription.unsubscribe()
      this.restCollectionSubscription = null
    }
    if (this.gqlCollectionSubscription) {
      this.gqlCollectionSubscription.unsubscribe()
      this.gqlCollectionSubscription = null
    }
  }

  private getHashKey(path: string, type: string): string {
    return `${path}::${type}`
  }

  private stopWatchers() {
    if (this.restWatcher) {
      this.restWatcher()
      this.restWatcher = null
    }
    if (this.gqlWatcher) {
      this.gqlWatcher()
      this.gqlWatcher = null
    }
    // Cleanup debounced handlers
    if (this.restChangeHandler) {
      this.restChangeHandler.cleanup()
      this.restChangeHandler = null
    }
    if (this.gqlChangeHandler) {
      this.gqlChangeHandler.cleanup()
      this.gqlChangeHandler = null
    }
    if (this.saveHandler) {
      this.saveHandler.cleanup()
      this.saveHandler = null
    }
  }

  private async setupWatchers(workspacePath: string) {
    this.stopWatchers()

    const restPath = this.fs.joinPath(workspacePath, REST_COLLECTIONS_DIR)
    const gqlPath = this.fs.joinPath(workspacePath, GQL_COLLECTIONS_DIR)

    // Ensure directories exist before watching (or watch might fail)
    try {
      await this.fs.createDir(restPath)
    } catch {}
    try {
      await this.fs.createDir(gqlPath)
    } catch {}

    // Create debounced change handlers using shared utility
    this.restChangeHandler = createDebouncedChangeHandler({
      isSaving: () => this.isSavingRest,
      isGitSyncing: getIsGitSyncInProgress,
      onReload: async () => {
        const { currentWorkspace } = useWorkspaceStore()
        if (currentWorkspace.value) {
          await this.loadCollectionsFromWorkspace(
            currentWorkspace.value.path,
            "rest"
          )
        }
      },
      logPrefix: LOG_PREFIX,
    })

    this.gqlChangeHandler = createDebouncedChangeHandler({
      isSaving: () => this.isSavingGql,
      isGitSyncing: getIsGitSyncInProgress,
      onReload: async () => {
        const { currentWorkspace } = useWorkspaceStore()
        if (currentWorkspace.value) {
          await this.loadCollectionsFromWorkspace(
            currentWorkspace.value.path,
            "graphql"
          )
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
          await this.saveAllCollectionsToWorkspace(currentWorkspace.value.path)
        }
      },
      logPrefix: LOG_PREFIX,
    })

    try {
      this.restWatcher = await this.fs.watch(restPath, () => {
        this.restChangeHandler?.handler()
      })
      logger.debug(LOG_PREFIX, "Started watching REST collections")
    } catch (e) {
      logger.warn(LOG_PREFIX, "Failed to watch REST collections:", e)
    }

    try {
      this.gqlWatcher = await this.fs.watch(gqlPath, () => {
        this.gqlChangeHandler?.handler()
      })
      logger.debug(LOG_PREFIX, "Started watching GraphQL collections")
    } catch (e) {
      logger.warn(LOG_PREFIX, "Failed to watch GraphQL collections:", e)
    }
  }

  /**
   * Debounced save to avoid too frequent writes
   * Uses shared utility for consistent behavior with environments service
   */
  private debouncedSave() {
    this.saveHandler?.trigger()
  }

  /**
   * Save all collections (REST and GraphQL) to workspace
   */
  async saveAllCollectionsToWorkspace(workspacePath: string): Promise<void> {
    await this.saveCollectionsToWorkspace(workspacePath, "rest")
    await this.saveCollectionsToWorkspace(workspacePath, "graphql")
  }

  /**
   * Load all collections (REST and GraphQL) from workspace
   */
  async loadAllCollectionsFromWorkspace(workspacePath: string): Promise<void> {
    await this.loadCollectionsFromWorkspace(workspacePath, "rest")
    await this.loadCollectionsFromWorkspace(workspacePath, "graphql")
  }

  /**
   * Save collections to workspace directory
   */
  async saveCollectionsToWorkspace(
    workspacePath: string,
    type: "rest" | "graphql"
  ): Promise<void> {
    const isSaving = type === "rest" ? this.isSavingRest : this.isSavingGql
    console.log(
      "[WCS] saveCollectionsToWorkspace called, type:",
      type,
      "isSaving:",
      isSaving,
      "path:",
      workspacePath
    )
    if (isSaving) {
      console.log("[WCS] Already saving", type, ", skipping")
      return
    }

    const store = type === "rest" ? restCollectionStore : graphqlCollectionStore
    const collections = store.value.state

    // Calculate hash of current collections
    const currentHash = md5(JSON.stringify(collections))
    const lastHash = this.lastSavedHashes.get(
      this.getHashKey(workspacePath, type)
    )

    if (currentHash === lastHash) {
      console.log(`[WCS] ${type} collections unchanged, skipping save`)
      return
    }

    if (type === "rest") {
      this.isSavingRest = true
    } else {
      this.isSavingGql = true
    }

    try {
      const collectionsDir =
        type === "rest" ? REST_COLLECTIONS_DIR : GQL_COLLECTIONS_DIR
      console.log(`[WCS] ${type} collections to save:`, collections.length)
      const collectionsPath = this.fs.joinPath(workspacePath, collectionsDir)
      console.log("[WCS] Collections path:", collectionsPath)

      // Ensure collections directory exists
      try {
        await this.fs.createDir(collectionsPath)
        console.log("[WCS] Created collections directory")
      } catch (e) {
        console.log("[WCS] Collections directory might exist:", e)
      }

      // Save each collection

      const savedCollectionDirNames = new Set<string>()

      for (const collection of collections) {
        console.log("[WCS] Saving collection:", collection.name)

        const dirName = await this.saveCollection(
          collectionsPath,

          collection,

          type
        )

        savedCollectionDirNames.add(dirName)
      }

      // Delete orphaned collection directories

      try {
        const existingEntries = await this.fs.readDir(collectionsPath)

        for (const entry of existingEntries) {
          if (entry.startsWith(".")) continue

          if (!savedCollectionDirNames.has(entry)) {
            const entryPath = this.fs.joinPath(collectionsPath, entry)

            if (await this.fs.dirExists(entryPath)) {
              console.log(
                "[WCS] Deleting orphaned collection directory:",
                entry
              )

              await this.fs.deleteDir(entryPath)
            }
          }
        }
      } catch (_e) {
        // Ignore errors during orphan cleanup
      }

      // Update last saved hash

      this.lastSavedHashes.set(
        this.getHashKey(workspacePath, type),
        currentHash
      )

      console.log(
        `[WCS] Saved ${collections.length} ${type} collections to ${workspacePath}`
      )
    } catch (error) {
      console.error(`[WCS] Failed to save ${type} collections:`, error)
    } finally {
      if (type === "rest") {
        this.isSavingRest = false
      } else {
        this.isSavingGql = false
      }
    }
  }

  /**
   * Save a single collection to the file system
   * @returns The directory name used for this collection
   */
  private async saveCollection(
    basePath: string,
    collection: AukCollection,
    type: "rest" | "graphql"
  ): Promise<string> {
    const collectionDirName = sanitizeFileName(collection.name)
    const collectionPath = this.fs.joinPath(basePath, collectionDirName)
    console.log("[WCS] saveCollection:", collection.name, "to", collectionPath)

    // Create collection directory
    try {
      await this.fs.createDir(collectionPath)
      console.log("[WCS] Created collection directory:", collectionPath)
    } catch (_e) {
      // Collection directory might exist
    }

    // Save collection metadata (without requests and folders - they're saved separately)
    const meta = {
      _ref_id: collection._ref_id,
      id: collection.id,
      name: collection.name,
      description: collection.description,
      auth: collection.auth,
      headers: collection.headers,
      variables: collection.variables,
    }
    const metaPath = this.fs.joinPath(collectionPath, COLLECTION_META_FILE)
    console.log("[WCS] Writing meta to:", metaPath)
    try {
      await this.fs.writeFileAtomic(metaPath, JSON.stringify(meta, null, 2))
      console.log("[WCS] Meta written successfully")
    } catch (e) {
      console.error("[WCS] Failed to write meta:", e)
      throw e
    }

    // Create requests directory
    const requestsPath = this.fs.joinPath(collectionPath, REQUESTS_DIR)
    try {
      await this.fs.createDir(requestsPath)
      console.log("[WCS] Created requests directory:", requestsPath)
    } catch (_e) {
      // Requests directory might exist
    }

    // Save each request as a separate file
    console.log("[WCS] Saving", collection.requests.length, "requests")
    const savedRequestFileNames = new Set<string>()
    for (let i = 0; i < collection.requests.length; i++) {
      const request = collection.requests[i] as AukRESTRequest
      const requestFileName = `${String(i).padStart(3, "0")}-${sanitizeFileName(request.name)}.json`
      savedRequestFileNames.add(requestFileName)
      const requestPath = this.fs.joinPath(requestsPath, requestFileName)
      console.log("[WCS] Writing request to:", requestPath)
      try {
        await this.fs.writeFileAtomic(
          requestPath,
          JSON.stringify(request, null, 2)
        )
        console.log("[WCS] Request written successfully")
      } catch (e) {
        console.error("[WCS] Failed to write request:", e)
        throw e
      }
    }

    // Delete orphaned requests
    try {
      const existingRequestFiles = await this.fs.readDir(requestsPath)
      for (const file of existingRequestFiles) {
        if (file.endsWith(".json") && !savedRequestFileNames.has(file)) {
          const filePath = this.fs.joinPath(requestsPath, file)
          console.log("[WCS] Deleting orphaned request file:", file)
          await this.fs.deleteFile(filePath)
        }
      }
    } catch (_e) {
      // Ignore errors during orphan cleanup
    }

    // Recursively save sub-folders
    const savedFolderNames = new Set<string>()
    for (const folder of collection.folders) {
      const dirName = await this.saveCollection(collectionPath, folder, type)
      savedFolderNames.add(dirName)
    }

    // Delete orphaned sub-folders
    try {
      const entries = await this.fs.readDir(collectionPath)
      for (const entry of entries) {
        if (
          entry === REQUESTS_DIR ||
          entry === COLLECTION_META_FILE ||
          entry.startsWith(".")
        ) {
          continue
        }
        if (!savedFolderNames.has(entry)) {
          const entryPath = this.fs.joinPath(collectionPath, entry)
          if (await this.fs.dirExists(entryPath)) {
            console.log("[WCS] Deleting orphaned folder directory:", entry)
            await this.fs.deleteDir(entryPath)
          }
        }
      }
    } catch (_e) {
      // Ignore errors during orphan cleanup
    }

    return collectionDirName
  }

  /**
   * Load collections from workspace directory
   */
  async loadCollectionsFromWorkspace(
    workspacePath: string,
    type: "rest" | "graphql"
  ): Promise<void> {
    const isLoading = type === "rest" ? this.isLoadingRest : this.isLoadingGql
    console.log(
      "[WCS] loadCollectionsFromWorkspace called, type:",
      type,
      "isLoading:",
      isLoading,
      "path:",
      workspacePath
    )
    if (isLoading) {
      console.log("[WCS] Already loading", type, ", skipping")
      return
    }
    if (type === "rest") {
      this.isLoadingRest = true
    } else {
      this.isLoadingGql = true
    }

    const setCollections =
      type === "rest" ? setRESTCollections : setGraphqlCollections

    try {
      const collectionsDir =
        type === "rest" ? REST_COLLECTIONS_DIR : GQL_COLLECTIONS_DIR
      const collectionsPath = this.fs.joinPath(workspacePath, collectionsDir)
      console.log("[WCS] Collections path:", collectionsPath)

      // Check if collections directory exists
      const exists = await this.fs.dirExists(collectionsPath)
      console.log("[WCS] Collections directory exists:", exists)
      if (!exists) {
        console.log("[WCS] Creating default collection for", type)
        // Create default collection
        const defaultCollections = [
          makeCollection({
            name: "My Collection",
            folders: [],
            requests: [],
            auth: { authType: "inherit", authActive: false },
            headers: [],
            variables: [],
            description: null,
          }),
        ]
        setCollections(defaultCollections)

        // Store hash
        const hash = md5(JSON.stringify(defaultCollections))
        this.lastSavedHashes.set(this.getHashKey(workspacePath, type), hash)

        if (type === "rest") {
          this.isLoadingRest = false
        } else {
          this.isLoadingGql = false
        }
        return
      }

      // Read all collection directories
      const entries = await this.fs.readDir(collectionsPath)
      entries.sort()
      console.log("[WCS] Collection entries:", entries)
      const collections: AukCollection[] = []

      for (const entry of entries) {
        // Skip hidden files
        if (entry.startsWith(".")) continue

        const collection = await this.loadCollection(
          this.fs.joinPath(collectionsPath, entry),
          type
        )
        if (collection) {
          console.log(
            "[WCS] Loaded collection:",
            collection.name,
            "with",
            collection.requests.length,
            "requests"
          )
          collections.push(collection)
        }
      }

      // If no collections found, create a default one
      if (collections.length === 0) {
        console.log("[WCS] No collections found, creating default")
        collections.push(
          makeCollection({
            name: "My Collection",
            folders: [],
            requests: [],
            auth: { authType: "inherit", authActive: false },
            headers: [],
            variables: [],
            description: null,
          })
        )
      }

      // Update the store
      console.log(
        "[WCS] Setting",
        collections.length,
        type,
        "collections to store"
      )
      setCollections(collections)

      // Update hash
      const hash = md5(JSON.stringify(collections))
      this.lastSavedHashes.set(this.getHashKey(workspacePath, type), hash)

      console.log("[WCS] Collections set successfully")
      console.log(
        `[WCS] Loaded ${collections.length} ${type} collections from ${workspacePath}`
      )
    } catch (error) {
      console.error(`[WCS] Failed to load ${type} collections:`, error)
      // Set default collection on error
      const defaultCollections = [
        makeCollection({
          name: "My Collection",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: false },
          headers: [],
          variables: [],
          description: null,
        }),
      ]
      setCollections(defaultCollections)

      // Store hash
      const hash = md5(JSON.stringify(defaultCollections))
      this.lastSavedHashes.set(this.getHashKey(workspacePath, type), hash)
    } finally {
      if (type === "rest") {
        this.isLoadingRest = false
      } else {
        this.isLoadingGql = false
      }
      console.log("[WCS] Loading complete for", type)
    }
  }

  /**
   * Load a single collection from the file system
   */
  private async loadCollection(
    collectionPath: string,
    type: "rest" | "graphql"
  ): Promise<AukCollection | null> {
    try {
      console.log("[WCS] loadCollection:", collectionPath, "type:", type)
      // Read collection metadata
      const metaPath = this.fs.joinPath(collectionPath, COLLECTION_META_FILE)
      let meta: Record<string, unknown> = {}

      try {
        const metaContent = await this.fs.readFile(metaPath)
        meta = JSON.parse(metaContent)
      } catch {
        // No metadata file, use directory name as collection name
        meta = {
          name: this.fs.getBaseName(collectionPath),
        }
      }

      // Load requests
      const requests: (AukRESTRequest | AukGQLRequest)[] = []
      const requestsPath = this.fs.joinPath(collectionPath, REQUESTS_DIR)

      try {
        const requestFiles = await this.fs.readDir(requestsPath)
        console.log("[WCS] Request files found:", requestFiles.length)
        // Sort by filename to maintain order
        requestFiles.sort()

        for (const file of requestFiles) {
          if (file.endsWith(".json")) {
            try {
              const content = await this.fs.readFile(
                this.fs.joinPath(requestsPath, file)
              )
              const rawRequest = JSON.parse(content)
              // Use translate functions to ensure _ref_id is set
              const request =
                type === "rest"
                  ? translateToNewRequest(rawRequest)
                  : translateToGQLRequest(rawRequest)

              // Ensure request has an ID (use _ref_id as fallback)
              if (!request.id) {
                Object.assign(request, { id: (request as any)._ref_id })
              }

              console.log("[WCS] Loaded request:", request.name, "type:", type)
              requests.push(request)
            } catch (e) {
              console.error("[WCS] Failed to load request file:", file, e)
            }
          }
        }
      } catch (e) {
        console.log("[WCS] No requests directory or error:", e)
      }

      console.log("[WCS] Total requests loaded:", requests.length)

      // Load sub-folders (sub-collections)
      const folders: AukCollection[] = []

      try {
        const entries = await this.fs.readDir(collectionPath)
        entries.sort()

        for (const entry of entries) {
          // Skip special directories and files
          if (
            entry === REQUESTS_DIR ||
            entry === COLLECTION_META_FILE ||
            entry.startsWith(".")
          ) {
            continue
          }

          const entryPath = this.fs.joinPath(collectionPath, entry)
          const isDir = await this.fs.dirExists(entryPath)

          if (isDir) {
            const subCollection = await this.loadCollection(entryPath, type)
            if (subCollection) {
              folders.push(subCollection)
            }
          }
        }
      } catch {
        // Error reading directory
      }

      const collection = makeCollection({
        _ref_id: meta._ref_id as string | undefined,
        id: meta.id as string | undefined,
        name: (meta.name as string) || "Unnamed Collection",
        description: (meta.description as string) || null,
        auth: (meta.auth as AukCollection["auth"]) || {
          authType: "inherit",
          authActive: false,
        },
        headers: (meta.headers as AukCollection["headers"]) || [],
        variables: (meta.variables as AukCollection["variables"]) || [],
        folders,
        requests,
      })

      console.log(
        "[WCS] makeCollection result - requests:",
        collection.requests.length
      )
      return collection
    } catch (error) {
      console.error(`Failed to load collection from ${collectionPath}:`, error)
      return null
    }
  }

  /**
   * Force save current collections to workspace
   */
  async forceSave(): Promise<void> {
    const { currentWorkspace } = useWorkspaceStore()
    if (currentWorkspace.value) {
      await this.saveAllCollectionsToWorkspace(currentWorkspace.value.path)
    }
  }

  /**
   * Force reload collections from workspace
   */
  async forceReload(): Promise<void> {
    const { currentWorkspace } = useWorkspaceStore()
    if (currentWorkspace.value) {
      await this.loadAllCollectionsFromWorkspace(currentWorkspace.value.path)
    }
  }
}
