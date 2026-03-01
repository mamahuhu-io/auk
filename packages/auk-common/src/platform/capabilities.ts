import { getKernelMode } from "@auk/kernel"

export function isDesktopPlatform() {
  return getKernelMode() === "desktop"
}

export async function invokeDesktopCommand<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isDesktopPlatform()) {
    throw new Error(
      `Desktop command '${cmd}' is not available on this platform`
    )
  }

  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(cmd, args)
}

export async function getPlatformFetch(): Promise<typeof fetch> {
  if (!isDesktopPlatform()) return fetch

  const mod = await import("@tauri-apps/plugin-http")
  return mod.fetch as unknown as typeof fetch
}

export async function openExternalURL(url: string): Promise<void> {
  if (isDesktopPlatform()) {
    const { open } = await import("@tauri-apps/plugin-shell")
    await open(url)
    return
  }

  window.open(url, "_blank", "noopener,noreferrer")
}

export async function selectDirectory(title: string): Promise<string | null> {
  if (!isDesktopPlatform()) return null

  const { open } = await import("@tauri-apps/plugin-dialog")
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  })

  return typeof selected === "string" ? selected : null
}

export async function getAppDataDirectory(): Promise<string> {
  if (!isDesktopPlatform()) {
    throw new Error("App data directory is only available on desktop")
  }

  const { appDataDir } = await import("@tauri-apps/api/path")
  return appDataDir()
}

export async function joinPath(...parts: string[]): Promise<string> {
  if (isDesktopPlatform()) {
    const { join } = await import("@tauri-apps/api/path")
    return join(...parts)
  }

  return parts
    .map((p) => p.replace(/\\/g, "/"))
    .join("/")
    .replace(/\/+/g, "/")
}

export async function listenDesktopEvent<TPayload>(
  eventName: string,
  callback: (payload: TPayload) => void
): Promise<() => void> {
  if (!isDesktopPlatform()) return () => {}

  const { listen } = await import("@tauri-apps/api/event")
  return listen<TPayload>(eventName, (event) => callback(event.payload))
}
