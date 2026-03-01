declare module "@auk/common" {
  export const createAukApp: any
}

declare module "@auk/common/platform" {
  export type PlatformDef = any
}

declare module "@auk/common/platform/auth" {
  export type AuthEvent = any
  export type AukUser = any
  export type AuthPlatformDef = any
}

declare module "@auk/common/platform/collections" {
  export type CollectionsPlatformDef = any
}

declare module "@auk/common/platform/environments" {
  export type EnvironmentsPlatformDef = any
}

declare module "@auk/common/platform/history" {
  export type HistoryPlatformDef = any
}

declare module "@auk/common/platform/settings" {
  export type SettingsPlatformDef = any
}

declare module "@auk/common/platform/infra" {
  export type InfraPlatformDef = any
}

declare module "@auk/common/platform/std/kernel-io" {
  export const kernelIO: any
}

declare module "@auk/common/platform/std/ui/footerItem" {
  export const stdFooterItems: any
}

declare module "@auk/common/platform/std/ui/supportOptionsItem" {
  export const stdSupportOptionItems: any
}

declare module "@auk/common/platform/std/kernel-interceptors/native" {
  export const NativeKernelInterceptorService: any
}

declare module "@auk/common/platform/std/kernel-interceptors/proxy" {
  export const ProxyKernelInterceptorService: any
}

declare module "@auk/common/services/workspace-collections.service" {
  export class WorkspaceCollectionsService {}
}

declare module "@auk/common/services/workspace-environments.service" {
  export class WorkspaceEnvironmentsService {}
}

declare module "@auk/common/services/git/sync-manager" {
  export class GitSyncManager {}
}

declare module "@auk/common/modules/dioc" {
  export const getService: any
}

declare module "@auk/common/modules/i18n" {
  export type LanguageChangeListener = (
    locale: string,
    t: (key: string, params?: Record<string, unknown>) => string
  ) => void
  export const getI18n: () => (
    key: string,
    params?: Record<string, unknown>
  ) => string
  export const onAppLanguageChange: (
    listener: LanguageChangeListener
  ) => () => void
}

declare module "@auk/common/composables/toast" {
  export const useToast: any
}

declare module "@auk/common/composables/i18n" {
  export const useI18n: any
}

declare module "@auk/common/platform/capabilities" {
  export function invokeDesktopCommand<T>(
    cmd: string,
    args?: Record<string, unknown>
  ): Promise<T>
  export function listenDesktopEvent<TPayload>(
    eventName: string,
    callback: (payload: TPayload) => void
  ): Promise<() => void>
}

declare module "@auk/common/src/platform/backend" {
  export type BackendPlatformDef = any
}
