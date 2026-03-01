/**
 * Null and Undefined Value Preservation Across Namespaces
 *
 * Tests that null and undefined values are correctly preserved when setting
 * and getting environment variables across pm, pw, and auk namespaces.
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("Null and undefined value preservation across namespaces", () => {
  describe("Cross-namespace null value handling", () => {
    test("pm.environment.set with null should work across pm, pw, and auk namespaces", () => {
      return expect(
        runTest(
          `
            pm.environment.set('key', null)

            pm.test("pm.environment.get returns actual null", () => {
              pm.expect(pm.environment.get('key')).to.equal(null)
            })

            pm.test("typeof null should be 'object'", () => {
              pm.expect(typeof pm.environment.get('key')).to.equal('object')
            })

            pm.test("pw.env.get returns actual null (cross-namespace)", () => {
              pm.expect(pw.env.get('key')).to.equal(null)
            })

            pm.test("typeof via pw.env.get should be 'object'", () => {
              pm.expect(typeof pw.env.get('key')).to.equal('object')
            })

            pm.test("auk.env.get returns actual null (cross-namespace)", () => {
              pm.expect(auk.env.get('key')).to.equal(null)
            })

            pm.test("typeof via auk.env.get should be 'object'", () => {
              pm.expect(typeof auk.env.get('key')).to.equal('object')
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "pm.environment.get returns actual null",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof null should be 'object'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "pw.env.get returns actual null (cross-namespace)",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof via pw.env.get should be 'object'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "auk.env.get returns actual null (cross-namespace)",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof via auk.env.get should be 'object'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("pm.environment.set with undefined should work across pm, pw, and auk namespaces", () => {
      return expect(
        runTest(
          `
            pm.environment.set('undefKey', undefined)

            pm.test("pm.environment.get returns actual undefined", () => {
              pm.expect(pm.environment.get('undefKey')).to.equal(undefined)
            })

            pm.test("typeof undefined should be 'undefined'", () => {
              pm.expect(typeof pm.environment.get('undefKey')).to.equal('undefined')
            })

            pm.test("pw.env.get returns actual undefined (cross-namespace)", () => {
              pm.expect(pw.env.get('undefKey')).to.equal(undefined)
            })

            pm.test("typeof via pw.env.get should be 'undefined'", () => {
              pm.expect(typeof pw.env.get('undefKey')).to.equal('undefined')
            })

            pm.test("auk.env.get returns actual undefined (cross-namespace)", () => {
              pm.expect(auk.env.get('undefKey')).to.equal(undefined)
            })

            pm.test("typeof via auk.env.get should be 'undefined'", () => {
              pm.expect(typeof auk.env.get('undefKey')).to.equal('undefined')
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "pm.environment.get returns actual undefined",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof undefined should be 'undefined'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor:
                  "pw.env.get returns actual undefined (cross-namespace)",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof via pw.env.get should be 'undefined'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor:
                  "auk.env.get returns actual undefined (cross-namespace)",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof via auk.env.get should be 'undefined'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("Assertion failure messages display actual values", () => {
    test("null assertion failures should show actual 'null' value in error messages", () => {
      return expect(
        runTest(
          `
            pm.environment.set('nullKey', null)

            pm.test("pm.environment.get error message should not contain marker", () => {
              pm.expect(pm.environment.get('nullKey')).to.equal("this is not null")
            })

            pm.test("pw.env.get error message should not contain marker", () => {
              pm.expect(pw.env.get('nullKey')).to.equal("this is not null")
            })

            auk.test("auk.env.get error message should not contain marker", () => {
              auk.expect(auk.env.get('nullKey')).to.equal("this is not null")
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor:
                  "pm.environment.get error message should not contain marker",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({
                    status: "fail",
                    message: expect.not.stringContaining("__AUK_NULL__"),
                  }),
                ]),
              }),
              expect.objectContaining({
                descriptor:
                  "pw.env.get error message should not contain marker",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({
                    status: "fail",
                    message: expect.not.stringContaining("__AUK_NULL__"),
                  }),
                ]),
              }),
              expect.objectContaining({
                descriptor:
                  "auk.env.get error message should not contain marker",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({
                    status: "fail",
                    message: expect.not.stringContaining("__AUK_NULL__"),
                  }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("undefined assertion failures should show actual 'undefined' value in error messages", () => {
      return expect(
        runTest(
          `
            pm.environment.set('undefKey', undefined)

            pm.test("pm.environment.get error message should not contain marker", () => {
              pm.expect(pm.environment.get('undefKey')).to.equal("this is not undefined")
            })

            pm.test("pw.env.get error message should not contain marker", () => {
              pm.expect(pw.env.get('undefKey')).to.equal("this is not undefined")
            })

            auk.test("auk.env.get error message should not contain marker", () => {
              auk.expect(auk.env.get('undefKey')).to.equal("this is not undefined")
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor:
                  "pm.environment.get error message should not contain marker",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({
                    status: "fail",
                    message: expect.not.stringContaining("__AUK_UNDEFINED__"),
                  }),
                ]),
              }),
              expect.objectContaining({
                descriptor:
                  "pw.env.get error message should not contain marker",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({
                    status: "fail",
                    message: expect.not.stringContaining("__AUK_UNDEFINED__"),
                  }),
                ]),
              }),
              expect.objectContaining({
                descriptor:
                  "auk.env.get error message should not contain marker",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({
                    status: "fail",
                    message: expect.not.stringContaining("__AUK_UNDEFINED__"),
                  }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("pm.globals namespace null and undefined handling", () => {
    test("pm.globals.set with null should work correctly", () => {
      return expect(
        runTest(
          `
            pm.globals.set('globalNull', null)

            pm.test("pm.globals.get returns actual null", () => {
              pm.expect(pm.globals.get('globalNull')).to.equal(null)
            })

            pm.test("typeof null should be 'object'", () => {
              pm.expect(typeof pm.globals.get('globalNull')).to.equal('object')
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "pm.globals.get returns actual null",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof null should be 'object'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("pm.globals.set with undefined should work correctly", () => {
      return expect(
        runTest(
          `
            pm.globals.set('globalUndef', undefined)

            pm.test("pm.globals.get returns actual undefined", () => {
              pm.expect(pm.globals.get('globalUndef')).to.equal(undefined)
            })

            pm.test("typeof undefined should be 'undefined'", () => {
              pm.expect(typeof pm.globals.get('globalUndef')).to.equal('undefined')
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "pm.globals.get returns actual undefined",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
              expect.objectContaining({
                descriptor: "typeof undefined should be 'undefined'",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })
})
