import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import type { EnvMethods, RequestProps, AukNamespaceMethods } from "~/types"
import type { EnvAPIOptions } from "~/utils/shared"

/**
 * Creates auk namespace methods for the sandbox environment
 * Includes environment operations with auk-specific API
 */
export const createAukNamespaceMethods = (
  ctx: CageModuleCtx,
  envMethods: EnvMethods,
  requestProps: RequestProps
): AukNamespaceMethods => {
  return {
    // `auk` namespace environment methods
    envDelete: defineSandboxFn(
      ctx,
      "envDelete",
      function (key: unknown, options?: unknown) {
        return envMethods.auk.delete(key as string, options as EnvAPIOptions)
      }
    ),
    envReset: defineSandboxFn(
      ctx,
      "envReset",
      function (key: unknown, options?: unknown) {
        return envMethods.auk.reset(key as string, options as EnvAPIOptions)
      }
    ),
    envGetInitialRaw: defineSandboxFn(
      ctx,
      "envGetInitialRaw",
      function (key: unknown, options?: unknown) {
        return envMethods.auk.getInitialRaw(
          key as string,
          options as EnvAPIOptions
        )
      }
    ),
    envSetInitial: defineSandboxFn(
      ctx,
      "envSetInitial",
      function (key: unknown, value: unknown, options?: unknown) {
        return envMethods.auk.setInitial(
          key as string,
          value as string,
          options as EnvAPIOptions
        )
      }
    ),

    // Request getter props
    getRequestProps: defineSandboxFn(ctx, "getRequestProps", function () {
      return {
        get url() {
          return requestProps.url
        },
        get method() {
          return requestProps.method
        },
        get params() {
          return requestProps.params
        },
        get headers() {
          return requestProps.headers
        },
        get body() {
          return requestProps.body
        },
        get auth() {
          return requestProps.auth
        },
      }
    }),
  }
}
