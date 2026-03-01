import { platform } from "~/platform"
import * as E from "fp-ts/Either"

// Default proxy URL
export const DEFAULT_AUK_PROXY_URL = "https://proxy.auk.mamahuhu.io/"

// Get default proxy URL from platform or return default
export const getDefaultProxyUrl = async () => {
  const proxyAppUrl = platform?.infra?.getProxyAppUrl

  if (proxyAppUrl) {
    const res = await proxyAppUrl()

    if (E.isRight(res)) {
      return res.right.value
    }

    return DEFAULT_AUK_PROXY_URL
  }

  return DEFAULT_AUK_PROXY_URL
}
