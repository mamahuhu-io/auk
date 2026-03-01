import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`auk.expect` - Core Chai Assertions", () => {
  describe("Language Chains", () => {
    test("should support all language chain properties (`to`, `be`, `that`, `and`, `has`, etc.)", () => {
      return expect(
        runTest(`
          auk.test("language chains work", () => {
            auk.expect(2).to.equal(2)
            auk.expect(2).to.be.equal(2)
            auk.expect(2).to.be.a('number').that.equals(2)
            auk.expect([1,2,3]).to.be.an('array').that.has.lengthOf(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "language chains work",
              expectResults: [
                { status: "pass", message: "Expected 2 to equal 2" },
                { status: "pass", message: "Expected 2 to be equal 2" },
                { status: "pass", message: "Expected 2 to be a number" },
                {
                  status: "pass",
                  message: "Expected 2 to be a number that equals 2",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to be an array",
                },
                {
                  status: "pass",
                  message:
                    "Expected [1, 2, 3] to be an array that has lengthOf 3",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support multiple modifier combinations with language chains", () => {
      return expect(
        runTest(`
          auk.test("complex chains work", () => {
            auk.expect([1,2,3]).to.be.an('array')
            auk.expect([1,2,3]).to.have.lengthOf(3)
            auk.expect([1,2,3]).to.include(2)
            auk.expect({a: 1, b: 2}).to.be.an('object')
            auk.expect({a: 1, b: 2}).to.have.property('a')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "complex chains work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: expect.stringMatching(/array/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/lengthOf 3/),
                },
                { status: "pass", message: expect.stringMatching(/include 2/) },
                { status: "pass", message: expect.stringMatching(/object/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/property 'a'/),
                },
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Type Assertions", () => {
    test("should assert primitive types correctly (`.a()`, `.an()`)", () => {
      return expect(
        runTest(`
          auk.test("type assertions work", () => {
            auk.expect('foo').to.be.a('string')
            auk.expect({a: 1}).to.be.an('object')
            auk.expect([1, 2, 3]).to.be.an('array')
            auk.expect(null).to.be.a('null')
            auk.expect(undefined).to.be.an('undefined')
            auk.expect(42).to.be.a('number')
            auk.expect(true).to.be.a('boolean')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "type assertions work",
              expectResults: [
                { status: "pass", message: "Expected 'foo' to be a string" },
                { status: "pass", message: "Expected {a: 1} to be an object" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to be an array",
                },
                { status: "pass", message: "Expected null to be a null" },
                {
                  status: "pass",
                  message: "Expected undefined to be an undefined",
                },
                { status: "pass", message: "Expected 42 to be a number" },
                { status: "pass", message: "Expected true to be a boolean" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert Symbol and BigInt types", () => {
      return expect(
        runTest(`
          auk.test("modern type assertions work", () => {
            auk.expect(Symbol('test')).to.be.a('symbol')
            auk.expect(Symbol.for('shared')).to.be.a('symbol')
            auk.expect(BigInt(123)).to.be.a('bigint')
            auk.expect(BigInt('999999999999999999')).to.be.a('bigint')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "modern type assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected Symbol\(test\) to be a symbol/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected Symbol\(shared\) to be a symbol/
                  ),
                },
                {
                  status: "pass",
                  message: "Expected 123n to be a bigint",
                },
                {
                  status: "pass",
                  message: "Expected 999999999999999999n to be a bigint",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Equality Assertions", () => {
    test("should support `.equal()`, `.equals()`, `.eq()` for strict equality", () => {
      return expect(
        runTest(`
          auk.test("equality works", () => {
            auk.expect(42).to.equal(42)
            auk.expect('test').to.equals('test')
            auk.expect(true).to.eq(true)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "equality works",
              expectResults: [
                { status: "pass", message: "Expected 42 to equal 42" },
                { status: "pass", message: "Expected 'test' to equals 'test'" },
                { status: "pass", message: "Expected true to eq true" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.eql()` for deep equality", () => {
      return expect(
        runTest(`
          auk.test("deep equality works", () => {
            auk.expect({a: 1}).to.eql({a: 1})
            auk.expect([1, 2, 3]).to.eql([1, 2, 3])
            auk.expect({a: {b: 2}}).to.eql({a: {b: 2}})
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep equality works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to eql {a: 1}",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to eql [1, 2, 3]",
                },
                {
                  status: "pass",
                  message: "Expected {a: {b: 2}} to eql {a: {b: 2}}",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Truthiness Assertions", () => {
    test("should support `.true`, `.false`, `.ok` assertions", () => {
      return expect(
        runTest(`
          auk.test("truthiness assertions work", () => {
            auk.expect(true).to.be.true
            auk.expect(false).to.be.false
            auk.expect(1).to.be.ok
            auk.expect('hello').to.be.ok
            auk.expect({}).to.be.ok
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "truthiness assertions work",
              expectResults: [
                { status: "pass", message: "Expected true to be true" },
                { status: "pass", message: "Expected false to be false" },
                { status: "pass", message: "Expected 1 to be ok" },
                { status: "pass", message: "Expected 'hello' to be ok" },
                { status: "pass", message: "Expected {} to be ok" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Nullish Assertions", () => {
    test("should support `.null`, `.undefined`, `.NaN` assertions", () => {
      return expect(
        runTest(`
          auk.test("nullish assertions work", () => {
            auk.expect(null).to.be.null
            auk.expect(undefined).to.be.undefined
            auk.expect(NaN).to.be.NaN
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "nullish assertions work",
              expectResults: [
                { status: "pass", message: "Expected null to be null" },
                {
                  status: "pass",
                  message: "Expected undefined to be undefined",
                },
                { status: "pass", message: "Expected NaN to be NaN" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.exist` assertion", () => {
      return expect(
        runTest(`
          auk.test("exist assertion works", () => {
            auk.expect(0).to.exist
            auk.expect('').to.exist
            auk.expect(false).to.exist
            auk.expect({}).to.exist
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "exist assertion works",
              expectResults: [
                { status: "pass", message: "Expected 0 to exist" },
                { status: "pass", message: "Expected '' to exist" },
                { status: "pass", message: "Expected false to exist" },
                { status: "pass", message: "Expected {} to exist" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Numerical Comparisons", () => {
    test("should support `.above()` and `.below()` comparisons", () => {
      return expect(
        runTest(`
          auk.test("numerical comparisons work", () => {
            auk.expect(10).to.be.above(5)
            auk.expect(5).to.be.below(10)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "numerical comparisons work",
              expectResults: [
                { status: "pass", message: "Expected 10 to be above 5" },
                { status: "pass", message: "Expected 5 to be below 10" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support comparison aliases (`.gt()`, `.gte()`, `.lt()`, `.lte()`)", () => {
      return expect(
        runTest(`
          auk.test("comparison aliases work", () => {
            auk.expect(10).to.be.gt(5)
            auk.expect(10).to.be.gte(10)
            auk.expect(5).to.be.lt(10)
            auk.expect(5).to.be.lte(5)
            auk.expect(10).to.be.greaterThan(5)
            auk.expect(10).to.be.greaterThanOrEqual(10)
            auk.expect(5).to.be.lessThan(10)
            auk.expect(5).to.be.lessThanOrEqual(5)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "comparison aliases work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: expect.stringMatching(/above|gt/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/above|gte|at least/),
                },
                { status: "pass", message: expect.stringMatching(/below|lt/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/below|lte|at most/),
                },
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.within()` for range comparisons", () => {
      return expect(
        runTest(`
          auk.test("within range works", () => {
            auk.expect(5).to.be.within(1, 10)
            auk.expect(7).to.be.within(7, 7)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "within range works",
              expectResults: [
                { status: "pass", message: "Expected 5 to be within 1, 10" },
                { status: "pass", message: "Expected 7 to be within 7, 7" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.closeTo()` and `.approximately()` for floating point comparisons", () => {
      return expect(
        runTest(`
          auk.test("close to works", () => {
            auk.expect(1.5).to.be.closeTo(1.0, 0.6)
            auk.expect(1.5).to.be.approximately(1.0, 0.6)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "close to works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 1.5 to be closeTo 1, 0.6",
                },
                {
                  status: "pass",
                  message: "Expected 1.5 to be approximately 1, 0.6",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Special Value Assertions", () => {
    test("should support `.empty` assertion for various types", () => {
      return expect(
        runTest(`
          auk.test("empty assertion works", () => {
            auk.expect('').to.be.empty
            auk.expect([]).to.be.empty
            auk.expect({}).to.be.empty
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "empty assertion works",
              expectResults: [
                { status: "pass", message: "Expected '' to be empty" },
                { status: "pass", message: "Expected [] to be empty" },
                { status: "pass", message: "Expected {} to be empty" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.finite` assertion for numbers", () => {
      return expect(
        runTest(`
          auk.test("finite assertion works", () => {
            auk.expect(42).to.be.finite
            auk.expect(0).to.be.finite
            auk.expect(-100.5).to.be.finite
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "finite assertion works",
              expectResults: [
                { status: "pass", message: "Expected 42 to be finite" },
                { status: "pass", message: "Expected 0 to be finite" },
                { status: "pass", message: "Expected -100.5 to be finite" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should detect Infinity and reject `.finite`", () => {
      return expect(
        runTest(`
          auk.test("infinity is not finite", () => {
            auk.expect(Infinity).to.not.be.finite
            auk.expect(-Infinity).to.not.be.finite
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "infinity is not finite",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected Infinity to not be finite",
                },
                {
                  status: "pass",
                  message: "Expected -Infinity to not be finite",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Negation with `.not`", () => {
    test("should support negation for all assertion types", () => {
      return expect(
        runTest(`
          auk.test("negation works", () => {
            auk.expect(1).to.not.equal(2)
            auk.expect('foo').to.not.be.a('number')
            auk.expect(false).to.not.be.true
            auk.expect('foo').to.not.be.empty
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "negation works",
              expectResults: [
                { status: "pass", message: "Expected 1 to not equal 2" },
                {
                  status: "pass",
                  message: "Expected 'foo' to not be a number",
                },
                { status: "pass", message: "Expected false to not be true" },
                { status: "pass", message: "Expected 'foo' to not be empty" },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("Boundary Value Testing", () => {
    test("should handle boundary values correctly in comparisons", () => {
      return expect(
        runTest(`
          auk.test("boundary values work", () => {
            auk.expect(Number.MAX_SAFE_INTEGER).to.be.a('number')
            auk.expect(Number.MIN_SAFE_INTEGER).to.be.a('number')
            auk.expect(Number.EPSILON).to.be.above(0)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "boundary values work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: expect.stringMatching(/number/) },
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Failure Cases", () => {
    test("should produce meaningful error messages on assertion failures", () => {
      return expect(
        runTest(`
          auk.test("failures have good messages", () => {
            auk.expect(1).to.equal(2)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "failures have good messages",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringContaining("Expected 1 to equal 2"),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })
})
