/**
 * Local Environments Platform Definition
 * For local-first mode without remote backend sync
 */

import { EnvironmentsPlatformDef } from "@auk/common/platform/environments"

/**
 * No-op initialization - environments are stored locally only
 */
function initEnvironmentsSync() {
  // Local mode: no backend sync needed
  // Environments are persisted via local storage
}

export const def: EnvironmentsPlatformDef = {
  initEnvironmentsSync,
}
