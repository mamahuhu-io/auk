/**
 * Local History Platform Definition
 * For local-first mode without remote backend sync
 */

import { HistoryPlatformDef } from "@auk/common/platform/history"

/**
 * No-op initialization - history is stored locally only
 */
function initHistorySync() {
  // Local mode: no backend sync needed
  // History is persisted via local storage
}

export const def: HistoryPlatformDef = {
  initHistorySync,
}
