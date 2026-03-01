import { getDefaultRESTRequest } from "@auk/data"
import { describe, expect, test } from "vitest"

import { Cookie, TestResponse } from "~/types"
import { runPreRequestScript, runTestScript } from "~/web"

const baseCookies: Cookie[] = [
  {
    name: "session_id",
    value: "abc123",
    domain: "example.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  },
  {
    name: "pref",
    value: "dark",
    domain: "example.com",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Strict",
  },
]

const defaultRequest = getDefaultRESTRequest()

describe("auk.cookies", () => {
  test("auk.cookies.get should return a specific cookie", async () => {
    await expect(
      runPreRequestScript(
        `console.log(auk.cookies.get("example.com", "session_id"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [
              {
                name: "session_id",
                value: "abc123",
                domain: "example.com",
                path: "/",
                httpOnly: true,
                secure: true,
                sameSite: "Lax",
              },
            ],
          }),
        ],
      })
    )
  })

  test("auk.cookies.get should return null for missing cookie", async () => {
    await expect(
      runPreRequestScript(
        `console.log(auk.cookies.get("example.com", "unknown"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [null] })],
      })
    )
  })

  test("auk.cookies.has should return true if cookie exists", async () => {
    await expect(
      runPreRequestScript(
        `console.log(auk.cookies.has("example.com", "session_id"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [true],
          }),
        ],
      })
    )
  })

  test("auk.cookies.has should return false if cookie does not exist", async () => {
    await expect(
      runPreRequestScript(
        `console.log(auk.cookies.has("example.com", "missing"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [false],
          }),
        ],
      })
    )
  })

  test("auk.cookies.getAll should return all cookies for a domain", () => {
    return expect(
      runPreRequestScript(`console.log(auk.cookies.getAll("example.com"))`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [
              [
                {
                  name: "session_id",
                  value: "abc123",
                  domain: "example.com",
                  path: "/",
                  httpOnly: true,
                  secure: true,
                  sameSite: "Lax",
                },
                {
                  name: "pref",
                  value: "dark",
                  domain: "example.com",
                  path: "/",
                  httpOnly: false,
                  secure: false,
                  sameSite: "Strict",
                },
              ],
            ],
          }),
        ],
      })
    )
  })

  test("auk.cookies.set should add a new cookie", () => {
    return expect(
      runPreRequestScript(
        `
          const newCookie = {
          name: "new_cookie",
          value: "new_value",
          domain: "example.com",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "None",
        }

        auk.cookies.set("example.com", newCookie)
        `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.arrayContaining([
          expect.objectContaining({
            name: "new_cookie",
            value: "new_value",
            domain: "example.com",
            path: "/",
            httpOnly: false,
            secure: false,
            sameSite: "None",
          }),
        ]),
      })
    )
  })

  test("auk.cookies.set should replace existing cookie with same domain+name", () => {
    const updated = { ...baseCookies[0], value: "updated123" }
    return expect(
      runPreRequestScript(
        `auk.cookies.set("example.com", ${JSON.stringify(updated)})`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.arrayContaining([
          expect.objectContaining({ value: "updated123" }),
        ]),
      })
    )
  })

  test("auk.cookies.delete should remove a specific cookie", () => {
    return expect(
      runPreRequestScript(`auk.cookies.delete("example.com", "pref")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.not.arrayContaining([
          expect.objectContaining({ name: "pref" }),
        ]),
      })
    )
  })

  test("auk.cookies.clear should remove all cookies for a domain", () => {
    return expect(
      runPreRequestScript(`auk.cookies.clear("example.com")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.not.arrayContaining([
          expect.objectContaining({ domain: "example.com" }),
        ]),
      })
    )
  })

  test("auk.cookies methods throw for non-string domain and/or name args", async () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    await expect(
      runPreRequestScript(`auk.cookies.get(123, "test")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      })
    ).resolves.toBeLeft()

    await expect(
      runPreRequestScript(`auk.cookies.delete("example.com", 456)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      })
    ).resolves.toBeLeft()

    await expect(
      runTestScript(`auk.cookies.get(123, "test")`, {
        envs,
        request: defaultRequest,
        cookies: undefined,
        response,
      })
    ).resolves.toBeLeft()

    await expect(
      runTestScript(`auk.cookies.delete("example.com", 456)`, {
        envs,
        request: defaultRequest,
        cookies: undefined,
        response,
      })
    ).resolves.toBeLeft()
  })

  test("auk.cookies.set throw if attempting to set cookie not conforming to the expected shape", async () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    const script = `auk.cookies.set("example.com", "test")`

    await expect(
      runPreRequestScript(script, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      })
    ).resolves.toBeLeft()

    await expect(
      runTestScript(script, {
        envs,
        request: defaultRequest,
        cookies: undefined,
        response,
      })
    ).resolves.toBeLeft()
  })

  test("auk.cookies throws an exception on unsupported platforms", async () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    await expect(
      runPreRequestScript(
        `console.log(auk.cookies.get("example.com", "session_id"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          // `cookies` specified as `undefined` indicates unsupported platform
          cookies: undefined,
        }
      )
    ).resolves.toBeLeft()

    await expect(
      runTestScript(
        `console.log(auk.cookies.get("example.com", "session_id"))`,
        {
          envs,
          request: defaultRequest,
          cookies: undefined,
          response,
        }
      )
    ).resolves.toBeLeft()
  })

  test("auk.cookies API should be available in post-request context", () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    return expect(
      runTestScript(
        `
        auk.test("Cookies operations work correctly", () => {
          auk.expect(auk.cookies.has("example.com", "session_id")).toBe(true)
          auk.expect(auk.cookies.get("example.com", "pref").value).toBe("dark")

          auk.cookies.set("example.com", {
            name: "post_cookie",
            value: "post_value",
            domain: "example.com",
            path: "/",
            httpOnly: false,
            secure: false,
            sameSite: "None",
          })

          auk.expect(auk.cookies.has("example.com", "post_cookie")).toBe(true)
          auk.expect(auk.cookies.getAll("example.com").length).toBe(3)

          auk.cookies.delete("example.com", "session_id")

          auk.expect(auk.cookies.has("example.com", "session_id")).toBe(false)
        })
        `,
        {
          envs,
          request: defaultRequest,
          cookies: baseCookies,
          response,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "Cookies operations work correctly",
              expectResults: [
                { status: "pass", message: "Expected 'true' to be 'true'" },
                { status: "pass", message: "Expected 'dark' to be 'dark'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
                { status: "pass", message: "Expected '3' to be '3'" },
                { status: "pass", message: "Expected 'false' to be 'false'" },
              ],
            }),
          ],
        }),
        updatedCookies: expect.arrayContaining([
          expect.objectContaining({ name: "post_cookie", value: "post_value" }),
        ]),
      })
    )
  })
})
