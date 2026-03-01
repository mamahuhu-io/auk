/**
 * Local Collections Platform Definition
 * For local-first mode without remote backend sync
 */

import { CollectionsPlatformDef } from "@auk/common/platform/collections"

/**
 * No-op initialization - collections are stored locally only
 */
function initCollectionsSync() {
  // Local mode: no backend sync needed
  // Collections are persisted via local storage/IndexedDB
}

/**
 * No-op load - collections are already in local store
 */
async function loadUserCollections() {
  // Local mode: collections are loaded from local storage automatically
}

/**
 * Import collections to personal workspace (local only)
 */
async function importToPersonalWorkspace(collections: unknown[]) {
  // For local mode, just return the collections as-is
  // The actual import is handled by the common import logic
  return collections
}

export const def: CollectionsPlatformDef = {
  initCollectionsSync,
  loadUserCollections,
  importToPersonalWorkspace,
}
