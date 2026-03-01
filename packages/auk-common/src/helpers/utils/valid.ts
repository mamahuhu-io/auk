const [wsRegexIP, wsRegexHostname] = generateREForProtocol("^(wss?:\\/\\/)?")
const [sseRegexIP, sseRegexHostname] =
  generateREForProtocol("^(https?:\\/\\/)?")
const [socketioRegexIP, socketioRegexHostname] = generateREForProtocol(
  "^((wss?:\\/\\/)|(https?:\\/\\/))?"
)

function generateREForProtocol(protocol: string): [RegExp, RegExp] {
  return [
    new RegExp(
      `${protocol}(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$`
    ),
    new RegExp(
      `${protocol}(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])$`
    ),
  ]
}

/**
 * valid url for ws/wss
 */
export function wsValid(url: string): boolean {
  return wsRegexIP.test(url) || wsRegexHostname.test(url)
}

/**
 * valid url for http/https
 */
export function httpValid(url: string): boolean {
  return sseRegexIP.test(url) || sseRegexHostname.test(url)
}

/**
 * valid url for ws/wss/http/https
 */
export function socketioValid(url: string): boolean {
  return socketioRegexIP.test(url) || socketioRegexHostname.test(url)
}
