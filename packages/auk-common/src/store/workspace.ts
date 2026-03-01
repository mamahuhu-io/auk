/**
 * Workspace Store
 * Reactive state management for workspaces
 */

import { BehaviorSubject } from "rxjs"
import { ref, computed } from "vue"
import type {
  Workspace,
  WorkspaceList,
  GitConfig,
} from "~/services/workspace-storage/types"
import { getWorkspaceStorageService } from "~/services/workspace-storage"
import {
  getAppDataDirectory,
  isDesktopPlatform,
  joinPath,
} from "~/platform/capabilities"

// ==================== State ====================

const workspaceList$ = new BehaviorSubject<WorkspaceList>({
  version: 1,
  currentWorkspaceId: undefined,
  workspaces: [],
})

// Vue reactive refs for component usage
const workspaces = ref<Workspace[]>([])
const currentWorkspaceId = ref<string | undefined>(undefined)
const isInitialized = ref(false)
const isLoading = ref(false)

// ==================== Computed ====================

const currentWorkspace = computed(() => {
  if (!currentWorkspaceId.value) return null
  return workspaces.value.find((w) => w.id === currentWorkspaceId.value) || null
})

const hasWorkspaces = computed(() => workspaces.value.length > 0)

// ==================== Actions ====================

/**
 * Initialize the workspace store
 * Creates a default workspace if none exists
 */
async function initializeWorkspaceStore(): Promise<void> {
  if (isInitialized.value) return

  isLoading.value = true
  try {
    const storage = getWorkspaceStorageService()
    let list = await storage.getWorkspaceList()

    // Create default workspace if none exists
    if (list.workspaces.length === 0) {
      let workspacePath = "/auk/default"

      if (isDesktopPlatform()) {
        try {
          const baseDir = await getAppDataDirectory()
          workspacePath = await joinPath(baseDir, "workspaces", "default")
        } catch (e) {
          console.error("Failed to resolve desktop path:", e)
        }
      }

      const defaultWorkspace = await storage.createWorkspace(
        "Default Workspace",
        workspacePath,
        {
          description: "Your default workspace for API collections",
        }
      )
      list = {
        ...list,
        workspaces: [defaultWorkspace],
        currentWorkspaceId: defaultWorkspace.id,
      }
    }

    workspaces.value = list.workspaces
    currentWorkspaceId.value = list.currentWorkspaceId

    workspaceList$.next(list)
    isInitialized.value = true
  } finally {
    isLoading.value = false
  }
}

/**
 * Create a new workspace
 */
async function createWorkspace(
  name: string,
  path: string,
  options?: {
    description?: string
    git?: GitConfig
  }
): Promise<Workspace> {
  // Check for existing workspace with same name and path
  const normalizedPath = normalizePath(path)
  const existingWorkspace = workspaces.value.find(
    (w) => w.name === name && w.path === path
  )

  if (existingWorkspace) {
    return existingWorkspace
  }

  const pathTaken = workspaces.value.some(
    (w) => normalizePath(w.path) === normalizedPath
  )
  if (pathTaken) {
    throw new Error("WORKSPACE_PATH_IN_USE")
  }

  const storage = getWorkspaceStorageService()
  const workspace = await storage.createWorkspace(name, path, options)

  // Update local state by fetching the latest list from storage
  // This prevents duplicate entries if storage modifies the list in place
  const list = await storage.getWorkspaceList()
  workspaces.value = list.workspaces

  // Switch to the new workspace
  await switchWorkspace(workspace.id)

  return workspace
}

/**
 * Switch to a different workspace
 */
async function switchWorkspace(workspaceId: string): Promise<void> {
  const workspace = workspaces.value.find((w) => w.id === workspaceId)
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`)
  }

  const storage = getWorkspaceStorageService()
  await storage.setCurrentWorkspace(workspaceId)

  currentWorkspaceId.value = workspaceId

  workspaceList$.next({
    version: 1,
    currentWorkspaceId: workspaceId,
    workspaces: workspaces.value,
  })
}

/**
 * Update a workspace
 */
async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Omit<Workspace, "id" | "version" | "createdAt">>
): Promise<void> {
  const index = workspaces.value.findIndex((w) => w.id === workspaceId)
  if (index === -1) {
    throw new Error(`Workspace not found: ${workspaceId}`)
  }

  const updatedWorkspace: Workspace = {
    ...workspaces.value[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  const newWorkspaces = [...workspaces.value]
  newWorkspaces[index] = updatedWorkspace
  workspaces.value = newWorkspaces

  // Save to storage
  const storage = getWorkspaceStorageService()
  await storage.saveWorkspaceList({
    version: 1,
    currentWorkspaceId: currentWorkspaceId.value,
    workspaces: newWorkspaces,
  })

  workspaceList$.next({
    version: 1,
    currentWorkspaceId: currentWorkspaceId.value,
    workspaces: newWorkspaces,
  })
}

/**
 * Delete a workspace
 */
async function deleteWorkspace(workspaceId: string): Promise<void> {
  if (workspaces.value.length <= 1) {
    throw new Error("Cannot delete the last workspace")
  }

  const storage = getWorkspaceStorageService()
  await storage.deleteWorkspace(workspaceId)

  // Update local state
  workspaces.value = workspaces.value.filter((w) => w.id !== workspaceId)

  // Update current workspace if needed
  if (currentWorkspaceId.value === workspaceId) {
    currentWorkspaceId.value = workspaces.value[0]?.id
  }

  workspaceList$.next({
    version: 1,
    currentWorkspaceId: currentWorkspaceId.value,
    workspaces: workspaces.value,
  })
}

/**
 * Get workspace by ID
 */
function getWorkspaceById(workspaceId: string): Workspace | undefined {
  return workspaces.value.find((w) => w.id === workspaceId)
}

/**
 * Check if this is the first run (no workspaces)
 */
function isFirstRun(): boolean {
  return isInitialized.value && workspaces.value.length === 0
}

// Vue composable
export function useWorkspaceStore() {
  return {
    // State
    workspaces,
    currentWorkspaceId,
    currentWorkspace,
    hasWorkspaces,
    isInitialized,
    isLoading,

    // Actions
    initializeWorkspaceStore,
    createWorkspace,
    switchWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceById,
    isFirstRun,
  }
}

function normalizePath(value: string) {
  return value.trim().replace(/[\\/]+$/, "")
}

// Direct exports for non-Vue usage
export {
  initializeWorkspaceStore,
  createWorkspace,
  switchWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceById,
  isFirstRun,
}

// Re-export types
export type {
  Workspace,
  WorkspaceList,
  GitConfig,
} from "~/services/workspace-storage/types"
