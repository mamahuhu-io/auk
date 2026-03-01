/**
 * File System Operations Implementation
 * Uses Tauri's file system API for desktop mode
 */

import type { FileSystemOps } from "./types"
import { fileLock, gitSyncLock } from "./async-lock"
import { logger } from "./utils"
import { fsAPI } from "~/platform/desktop/tauri"

const LOG_PREFIX = "FS"

/**
 * Tauri Desktop File System Implementation
 */
class TauriFileSystemOps implements FileSystemOps {
  async readFile(path: string): Promise<string> {
    logger.debug(LOG_PREFIX, "readFile:", path)
    try {
      const content = await fsAPI.readTextFile(path)
      // Handle ArrayBuffer response (Tauri may return ArrayBuffer instead of string)
      if ((content as unknown) instanceof ArrayBuffer) {
        const decoder = new TextDecoder("utf-8")
        const text = decoder.decode(content as unknown as ArrayBuffer)
        logger.debug(
          LOG_PREFIX,
          "readFile success (decoded from ArrayBuffer):",
          path
        )
        return text
      }
      if (typeof content !== "string") {
        logger.error(
          LOG_PREFIX,
          "readFile returned unexpected type:",
          typeof content,
          content
        )
        return String(content)
      }
      logger.debug(LOG_PREFIX, "readFile success:", path)
      return content
    } catch (error) {
      logger.error(LOG_PREFIX, "readFile error:", path, error)
      throw error
    }
  }

  /**
   * Write file with lock protection.
   * This method delegates to writeFileAtomic to ensure proper concurrency control.
   * @deprecated Use writeFileAtomic directly for clarity
   */
  async writeFile(path: string, content: string): Promise<void> {
    logger.debug(LOG_PREFIX, "writeFile (delegating to writeFileAtomic):", path)
    return this.writeFileAtomic(path, content)
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    logger.debug(LOG_PREFIX, "rename:", oldPath, "->", newPath)
    try {
      await fsAPI.rename(oldPath, newPath)
      logger.debug(LOG_PREFIX, "rename success")
    } catch (error) {
      logger.error(LOG_PREFIX, "rename error:", error)
      throw error
    }
  }

  async watch(
    path: string,
    callback: (events: { type: string; paths: string[] }) => void
  ): Promise<() => void> {
    logger.debug(LOG_PREFIX, "watch:", path)

    // Check if Tauri internals are initialized
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window === "undefined" || !(window as any).__TAURI_INTERNALS__) {
      logger.warn(LOG_PREFIX, "Tauri internals not available, watch disabled")
      return () => {}
    }

