import {
  blobPolyfill,
  ConsoleEntry,
  console as ConsoleModule,
  encoding,
  esmModuleLoader,
  timers,
  urlPolyfill,
} from "faraday-cage/modules"
import type { AukFetchHook } from "~/types"
import { customCryptoModule } from "./crypto"
import { customFetchModule } from "./fetch"

type DefaultModulesConfig = {
  handleConsoleEntry?: (consoleEntries: ConsoleEntry) => void
  aukFetchHook?: AukFetchHook
}

export const defaultModules = (config?: DefaultModulesConfig) => {
  return [
    urlPolyfill,
    blobPolyfill,
    ConsoleModule({
      onLog(level, ...args) {
        console[level](...args)

        if (config?.handleConsoleEntry) {
          config.handleConsoleEntry({
            type: level,
            args,
            timestamp: Date.now(),
          })
        }
      },
      onCount(...args) {
        console.count(args[0])
      },
      onTime(...args) {
        console.timeEnd(args[0])
      },
      onTimeLog(...args) {
        console.timeLog(...args)
      },
      onGroup(...args) {
        console.group(...args)
      },
      onGroupEnd(...args) {
        console.groupEnd(...args)
      },
      onClear(...args) {
        console.clear(...args)
      },
      onAssert(...args) {
        console.assert(...args)
      },
      onDir(...args) {
        console.dir(...args)
      },
      onTable(...args) {
        console.table(...args)
      },
    }),
    customCryptoModule({
      cryptoImpl: globalThis.crypto,
    }),

    esmModuleLoader,
    // Use custom fetch module with AukFetchHook
    customFetchModule({
      fetchImpl: config?.aukFetchHook,
    }),
    encoding(),
    timers(),
  ]
}
