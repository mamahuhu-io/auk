/**
 * Local Settings Platform Definition
 * For local-first mode without remote backend sync
 */

import { SettingsPlatformDef } from "@auk/common/platform/settings"

/**
 * No-op initialization - settings are stored locally only
 */
function initSettingsSync() {
  // Local mode: no backend sync needed
  // Settings are persisted via local storage
}

export const def: SettingsPlatformDef = {
  initSettingsSync,
}
