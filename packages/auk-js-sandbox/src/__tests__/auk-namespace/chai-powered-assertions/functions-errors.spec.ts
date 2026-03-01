import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`auk.expect` - Functions and Error Assertions", () => {
  describe("Throw Assertions", () => {
    test("should support `.throw()` without arguments for any error", () => {
      return expect(
        runTest(`
          auk.test("basic throw works", () => {
            auk.expect(() => { throw new Error('test') }).to.throw()
            auk.expect(() => {}).to.not.throw()
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "basic throw works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to throw$/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to not throw/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.throw()` with error type matching", () => {
      return expect(
        runTest(`
          auk.test("throw with type works", () => {
            auk.expect(() => { throw new TypeError('type error') }).to.throw(TypeError)
            auk.expect(() => { throw new RangeError('range error') }).to.throw(RangeError)
            auk.expect(() => { throw new ReferenceError('ref error') }).to.throw(ReferenceError)
            auk.expect(() => { throw new Error('generic') }).to.throw(Error)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throw with type works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw TypeError/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw RangeError/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw ReferenceError/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to throw Error/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.throw()` with string message matching", () => {
      return expect(
        runTest(`
          auk.test("throw with string message works", () => {
            auk.expect(() => { throw new Error('salmon') }).to.throw('salmon')
            auk.expect(() => { throw new Error('exact message') }).to.throw('exact message')
            auk.expect(() => { throw new Error('contains test word') }).to.throw('test')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throw with string message works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw 'salmon'/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw 'exact message'/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to throw 'test'/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.throw()` with regex message matching", () => {
      return expect(
        runTest(`
          auk.test("throw with regex works", () => {
            auk.expect(() => { throw new Error('illegal salmon!') }).to.throw(/salmon/)
            auk.expect(() => { throw new Error('TEST123') }).to.throw(/test\\d+/i)
            auk.expect(() => { throw new Error('error: something went wrong') }).to.throw(/^error:/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throw with regex works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw \/salmon\//
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw \/test\\d\+\/i/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw \/\^error:\//
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.throw()` with both error type and message", () => {
      return expect(
        runTest(`
          auk.test("throw with type and message works", () => {
            auk.expect(() => { throw new RangeError('out of range') }).to.throw(RangeError, 'out of range')
            auk.expect(() => { throw new TypeError('wrong type') }).to.throw(TypeError, /wrong/)
            auk.expect(() => { throw new Error('specific error') }).to.throw(Error, 'specific error')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throw with type and message works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw RangeError, 'out of range'/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw TypeError, \/wrong\//
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw Error, 'specific error'/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support custom error classes with `.throw()`", () => {
      return expect(
        runTest(`
          auk.test("custom error classes work", () => {
            class CustomError extends Error {
              constructor(message) {
                super(message)
                this.name = 'CustomError'
              }
            }

            auk.expect(() => { throw new CustomError('custom message') }).to.throw(CustomError)
            auk.expect(() => { throw new CustomError('specific text') }).to.throw(CustomError, /specific/)
            auk.expect(() => { throw new CustomError('exact') }).to.throw(CustomError, 'exact')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "custom error classes work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw CustomError/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw CustomError, \/specific\//
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to throw CustomError, 'exact'/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.throws()` and `.Throw()` aliases", () => {
      return expect(
        runTest(`
          auk.test("throw aliases work", () => {
            auk.expect(() => { throw new Error('test1') }).to.throws()
            auk.expect(() => { throw new Error('test2') }).to.Throw()
            auk.expect(() => { throw new TypeError() }).to.throws(TypeError)
            auk.expect(() => { throw new Error('message') }).to.Throw('message')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throw aliases work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to throw/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to throw/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to throw/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to throw/),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("instanceof Assertions", () => {
    test("should support `.instanceof()` with built-in types", () => {
      return expect(
        runTest(`
          auk.test("instanceof with built-in types works", () => {
            auk.expect([1, 2]).to.be.an.instanceof(Array)
            auk.expect(new Date()).to.be.an.instanceof(Date)
            auk.expect(new Error()).to.be.an.instanceof(Error)
            auk.expect(new RegExp('test')).to.be.an.instanceof(RegExp)
            auk.expect(new Map()).to.be.an.instanceof(Map)
            auk.expect(new Set()).to.be.an.instanceof(Set)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "instanceof with built-in types works",
              expectResults: expect.arrayContaining([
                {
                  status: "pass",
                  message: "Expected [1, 2] to be an instanceof Array",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Date/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Error/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof RegExp/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Map/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Set/),
                },
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.instanceof()` with error types", () => {
      return expect(
        runTest(`
          auk.test("instanceof with error types works", () => {
            auk.expect(new Error()).to.be.an.instanceof(Error)
            auk.expect(new TypeError()).to.be.an.instanceof(TypeError)
            auk.expect(new RangeError()).to.be.an.instanceof(RangeError)
            auk.expect(new TypeError()).to.be.an.instanceof(Error)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "instanceof with error types works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.instanceOf()` alias", () => {
      return expect(
        runTest(`
          auk.test("instanceOf alias works", () => {
            auk.expect([]).to.be.an.instanceof(Array)
            auk.expect(new Date()).to.be.an.instanceof(Date)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "instanceOf alias works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support negation with `.not.instanceof()`", () => {
      return expect(
        runTest(`
          auk.test("not instanceof works", () => {
            auk.expect({}).to.not.be.an.instanceof(Array)
            auk.expect([]).to.not.be.an.instanceof(Date)
            auk.expect('string').to.not.be.an.instanceof(Number)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "not instanceof works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to not be an instanceof/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to not be an instanceof/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to not be an instanceof/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("respondTo Assertions", () => {
    test("should support `.respondTo()` for prototype methods", () => {
      return expect(
        runTest(`
          auk.test("respondTo with prototype methods works", () => {
            function Cat() {}
            Cat.prototype.meow = function() { return 'meow' }

            const cat = new Cat()
            auk.expect(cat).to.respondTo('meow')
            auk.expect(Cat).to.respondTo('meow')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "respondTo with prototype methods works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {} to respondTo 'meow'",
                },
                {
                  status: "pass",
                  message: "Expected function Cat() {} to respondTo 'meow'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.itself.respondTo()` for static methods", () => {
      return expect(
        runTest(`
          auk.test("itself respondTo for static methods works", () => {
            function Dog() {}
            Dog.prototype.bark = function() { return 'bark' }
            Dog.woof = function() { return 'woof' }

            auk.expect(Dog).itself.to.respondTo('woof')
            auk.expect(Dog).to.respondTo('bark')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "itself respondTo for static methods works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected function Dog() {} to respondTo 'woof'",
                },
                {
                  status: "pass",
                  message: "Expected function Dog() {} to respondTo 'bark'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.respondTo()` with constructor functions", () => {
      return expect(
        runTest(`
          auk.test("respondTo with constructor functions works", () => {
            function Animal() {}
            Animal.prototype.speak = function() { return 'sound' }
            Animal.create = function() { return new Animal() }

            const animal = new Animal()
            auk.expect(animal).to.respondTo('speak')
            auk.expect(Animal).to.respondTo('speak')
            auk.expect(Animal).itself.to.respondTo('create')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "respondTo with constructor functions works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to respondTo 'speak'/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to respondTo 'speak'/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to respondTo 'create'/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.respondsTo()` alias", () => {
      return expect(
        runTest(`
          auk.test("respondsTo alias works", () => {
            function TestObj() {}
            TestObj.prototype.method = function() { return 'test' }

            const obj = new TestObj()
            auk.expect(obj).to.respondsTo('method')
            auk.expect(TestObj).respondsTo('method')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "respondsTo alias works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to respondTo 'method'/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to respondTo 'method'/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support negation with `.not.respondTo()`", () => {
      return expect(
        runTest(`
          auk.test("not respondTo works", () => {
            function Bird() {}
            Bird.prototype.fly = function() { return 'flying' }

            const bird = new Bird()
            auk.expect(bird).to.not.respondTo('swim')
            auk.expect(Bird).to.not.respondTo('nonexistent')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "not respondTo works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to not respondTo 'swim'/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to not respondTo 'nonexistent'/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("satisfy Assertions", () => {
    test("should support `.satisfy()` with simple predicates", () => {
      return expect(
        runTest(`
          auk.test("satisfy with simple predicates works", () => {
            auk.expect(1).to.satisfy(function(num) { return num > 0 })
            auk.expect(10).to.satisfy(function(num) { return num % 2 === 0 })
            auk.expect('hello').to.satisfy(function(str) { return str.length === 5 })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfy with simple predicates works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 1 to satisfy function/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 10 to satisfy function/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 'hello' to satisfy function/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.satisfy()` with complex object validation", () => {
      return expect(
        runTest(`
          auk.test("satisfy with complex objects works", () => {
            auk.expect({name: 'Alice', age: 30, active: true}).to.satisfy(function(obj) {
              return obj.name.length > 3 && obj.age >= 18 && obj.active === true
            })

            auk.expect([1, 2, 3, 4, 5]).to.satisfy(function(arr) {
              return arr.every(n => n > 0) && arr.length === 5
            })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfy with complex objects works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected \{name: 'Alice', age: 30, active: true\} to satisfy function/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected \[1, 2, 3, 4, 5\] to satisfy function/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.satisfy()` with regex validation", () => {
      return expect(
        runTest(`
          auk.test("satisfy with regex works", () => {
            auk.expect('user@example.com').to.satisfy(function(email) {
              return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
            })

            auk.expect('abc123').to.satisfy(function(str) {
              return /^[a-z]+\\d+$/.test(str)
            })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfy with regex works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 'user@example\.com' to satisfy function/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 'abc123' to satisfy function/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.satisfy()` with multi-condition predicates", () => {
      return expect(
        runTest(`
          auk.test("satisfy with multi-conditions works", () => {
            auk.expect(42).to.satisfy(function(n) {
              return n % 2 === 0 && n > 40 && n < 50
            })

            auk.expect([1,2,3]).to.satisfy(function(arr) {
              return arr.length === 3 && arr[0] === 1 && arr.reduce((a, b) => a + b) === 6
            })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfy with multi-conditions works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 42 to satisfy function/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected \[1, 2, 3\] to satisfy function/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.satisfies()` alias", () => {
      return expect(
        runTest(`
          auk.test("satisfies alias works", () => {
            auk.expect(5).to.satisfies(function(n) { return n > 0 })
            auk.expect('test').satisfies(function(s) { return s.length > 0 })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfies alias works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 5 to satisfy function/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 'test' to satisfy function/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support negation with `.not.satisfy()`", () => {
      return expect(
        runTest(`
          auk.test("not satisfy works", () => {
            auk.expect(1).to.not.satisfy(function(num) { return num < 0 })
            auk.expect('hello').to.not.satisfy(function(str) { return str.length > 10 })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "not satisfy works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 1 to not satisfy function/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected 'hello' to not satisfy function/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Arguments Object Detection", () => {
    test("should support `.arguments` assertion for arguments objects", () => {
      return expect(
        runTest(`
          auk.test("arguments detection works", () => {
            function testFunc() {
              auk.expect(arguments).to.be.arguments
            }
            testFunc(1, 2, 3)

            auk.expect([1, 2, 3]).to.not.be.arguments
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "arguments detection works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to be arguments/),
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to not be arguments",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.Arguments` alias", () => {
      return expect(
        runTest(`
          auk.test("Arguments alias works", () => {
            function testFunc() {
              auk.expect(arguments).to.be.Arguments
            }
            testFunc(1, 2, 3)

            auk.expect({0: 1, 1: 2, length: 2}).to.not.be.Arguments
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Arguments alias works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be Arguments/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be Arguments/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should distinguish arguments from array-like objects", () => {
      return expect(
        runTest(`
          auk.test("arguments vs array-like objects works", () => {
            function testFunc() {
              auk.expect(arguments).to.be.arguments
            }
            testFunc()

            // Array-like objects should not be considered arguments
            auk.expect([]).to.not.be.arguments
            auk.expect({length: 0}).to.not.be.arguments
            auk.expect({0: 'a', 1: 'b', length: 2}).to.not.be.arguments
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "arguments vs array-like objects works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/Expected .* to be arguments/),
                },
                {
                  status: "pass",
                  message: "Expected [] to not be arguments",
                },
                {
                  status: "pass",
                  message: "Expected {length: 0} to not be arguments",
                },
                {
                  status: "pass",
                  message:
                    "Expected {0: 'a', 1: 'b', length: 2} to not be arguments",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Object State Assertions", () => {
    test("should support `.extensible` assertion for extensible objects", () => {
      return expect(
        runTest(`
          auk.test("extensible assertion works", () => {
            auk.expect({a: 1}).to.be.extensible
            auk.expect([1, 2, 3]).to.be.extensible

            const obj = {}
            auk.expect(obj).to.be.extensible
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "extensible assertion works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be extensible/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be extensible/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be extensible/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.sealed` assertion for sealed objects", () => {
      return expect(
        runTest(`
          auk.test("sealed assertion works", () => {
            auk.expect(Object.seal({})).to.be.sealed
            auk.expect(Object.seal({a: 1})).to.be.sealed

            const obj = {}
            auk.expect(obj).to.not.be.sealed
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "sealed assertion works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be sealed/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.frozen` assertion for frozen objects", () => {
      return expect(
        runTest(`
          auk.test("frozen assertion works", () => {
            auk.expect(Object.freeze({})).to.be.frozen
            auk.expect(Object.freeze({a: 1})).to.be.frozen

            const obj = {}
            auk.expect(obj).to.not.be.frozen
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "frozen assertion works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be frozen/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be frozen/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be frozen/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should understand that frozen objects are also sealed", () => {
      return expect(
        runTest(`
          auk.test("frozen implies sealed works", () => {
            const frozen = Object.freeze({a: 1})
            auk.expect(frozen).to.be.frozen
            auk.expect(frozen).to.be.sealed
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "frozen implies sealed works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be frozen/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle primitives as sealed and frozen", () => {
      return expect(
        runTest(`
          auk.test("primitives are sealed and frozen", () => {
            auk.expect(1).to.be.sealed
            auk.expect(1).to.be.frozen
            auk.expect('string').to.be.sealed
            auk.expect('string').to.be.frozen
            auk.expect(true).to.be.sealed
            auk.expect(true).to.be.frozen
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "primitives are sealed and frozen",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be frozen/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be frozen/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be frozen/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should understand the relationship between extensible, sealed, and frozen", () => {
      return expect(
        runTest(`
          auk.test("object state relationships work", () => {
            const extensible = {a: 1}
            const sealed = Object.seal({b: 2})
            const frozen = Object.freeze({c: 3})

            // Extensible is not sealed or frozen
            auk.expect(extensible).to.be.extensible
            auk.expect(extensible).to.not.be.sealed
            auk.expect(extensible).to.not.be.frozen

            // Sealed is not extensible, not frozen (but can be)
            auk.expect(sealed).to.not.be.extensible
            auk.expect(sealed).to.be.sealed
            auk.expect(sealed).to.not.be.frozen

            // Frozen is not extensible, but is sealed
            auk.expect(frozen).to.not.be.extensible
            auk.expect(frozen).to.be.sealed
            auk.expect(frozen).to.be.frozen
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "object state relationships work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be extensible/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be frozen/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be extensible/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be frozen/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to not be extensible/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be sealed/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be frozen/),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Edge Cases and Error Scenarios", () => {
    test("should handle throw assertion failures gracefully", () => {
      return expect(
        runTest(`
          auk.test("throw failures work", () => {
            auk.expect(() => {}).to.throw()
            auk.expect(() => { throw new Error() }).to.not.throw()
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throw failures work",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringMatching(/Expected .* to throw/),
                },
                {
                  status: "fail",
                  message: expect.stringMatching(/Expected .* to not throw/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle instanceof failures gracefully", () => {
      return expect(
        runTest(`
          auk.test("instanceof failures work", () => {
            auk.expect([]).to.be.an.instanceof(Date)
            auk.expect(new Date()).to.not.be.an.instanceof(Date)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "instanceof failures work",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringMatching(
                    /Expected .* to be an instanceof/
                  ),
                },
                {
                  status: "fail",
                  message: expect.stringMatching(
                    /Expected .* to not be an instanceof/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle satisfy failures with clear messages", () => {
      return expect(
        runTest(`
          auk.test("satisfy failures work", () => {
            auk.expect(5).to.satisfy(function(n) { return n < 0 })
            auk.expect('hello').to.not.satisfy(function(s) { return s.length === 5 })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfy failures work",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringMatching(
                    /Expected 5 to satisfy function/
                  ),
                },
                {
                  status: "fail",
                  message: expect.stringMatching(
                    /Expected 'hello' to not satisfy function/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })
})
