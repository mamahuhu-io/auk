interface ParsedUrlAndPath {
  url: string
  path: string
}

export function parseUrlAndPath(value: string): ParsedUrlAndPath {
  const result: ParsedUrlAndPath = { url: "", path: "" }
  try {
    const url = new URL(value)
    result.url = url.origin
    result.path = url.pathname
  } catch (_e) {
    const uriRegex = value.match(
      /^((http[s]?:\/\/)?(<<[^/]+>>)?[^/]*|)(\/?.*)$/
    )
    if (uriRegex) {
      result.url = uriRegex[1] || ""
      result.path = uriRegex[4] || ""
    }
  }
  return result
}
