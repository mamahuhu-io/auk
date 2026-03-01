import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("auk.expect - String and Regex Methods", () => {
  describe("String Inclusion (.string())", () => {
    test("should support .string() for substring inclusion", () => {
      return expect(
        runTest(`
          auk.test("string inclusion works", () => {
            auk.expect('hello world').to.have.string('world')
            auk.expect('foobar').to.have.string('foo')
            auk.expect('foobar').to.have.string('bar')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "string inclusion works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringContaining("to have string"),
                },
                {
                  status: "pass",
                  message: expect.stringContaining("to have string"),
                },
                {
                  status: "pass",
                  message: expect.stringContaining("to have string"),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support .string() negation", () => {
      return expect(
        runTest(`
          auk.test("string negation works", () => {
            auk.expect('hello').to.not.have.string('goodbye')
            auk.expect('foo').to.not.have.string('bar')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "string negation works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringContaining("to not have string"),
                },
                {
                  status: "pass",
                  message: expect.stringContaining("to not have string"),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should fail on missing substring", () => {
      return expect(
        runTest(`
          auk.test("string assertion fails correctly", () => {
            auk.expect('hello').to.have.string('goodbye')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "string assertion fails correctly",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringContaining("to have string"),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should work with empty strings", () => {
      return expect(
        runTest(`
          auk.test("empty string edge case", () => {
            auk.expect('hello').to.have.string('')
            auk.expect('').to.have.string('')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "empty string edge case",
              expectResults: [
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Regex Matching (.match())", () => {
    test("should support .match() with regex patterns", () => {
      return expect(
        runTest(`
          auk.test("regex matching works", () => {
            auk.expect('hello123').to.match(/\\d+/)
            auk.expect('test@example.com').to.match(/^[^@]+@[^@]+\\.[^@]+$/)
            auk.expect('ABC').to.match(/[A-Z]+/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "regex matching works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to match/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to match/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to match/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support .match() negation", () => {
      return expect(
        runTest(`
          auk.test("regex negation works", () => {
            auk.expect('hello').to.not.match(/\\d+/)
            auk.expect('abc').to.not.match(/[A-Z]+/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "regex negation works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to not match/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not match/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support .matches() alias", () => {
      return expect(
        runTest(`
          auk.test("matches alias works", () => {
            auk.expect('abc123').to.matches(/[a-z]+\\d+/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "matches alias works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to match/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should fail on non-matching regex", () => {
      return expect(
        runTest(`
          auk.test("regex assertion fails correctly", () => {
            auk.expect('hello').to.match(/\\d+/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "regex assertion fails correctly",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringMatching(/to match/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle regex with flags", () => {
      return expect(
        runTest(`
          auk.test("regex flags work", () => {
            auk.expect('HELLO').to.match(/hello/i)
            auk.expect('hello\\nworld').to.match(/hello.world/s)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "regex flags work",
              expectResults: [
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle complex regex patterns", () => {
      return expect(
        runTest(`
          auk.test("complex regex patterns", () => {
            auk.expect('user@example.com').to.match(/^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/i)
            auk.expect('192.168.1.1').to.match(/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/)
            auk.expect('+1-555-123-4567').to.match(/^\\+?\\d{1,3}-?\\d{3}-\\d{3}-\\d{4}$/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "complex regex patterns",
              expectResults: [
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Combined String and Regex Tests", () => {
    test("should work with both string and regex in same test", () => {
      return expect(
        runTest(`
          auk.test("combined assertions", () => {
            const email = 'test@example.com'
            auk.expect(email).to.have.string('@')
            auk.expect(email).to.match(/^[^@]+@[^@]+$/)
            auk.expect(email).to.have.string('example')
            auk.expect(email).to.match(/\\.com$/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "combined assertions",
              expectResults: [
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
              ],
            }),
          ],
        }),
      ])
    })

    test("should chain with other assertions", () => {
      return expect(
        runTest(`
          auk.test("chained assertions", () => {
            auk.expect('hello world').to.be.a('string').and.have.string('world')
            auk.expect('test123').to.be.a('string').and.match(/\\d+/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              descriptor: "chained assertions",
              expectResults: [
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
                { status: "pass", message: expect.any(String) },
              ],
            }),
          ],
        }),
      ])
    })
  })
})
