import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"

describe("pm.execution namespace", () => {
  test("pm.execution.location returns Auk array in test script", () => {
    return expect(
      runTest(
        `
          pm.test("pm.execution.location is an array", () => {
            pm.expect(Array.isArray(pm.execution.location)).to.be.true
          })

          pm.test("pm.execution.location contains Auk", () => {
            pm.expect(pm.execution.location).to.include("Auk")
          })

          pm.test("pm.execution.location.current is Auk", () => {
            pm.expect(pm.execution.location.current).to.equal("Auk")
          })
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "pm.execution.location is an array",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
          expect.objectContaining({
            descriptor: "pm.execution.location contains Auk",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
          expect.objectContaining({
            descriptor: "pm.execution.location.current is Auk",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.execution.location is accessible in pre-request script", () => {
    return expect(
      runPreRequest(
        `
          // Verify pm.execution.location exists and has expected values
          if (!Array.isArray(pm.execution.location)) {
            throw new Error("pm.execution.location is not an array")
          }
          if (!pm.execution.location.includes("Auk")) {
            throw new Error("pm.execution.location does not contain 'Auk'")
          }
          if (pm.execution.location.current !== "Auk") {
            throw new Error("pm.execution.location.current is not 'Auk'")
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [],
        selected: [],
      })
    )
  })
})
