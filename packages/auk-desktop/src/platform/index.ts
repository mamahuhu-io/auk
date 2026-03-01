/**
 * Desktop Platform Definition
 * Local-first mode for Auk Desktop
 */

import { ref } from "vue"

import { def as authDef } from "./auth"
import { def as collectionsDef } from "./collections"
import { def as settingsDef } from "./settings"
import { def as historyDef } from "./history"
import { def as environmentsDef } from "./environments"
import { def as backendDef } from "./backend"
import { def as infraDef } from "./infra"
import DesktopUpdaterSettingsSection from "./updater/SettingsSection.vue"
import { DesktopUpdaterService } from "./updater/service"

// Std platform imports
import { kernelIO } from "@auk/common/platform/std/kernel-io"
import { stdFooterItems } from "@auk/common/platform/std/ui/footerItem"
import { stdSupportOptionItems } from "@auk/common/platform/std/ui/supportOptionsItem"

// Kernel interceptors for desktop
import { NativeKernelInterceptorService } from "@auk/common/platform/std/kernel-interceptors/native"
import { ProxyKernelInterceptorService } from "@auk/common/platform/std/kernel-interceptors/proxy"

// Workspace services for file-based storage
import { WorkspaceCollectionsService } from "@auk/common/services/workspace-collections.service"
import { WorkspaceEnvironmentsService } from "@auk/common/services/workspace-environments.service"
import { GitSyncManager } from "@auk/common/services/git/sync-manager"

import type { PlatformDef } from "@auk/common/platform"

const headerPaddingLeft = ref("80px")
const headerPaddingTop = ref("0px")

export const platform: PlatformDef = {
  ui: {
    appHeader: {
      paddingTop: headerPaddingTop,
      paddingLeft: headerPaddingLeft,
    },
    onCodemirrorInstanceMount: () => {},
    additionalFooterMenuItems: stdFooterItems,
    additionalSupportOptionsMenuItems: stdSupportOptionItems,
    additionalSettingsSections: [DesktopUpdaterSettingsSection],
  },
  addedAukModules: [],
  addedServices: [
    WorkspaceCollectionsService,
    WorkspaceEnvironmentsService,
    GitSyncManager,
    DesktopUpdaterService,
  ],
  platformFeatureFlags: {
    exportAsGIST: false,
    hasTelemetry: false,
    cookiesEnabled: true,
    promptAsUsingCookies: false,
  },
  auth: authDef,
  kernelIO,
  sync: {
    environments: environmentsDef,
    collections: collectionsDef,
    settings: settingsDef,
    history: historyDef,
  },
  kernelInterceptors: {
    default: "native",
    interceptors: [
      {
        type: "service",
        service: NativeKernelInterceptorService,
      },
      {
        type: "service",
        service: ProxyKernelInterceptorService,
      },
    ],
  },
  backend: backendDef,
  infra: infraDef,
  limits: {
    collectionImportSizeLimit: 50,
  },
}
