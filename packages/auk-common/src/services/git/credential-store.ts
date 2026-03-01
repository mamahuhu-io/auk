/**
 * Credential Store — Keychain-backed secure storage for OAuth tokens
 *
 * On desktop (Tauri), tokens are stored in the system Keychain via the
 * `keyring` Rust crate (macOS Keychain / Windows Credential Manager /
 * Linux Secret Service).
 *
 * On web, falls back to localStorage (same as before).
 */

import { getKernelMode } from "@auk/kernel"
import { invokeDesktopCommand } from "~/platform/capabilities"
import {
  storageGetItem,
  storageRemoveItem,
  storageSetItem,
} from "./browser-storage"

async function tauriInvoke<T>(
  cmd: string,
  args: Record<string, unknown>
): Promise<T> {
  return invokeDesktopCommand<T>(cmd, args)
}

export async function storeCredential(
  key: string,
  value: string
): Promise<void> {
  if (getKernelMode() === "desktop") {
    await tauriInvoke("store_credential", { key, value })
  } else {
    storageSetItem(`__cred_${key}`, value)
  }
}

export async function getCredential(key: string): Promise<string | null> {
  if (getKernelMode() === "desktop") {
    return tauriInvoke<string | null>("get_credential", { key })
  }
  return storageGetItem(`__cred_${key}`)
}

export async function deleteCredential(key: string): Promise<void> {
  if (getKernelMode() === "desktop") {
    await tauriInvoke("delete_credential", { key })
  } else {
    storageRemoveItem(`__cred_${key}`)
  }
}
