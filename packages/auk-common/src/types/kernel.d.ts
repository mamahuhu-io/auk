import type { KernelAPI } from "@auk/kernel"

declare global {
  interface Window {
    __KERNEL__?: KernelAPI
  }
}

export {}
