import { describe, expect, test } from "vitest"
import { parseUrlAndPath } from "../uri"

describe("parseUrlAndPath", () => {
  test("has url and path fields", () => {
    const result = parseUrlAndPath("https://auk.mamahuhu.io/")

    expect(result).toHaveProperty("url")
    expect(result).toHaveProperty("path")
  })

  test("parses out URL correctly", () => {
    const result = parseUrlAndPath("https://auk.mamahuhu.io/test/page")

    expect(result.url).toBe("https://auk.mamahuhu.io")
  })
  test("parses out Path correctly", () => {
    const result = parseUrlAndPath("https://auk.mamahuhu.io/test/page")

    expect(result.path).toBe("/test/page")
  })
})
