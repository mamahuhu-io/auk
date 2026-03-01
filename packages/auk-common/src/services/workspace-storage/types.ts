/**
 * Workspace Storage Types
 * Git-friendly file structure for local-first storage
 */

import { z } from "zod"

// Git configuration for a workspace
export const GitConfigSchema = z.object({
  enabled: z.boolean().default(false),
  remote: z.string().optional(),
  branch: z.string().default("main"),
  autoSync: z.boolean().default(true),
  syncInterval: z.number().default(300), // seconds
  authMethod: z.enum(["none", "https", "oauth", "ssh"]).default("ssh"),
  token: z.string().optional(),
  oauthAccountId: z.string().optional(),
})

export type GitConfig = z.infer<typeof GitConfigSchema>

// Workspace configuration
export const WorkspaceSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  path: z.string(), // local filesystem path
  git: GitConfigSchema.optional(),
  settings: z
    .object({
      defaultEnvironment: z.string().optional(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Workspace = z.infer<typeof WorkspaceSchema>

// Workspace list (stored in app config directory)
export const WorkspaceListSchema = z.object({
  version: z.literal(1),
  currentWorkspaceId: z.string().optional(),
  workspaces: z.array(WorkspaceSchema),
})

export type WorkspaceList = z.infer<typeof WorkspaceListSchema>

// Collection metadata (stored in collection.json)
export const CollectionMetaSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  auth: z.unknown().optional(),
  headers: z.array(z.unknown()).optional(),
  variables: z.array(z.unknown()).optional(),
  order: z.array(z.string()).optional(), // ordered list of request/folder IDs
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CollectionMeta = z.infer<typeof CollectionMetaSchema>

// Request file structure
export const RequestFileSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  method: z.string(),
  endpoint: z.string(),
  params: z.array(z.unknown()).optional(),
  headers: z.array(z.unknown()).optional(),
  body: z.unknown().optional(),
  auth: z.unknown().optional(),
  preRequestScript: z.string().optional(),
  testScript: z.string().optional(),
  requestVariables: z.array(z.unknown()).optional(),
  responses: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type RequestFile = z.infer<typeof RequestFileSchema>

// Environment file structure
export const EnvironmentFileSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      secret: z.boolean().default(false),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type EnvironmentFile = z.infer<typeof EnvironmentFileSchema>

// File system operations interface
export interface FileSystemOps {
  // File operations
  readFile(path: string): Promise<string>
  /**
   * Write file with lock protection (delegates to writeFileAtomic).
   * @deprecated Use writeFileAtomic directly for clarity
   */
  writeFile(path: string, content: string): Promise<void>
  /**
   * Atomic write with proper lock protection.
   * - Acquires gitSyncLock (read) to prevent writes during Git sync
   * - Acquires fileLock for the specific path to prevent concurrent writes
   * - Uses temp file + rename for atomic write
   */
  writeFileAtomic(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  fileExists(path: string): Promise<boolean>
  rename(oldPath: string, newPath: string): Promise<void>
  watch(
    path: string,
    callback: (events: { type: string; paths: string[] }) => void
  ): Promise<() => void>

  // Directory operations
  readDir(path: string): Promise<string[]>
  createDir(path: string): Promise<void>
  deleteDir(path: string): Promise<void>
  dirExists(path: string): Promise<boolean>

  // Path operations
  joinPath(...parts: string[]): string
  getBaseName(path: string): string
  getDirName(path: string): string
}

// Workspace storage service interface
export interface WorkspaceStorageService {
  // Workspace management
  getWorkspaceList(): Promise<WorkspaceList>
  saveWorkspaceList(list: WorkspaceList): Promise<void>
  getCurrentWorkspace(): Promise<Workspace | null>
  setCurrentWorkspace(workspaceId: string): Promise<void>

  // Collection operations
  listCollections(workspacePath: string): Promise<CollectionMeta[]>
  getCollection(
    workspacePath: string,
    collectionId: string
  ): Promise<CollectionMeta | null>
  saveCollection(
    workspacePath: string,
    collection: CollectionMeta
  ): Promise<void>
  deleteCollection(workspacePath: string, collectionId: string): Promise<void>

  // Request operations
  listRequests(
    workspacePath: string,
    collectionPath: string
  ): Promise<RequestFile[]>
  getRequest(
    workspacePath: string,
    collectionPath: string,
    requestId: string
  ): Promise<RequestFile | null>
  saveRequest(
    workspacePath: string,
    collectionPath: string,
    request: RequestFile
  ): Promise<void>
  deleteRequest(
    workspacePath: string,
    collectionPath: string,
    requestId: string
  ): Promise<void>

  // Environment operations
  listEnvironments(workspacePath: string): Promise<EnvironmentFile[]>
  getEnvironment(
    workspacePath: string,
    envId: string
  ): Promise<EnvironmentFile | null>
  saveEnvironment(workspacePath: string, env: EnvironmentFile): Promise<void>
  deleteEnvironment(workspacePath: string, envId: string): Promise<void>
}
