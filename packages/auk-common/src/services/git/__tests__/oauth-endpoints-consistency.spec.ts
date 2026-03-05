import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { getOAuthTransportAllowList } from "../oauth-endpoints"

function getRepoRootFromTestFile(): string {
  return resolve(process.cwd(), "..", "..")
}

function normalize(values: string[]): string[] {
  return [...new Set(values)].sort()
}

function getCapabilityOAuthAllowList(repoRoot: string): string[] {
  const raw = readFileSync(
    `${repoRoot}/packages/auk-desktop/src-tauri/capabilities/default.json`,
    "utf8"
  )
  const parsed = JSON.parse(raw) as {
    permissions: Array<string | { identifier?: string; allow?: string[] }>
  }

  const permission = parsed.permissions.find(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      entry.identifier === "http:default"
  )
  if (!permission || typeof permission === "string") {
    throw new Error("Unable to find http:default permission in default.json")
  }
  return permission.allow || []
}

function getRustOAuthAllowList(repoRoot: string): string[] {
  const raw = readFileSync(
    `${repoRoot}/packages/auk-desktop/src-tauri/src/oauth.rs`,
    "utf8"
  )
  const match = raw.match(
    /const ALLOWED_OAUTH_URLS: &\[&str\] = &\[(?<body>[\s\S]*?)\];/
  )
  if (!match?.groups?.body) {
    throw new Error("Unable to find ALLOWED_OAUTH_URLS in oauth.rs")
  }

  const urls = [...match.groups.body.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  return urls
}

describe("oauth endpoint consistency", () => {
  it("keeps OAuth HTTP allowlists in sync across TS, Tauri capabilities and Rust bridge", () => {
    const repoRoot = getRepoRootFromTestFile()
    const tsAllowList = normalize(getOAuthTransportAllowList())
    const capabilityAllowList = normalize(getCapabilityOAuthAllowList(repoRoot))
    const rustAllowList = normalize(getRustOAuthAllowList(repoRoot))

    expect(capabilityAllowList).toEqual(tsAllowList)
    expect(rustAllowList).toEqual(tsAllowList)
  })
})
