import { AukRESTAuth, AukRESTReqBody, AukRESTRequest } from "@auk/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript, runTestScript } from "~/web"
import { TestResponse } from "~/types"

const baseRequest: AukRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint: "https://example.com/api",
  method: "GET",
  headers: [{ key: "X-Test", value: "val1", active: true, description: "" }],
  params: [{ key: "q", value: "search", active: true, description: "" }],
  body: { contentType: null, body: null },
  auth: { authType: "none", authActive: false },
  preRequestScript: "",
  testScript: "",
  requestVariables: [{ key: "req-var-1", value: "value-1", active: true }],
  responses: {},
}

const testResponse: TestResponse = {
  status: 200,
  body: "OK",
  headers: [],
  statusText: "OK",
  responseTime: 200,
}

describe("auk.request", () => {
  test("auk.request basic properties are accessible from pre-request script", () => {
    const envs = { global: [], selected: [] }

    return expect(
      runPreRequestScript(
        `
        console.log("URL:", auk.request.url);
        console.log("Method:", auk.request.method);
        console.log("Params:", auk.request.params);
        console.log("Headers:", auk.request.headers);
        console.log("Body:", auk.request.body);
        console.log("Auth:", auk.request.auth);`,
        {
          envs,
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: ["URL:", "https://example.com/api"],
          }),
          expect.objectContaining({
            args: ["Method:", "GET"],
          }),
          expect.objectContaining({
            args: ["Params:", baseRequest.params],
          }),
          expect.objectContaining({
            args: ["Headers:", baseRequest.headers],
          }),
          expect.objectContaining({
            args: ["Body:", baseRequest.body],
          }),
          expect.objectContaining({
            args: ["Auth:", baseRequest.auth],
          }),
        ],
      })
    )
  })

  test("auk.request properties are read-only in both pre-request and test script contexts", () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "test response",
      headers: [],
    }

    // Properties that are read-only in both contexts
    const basicReadOnlyTests = [
      { property: "url", value: "'https://new-url.com'" },
      { property: "method", value: "'PUT'" },
      { property: "params", value: "[]" },
      { property: "headers", value: "[]" },
      { property: "body", value: "{}" },
      { property: "auth", value: "{}" },
    ]

    // Properties that are read-only only in test script context
    const testScriptOnlyReadOnlyTests = [{ property: "variables", value: "{}" }]

    // Test basic properties in pre-request script context
    const preRequestTests = basicReadOnlyTests.map(({ property, value }) =>
      expect(
        runPreRequestScript(`auk.request.${property} = ${value}`, {
          envs,
          request: baseRequest,
        })
      ).resolves.toEqualLeft(
        expect.stringContaining(
          `Script execution failed: auk.request.${property} is read-only`
        )
      )
    )

    // Test all properties in test script context
    const allReadOnlyTests = [
      ...basicReadOnlyTests,
      ...testScriptOnlyReadOnlyTests,
    ]
    const testScriptTests = allReadOnlyTests.map(({ property, value }) =>
      expect(
        runTestScript(`auk.request.${property} = ${value}`, {
          envs,
          request: baseRequest,
          response,
        })
      ).resolves.toEqualLeft(
        expect.stringContaining(
          `Script execution failed: auk.request.${property} is read-only`
        )
      )
    )

    return Promise.all([...preRequestTests, ...testScriptTests])
  })

  test("auk.request.setUrl should update the URL", () => {
    return expect(
      runPreRequestScript(`auk.request.setUrl("https://updated.com/api")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://updated.com/api",
        }),
      })
    )
  })

  test("auk.request.setMethod should update the method (case preserved)", () => {
    return expect(
      runPreRequestScript(`auk.request.setMethod("post")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          method: "post",
        }),
      })
    )
  })

  test("auk.request.setHeader should update existing header case-insensitively", () => {
    return expect(
      runPreRequestScript(`auk.request.setHeader("x-test", "updatedVal")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [
            expect.objectContaining({
              key: "X-Test",
              value: "updatedVal",
            }),
          ],
        }),
      })
    )
  })

  test("auk.request.setHeader should add new header if not present", () => {
    return expect(
      runPreRequestScript(`auk.request.setHeader("X-New-Header", "newValue")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.arrayContaining([
            expect.objectContaining({ key: "X-New-Header", value: "newValue" }),
          ]),
        }),
      })
    )
  })

  test("auk.request.removeHeader should remove a header", () => {
    return expect(
      runPreRequestScript(`auk.request.removeHeader("X-Test")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [],
        }),
      })
    )
  })

  test("auk.request.setParam should update existing param case-insensitively", () => {
    return expect(
      runPreRequestScript(`auk.request.setParam("Q", "updatedParam")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: [
            expect.objectContaining({ key: "q", value: "updatedParam" }),
          ],
        }),
      })
    )
  })

  test("auk.request.setParam should add new param if absent", () => {
    return expect(
      runPreRequestScript(`auk.request.setParam("newParam", "value")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: expect.arrayContaining([
            expect.objectContaining({ key: "newParam", value: "value" }),
          ]),
        }),
      })
    )
  })

  test("auk.request.removeParam should remove a param", () => {
    return expect(
      runPreRequestScript(`auk.request.removeParam("q")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: [],
        }),
      })
    )
  })

  test("auk.request.setBody should update the body with complete replacement", () => {
    const newBody: AukRESTReqBody = {
      contentType: "application/json",
      body: JSON.stringify({ changed: true }),
    }
    return expect(
      runPreRequestScript(`auk.request.setBody(${JSON.stringify(newBody)})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          body: newBody,
        }),
      })
    )
  })

  test("auk.request.setBody should support partial merge", () => {
    // Base request with existing JSON body
    const requestWithBody: AukRESTRequest = {
      ...baseRequest,
      body: {
        contentType: "application/json",
        body: JSON.stringify({ existing: "data", keep: true }),
      },
    }

    // Script that only updates contentType, preserving body content
    const partialUpdate = { contentType: "application/xml" }

    return expect(
      runPreRequestScript(
        `auk.request.setBody(${JSON.stringify(partialUpdate)})`,
        {
          envs: { global: [], selected: [] },
          request: requestWithBody,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          body: {
            contentType: "application/xml",
            body: JSON.stringify({ existing: "data", keep: true }),
          },
        }),
      })
    )
  })

  test("auk.request.setAuth should update the auth with complete replacement", () => {
    const newAuth: AukRESTAuth = {
      authType: "basic",
      username: "abc",
      password: "123",
      authActive: true,
    }

    return expect(
      runPreRequestScript(`auk.request.setAuth(${JSON.stringify(newAuth)})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: newAuth,
        }),
      })
    )
  })

  test("auk.request.setAuth should support partial merge", () => {
    // Base request with existing basic auth
    const requestWithAuth: AukRESTRequest = {
      ...baseRequest,
      auth: {
        authType: "basic",
        username: "original-user",
        password: "original-pass",
        authActive: true,
      },
    }

    // Script that only updates the username, preserving other fields
    const partialUpdate = { username: "updated-user" }

    return expect(
      runPreRequestScript(
        `auk.request.setAuth(${JSON.stringify(partialUpdate)})`,
        {
          envs: { global: [], selected: [] },
          request: requestWithAuth,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: {
            authType: "basic",
            username: "updated-user",
            password: "original-pass",
            authActive: true,
          },
        }),
      })
    )
  })

  test("auk.request.setAuth should handle auth type switching", () => {
    // Base request with bearer auth
    const requestWithBearerAuth: AukRESTRequest = {
      ...baseRequest,
      auth: {
        authType: "bearer",
        token: "old-bearer-token",
        authActive: true,
      },
    }

    // Switch to basic auth (complete replacement)
    const switchToBasic: AukRESTAuth = {
      authType: "basic",
      username: "new-user",
      password: "new-pass",
      authActive: true,
    }

    return expect(
      runPreRequestScript(
        `auk.request.setAuth(${JSON.stringify(switchToBasic)})`,
        {
          envs: { global: [], selected: [] },
          request: requestWithBearerAuth,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: switchToBasic,
        }),
      })
    )
  })

  test("auk.request.setHeaders throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`auk.request.setHeaders(null)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("auk.request.setParams throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`auk.request.setParams(null)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("auk.request.setBody throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`auk.request.setBody("invalid_body")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("auk.request.setAuth throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`auk.request.setAuth({})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("auk.request.variables.get should return the request variable", () => {
    return expect(
      runPreRequestScript(
        `console.log(auk.request.variables.get("req-var-1"))`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: ["value-1"] })],
      })
    )
  })

  test("auk.request.variables.set should update the request variable", () => {
    return expect(
      runPreRequestScript(
        `auk.request.variables.set("req-var-1", "new-value-1")`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          requestVariables: [
            {
              key: "req-var-1",
              value: "new-value-1",
              active: true,
            },
          ],
        }),
      })
    )
  })

  test("auk.request.variables.set should add a new request variable if the supplied key does not exist", () => {
    return expect(
      runPreRequestScript(`auk.request.variables.set("req-var-2", "value-2")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          requestVariables: [
            {
              key: "req-var-1",
              value: "value-1",
              active: true,
            },
            {
              key: "req-var-2",
              value: "value-2",
              active: true,
            },
          ],
        }),
      })
    )
  })

  test("auk.request.variables.set should not work in post-request script context", () => {
    const envs = { global: [], selected: [] }

    return expect(
      runTestScript(
        `auk.request.variables.set("req-var-1", "new-value-from-test")`,
        {
          envs,
          request: baseRequest,
          response: testResponse,
        }
      )
    ).resolves.toEqualLeft(
      expect.stringContaining(`Script execution failed: not a function`)
    )
  })

  test("auk.request read-only properties are accessible from post-request script", () => {
    const envs = { global: [], selected: [] }

    const testRequest: AukRESTRequest = {
      ...baseRequest,
      method: "POST",
      endpoint: "https://api.example.com/users",
      params: [{ key: "page", value: "1", active: true, description: "" }],
      headers: [
        {
          key: "Authorization",
          value: "Bearer token123",
          active: true,
          description: "",
        },
        {
          key: "Content-Type",
          value: "application/json",
          active: true,
          description: "",
        },
      ],
      body: {
        contentType: "application/json",
        body: JSON.stringify({ name: "John", age: 30 }),
      },
      auth: {
        authType: "bearer",
        authActive: true,
        token: "test-token-123",
      },
    }

    return expect(
      runTestScript(
        `
        auk.expect(auk.request.url).toBe("https://api.example.com/users")
        auk.expect(auk.request.method).toBe("POST")
        auk.expect(auk.request.params.length).toBe(1)
        auk.expect(auk.request.params[0].key).toBe("page")
        auk.expect(auk.request.params[0].value).toBe("1")
        auk.expect(auk.request.headers.length).toBe(2)
        auk.expect(auk.request.headers[0].key).toBe("Authorization")
        auk.expect(auk.request.headers[0].value).toBe("Bearer token123")
        auk.expect(auk.request.headers[1].key).toBe("Content-Type")
        auk.expect(auk.request.headers[1].value).toBe("application/json")
        auk.expect(auk.request.body.contentType).toBe("application/json")
        auk.expect(auk.request.body.body).toBe('{"name":"John","age":30}')
        auk.expect(auk.request.auth.authType).toBe("bearer")
        auk.expect(auk.request.auth.token).toBe("test-token-123")
        `,
        {
          envs,
          request: testRequest,
          response: testResponse,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message:
                "Expected 'https://api.example.com/users' to be 'https://api.example.com/users'",
            },
            { status: "pass", message: "Expected 'POST' to be 'POST'" },
            { status: "pass", message: "Expected '1' to be '1'" },
            { status: "pass", message: "Expected 'page' to be 'page'" },
            { status: "pass", message: "Expected '1' to be '1'" },
            { status: "pass", message: "Expected '2' to be '2'" },
            {
              status: "pass",
              message: "Expected 'Authorization' to be 'Authorization'",
            },
            {
              status: "pass",
              message: "Expected 'Bearer token123' to be 'Bearer token123'",
            },
            {
              status: "pass",
              message: "Expected 'Content-Type' to be 'Content-Type'",
            },
            {
              status: "pass",
              message: "Expected 'application/json' to be 'application/json'",
            },
            {
              status: "pass",
              message: "Expected 'application/json' to be 'application/json'",
            },
            {
              status: "pass",
              message:
                'Expected \'{"name":"John","age":30}\' to be \'{"name":"John","age":30}\'',
            },
            { status: "pass", message: "Expected 'bearer' to be 'bearer'" },
            {
              status: "pass",
              message: "Expected 'test-token-123' to be 'test-token-123'",
            },
          ],
        }),
      })
    )
  })

  test("auk.request setter methods should not be available in post-request", async () => {
    const script = `
        auk.request.setUrl("http://modified.com")
      `

    await expect(
      runTestScript(script, {
        envs: { global: [], selected: [] },
        request: baseRequest,
        response: testResponse,
      })
    ).resolves.toEqualLeft(expect.stringContaining("not a function"))
  })

  test("auk.request.setHeader should not be available in post-request", async () => {
    const script = `
        auk.request.setHeader("X-Test", "value")
      `

    await expect(
      runTestScript(script, {
        envs: { global: [], selected: [] },
        request: baseRequest,
        response: testResponse,
      })
    ).resolves.toEqualLeft(expect.stringContaining("not a function"))
  })

  // Request property immutability tests in post-request context
  describe("property immutability in post-request context", () => {
    test("auk.request.url should be read-only", async () => {
      const script = `
        auk.request.url = "http://modified.com"
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("auk.request.method should be read-only", async () => {
      const script = `
        auk.request.method = "POST"
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("auk.request.headers should be read-only", async () => {
      const script = `
        auk.request.headers = {}
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("auk.request.body should be read-only", async () => {
      const script = `
        auk.request.body = "modified"
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })
  })

  describe("setter methods immediately reflect in console.log", () => {
    test("setUrl should reflect immediately in auk.request.url", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", auk.request.url)
          auk.request.setUrl("https://updated.com/api")
          console.log("After:", auk.request.url)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", "https://example.com/api"],
            }),
            expect.objectContaining({
              args: ["After:", "https://updated.com/api"],
            }),
          ],
          updatedRequest: expect.objectContaining({
            endpoint: "https://updated.com/api",
          }),
        })
      )
    })

    test("setMethod should reflect immediately in auk.request.method", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", auk.request.method)
          auk.request.setMethod("POST")
          console.log("After:", auk.request.method)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", "GET"],
            }),
            expect.objectContaining({
              args: ["After:", "POST"],
            }),
          ],
          updatedRequest: expect.objectContaining({
            method: "POST",
          }),
        })
      )
    })

    test("setHeader should reflect immediately in auk.request.headers", () => {
      return expect(
        runPreRequestScript(
          `
          const before = auk.request.headers.find(h => h.key === "X-Test")
          console.log("Before value:", before.value)
          auk.request.setHeader("X-Test", "modified")
          const after = auk.request.headers.find(h => h.key === "X-Test")
          console.log("After value:", after.value)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before value:", "val1"],
            }),
            expect.objectContaining({
              args: ["After value:", "modified"],
            }),
          ],
        })
      )
    })

    test("setHeaders should reflect immediately in auk.request.headers", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before length:", auk.request.headers.length)
          auk.request.setHeaders([
            { key: "X-New-1", value: "val1", active: true, description: "" },
            { key: "X-New-2", value: "val2", active: true, description: "" }
          ])
          console.log("After length:", auk.request.headers.length)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before length:", 1],
            }),
            expect.objectContaining({
              args: ["After length:", 2],
            }),
          ],
        })
      )
    })

    test("removeHeader should reflect immediately in auk.request.headers", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", auk.request.headers.map(h => h.key))
          auk.request.removeHeader("X-Test")
          console.log("After:", auk.request.headers.map(h => h.key))
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", ["X-Test"]],
            }),
            expect.objectContaining({
              args: ["After:", []],
            }),
          ],
        })
      )
    })

    test("setParam should reflect immediately in auk.request.params", () => {
      return expect(
        runPreRequestScript(
          `
          const before = auk.request.params.find(p => p.key === "q")
          console.log("Before value:", before.value)
          auk.request.setParam("q", "updated")
          const after = auk.request.params.find(p => p.key === "q")
          console.log("After value:", after.value)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before value:", "search"],
            }),
            expect.objectContaining({
              args: ["After value:", "updated"],
            }),
          ],
        })
      )
    })

    test("setParams should reflect immediately in auk.request.params", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before length:", auk.request.params.length)
          auk.request.setParams([
            { key: "page", value: "1", active: true, description: "" },
            { key: "limit", value: "10", active: true, description: "" }
          ])
          console.log("After length:", auk.request.params.length)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before length:", 1],
            }),
            expect.objectContaining({
              args: ["After length:", 2],
            }),
          ],
        })
      )
    })

    test("removeParam should reflect immediately in auk.request.params", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", auk.request.params.map(p => p.key))
          auk.request.removeParam("q")
          console.log("After:", auk.request.params.map(p => p.key))
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", ["q"]],
            }),
            expect.objectContaining({
              args: ["After:", []],
            }),
          ],
        })
      )
    })

    test("setBody should reflect immediately in auk.request.body", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", auk.request.body.contentType)
          auk.request.setBody({
            contentType: "application/json",
            body: '{"test": true}'
          })
          console.log("After:", auk.request.body.contentType)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", null],
            }),
            expect.objectContaining({
              args: ["After:", "application/json"],
            }),
          ],
        })
      )
    })

    test("setAuth should reflect immediately in auk.request.auth", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", auk.request.auth.authType)
          auk.request.setAuth({ authType: "bearer", token: "test-token" })
          console.log("After:", auk.request.auth.authType)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", "none"],
            }),
            expect.objectContaining({
              args: ["After:", "bearer"],
            }),
          ],
        })
      )
    })
  })
})