    try {
      // The watch API returns a promise that resolves to an unwatch function
      // We enable recursive watching to catch changes in subdirectories
      const unwatch = await fsAPI.watch(
        path,
        (event) => {
          // Log the raw event for debugging
          logger.debug(LOG_PREFIX, "watch event:", JSON.stringify(event))

          // Transform Tauri event to our expected format
          let typeStr = "unknown"
          if (typeof event.type === "string") {
            typeStr = event.type
          } else if (typeof event.type === "object") {
            typeStr = JSON.stringify(event.type)
          }

          callback({
            type: typeStr,
            paths: event.paths || [],
          })
        },
        { recursive: true }
      )
      logger.debug(LOG_PREFIX, "watch started:", path)
      return unwatch
    } catch (error) {
      logger.error(LOG_PREFIX, "watch error:", path, error)
      // Return no-op if watch fails
      return () => {}
    }
  }

  async writeFileAtomic(path: string, content: string): Promise<void> {
    logger.debug(LOG_PREFIX, "writeFileAtomic:", path)

    // Track acquired locks to ensure proper cleanup on any failure
    let syncRelease: (() => void) | null = null
    let fileRelease: (() => void) | null = null

    try {
      // Acquire read lock from gitSyncLock to prevent writes during Git sync
      // Multiple writes can happen concurrently, but Git sync will block all writes
      syncRelease = await gitSyncLock.acquireRead()
      logger.debug(
        LOG_PREFIX,
        "writeFileAtomic: git sync read lock acquired for:",
        path
      )

      // Acquire lock for this specific file path to prevent concurrent writes to same file
      fileRelease = await fileLock.acquire(path)
      logger.debug(LOG_PREFIX, "writeFileAtomic: file lock acquired for:", path)

      // Generate unique temp file path
      const tempPath = `${path}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`

      // Ensure parent directory exists
      const dir = this.getDirName(path)
      if (dir && dir !== "/" && dir !== ".") {
        try {
          await fsAPI.mkdir(dir, { recursive: true })
        } catch (_e) {
          // Directory might already exist
        }
      }

      // Step 1: Write to temp file
      await fsAPI.writeTextFile(tempPath, content)
      logger.debug(LOG_PREFIX, "writeFileAtomic: temp file written:", tempPath)

      // Step 2: Atomic rename (POSIX guarantees atomicity)
      try {
        await fsAPI.rename(tempPath, path)
        logger.debug(LOG_PREFIX, "writeFileAtomic success:", path)
      } catch (renameError) {
        // Cleanup temp file if rename fails
        try {
          await fsAPI.remove(tempPath)
        } catch {
          // Temp file might not exist, ignore
        }
        throw renameError
      }
    } catch (error) {
      logger.error(LOG_PREFIX, "writeFileAtomic error:", path, error)
      throw error
    } finally {
      // Always release locks in reverse order of acquisition
      // Only release locks that were successfully acquired
      if (fileRelease) {
        fileRelease()
        logger.debug(
          LOG_PREFIX,
          "writeFileAtomic: file lock released for:",
          path
        )
      }
      if (syncRelease) {
        syncRelease()
        logger.debug(
          LOG_PREFIX,
          "writeFileAtomic: git sync read lock released for:",
          path
        )
      }
    }
  }

  async deleteFile(path: string): Promise<void> {
    logger.debug(LOG_PREFIX, "deleteFile:", path)

    let syncRelease: (() => void) | null = null
    let fileRelease: (() => void) | null = null

    try {
      syncRelease = await gitSyncLock.acquireRead()
      fileRelease = await fileLock.acquire(path)

      await fsAPI.remove(path)
      logger.debug(LOG_PREFIX, "deleteFile success:", path)
    } catch (error) {
      logger.error(LOG_PREFIX, "deleteFile error:", path, error)
      throw error
    } finally {
      if (fileRelease) fileRelease()
      if (syncRelease) syncRelease()
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const fileExists = await fsAPI.exists(path)
      if (!fileExists) return false
      const info = await fsAPI.stat(path)
      return info.isFile
    } catch {
      return false
    }
  }

  async readDir(path: string): Promise<string[]> {
    logger.debug(LOG_PREFIX, "readDir:", path)
    try {
      const entries = await fsAPI.readDir(path)
      logger.debug(
        LOG_PREFIX,
        "readDir success:",
        path,
        entries.map((e) => e.name)
      )
      return entries.map((e) => e.name)
    } catch (error) {
      logger.error(LOG_PREFIX, "readDir error:", path, error)
      return []
    }
  }

  async createDir(path: string): Promise<void> {
    logger.debug(LOG_PREFIX, "createDir:", path)
    try {
      await fsAPI.mkdir(path, { recursive: true })
      logger.debug(LOG_PREFIX, "createDir success:", path)
    } catch (error) {
      logger.error(LOG_PREFIX, "createDir error:", path, error)
      throw error
    }
  }

  async deleteDir(path: string): Promise<void> {
    logger.debug(LOG_PREFIX, "deleteDir:", path)

    let syncRelease: (() => void) | null = null
    let fileRelease: (() => void) | null = null

    try {
      syncRelease = await gitSyncLock.acquireRead()
      fileRelease = await fileLock.acquire(path)

      await fsAPI.remove(path, { recursive: true })
      logger.debug(LOG_PREFIX, "deleteDir success:", path)
    } catch (error) {
      logger.error(LOG_PREFIX, "deleteDir error:", path, error)
      throw error
    } finally {
      if (fileRelease) fileRelease()
      if (syncRelease) syncRelease()
    }
  }

  async dirExists(path: string): Promise<boolean> {
    logger.debug(LOG_PREFIX, "dirExists:", path)
    try {
      const dirExists = await fsAPI.exists(path)
      if (!dirExists) return false
      const info = await fsAPI.stat(path)
      logger.debug(LOG_PREFIX, "dirExists result:", path, info.isDirectory)
      return info.isDirectory
    } catch (error) {
      logger.error(LOG_PREFIX, "dirExists error:", path, error)
      return false
    }
  }

  /**
   * Join path parts (cross-platform: uses forward slash as output)
   */
  joinPath(...parts: string[]): string {
    // Normalize all separators to forward slash, then clean up
    return parts
      .map((p) => p.replace(/\\/g, "/"))
      .join("/")
      .replace(/\/+/g, "/")
  }

  /**
   * Get base name from path (cross-platform: handles both / and \)
   */
  getBaseName(path: string): string {
    // Split by both forward and back slashes
    const parts = path.split(/[/\\]/)
    return parts[parts.length - 1] || ""
  }

  /**
   * Get directory name from path (cross-platform: handles both / and \)
   */
  getDirName(path: string): string {
    // Split by both forward and back slashes
    const parts = path.split(/[/\\]/)
    parts.pop()
    // Use forward slash for output (Tauri FS API accepts both)
    return parts.join("/") || "/"
  }
}

/**
 * Get the file system implementation
 */
export function getFileSystemOps(): FileSystemOps {
  return new TauriFileSystemOps()
}

// Export singleton instance
let fsOpsInstance: FileSystemOps | null = null

export function getFileSystem(): FileSystemOps {
  if (!fsOpsInstance) {
    fsOpsInstance = getFileSystemOps()
  }
  return fsOpsInstance
}
