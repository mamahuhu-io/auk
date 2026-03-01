function getBrowserStorage(): Storage {
  return window["localStorage"]
}

export function storageGetItem(key: string): string | null {
  return getBrowserStorage().getItem(key)
}

export function storageSetItem(key: string, value: string): void {
  getBrowserStorage().setItem(key, value)
}

export function storageRemoveItem(key: string): void {
  getBrowserStorage().removeItem(key)
}

export function storageClear(): void {
  getBrowserStorage().clear()
}
