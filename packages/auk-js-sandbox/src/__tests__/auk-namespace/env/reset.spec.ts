import { describe, expect, test } from "vitest"
import { runTestAndGetEnvs, runTest } from "~/utils/test-helpers"

describe("auk.env.reset", () => {
  test("resets selected variable to its initial value", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.set("foo", "changed")
          auk.env.reset("foo")
        `,
        {
          selected: [
            {
              key: "foo",
              currentValue: "bar",
              initialValue: "bar",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "foo",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
      })
    ))

  test("resets global variable to its initial value if not in selected", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.set("bar", "override")
          auk.env.reset("bar")
        `,
        {
          selected: [],
          global: [
            {
              key: "bar",
              currentValue: "baz",
              initialValue: "baz",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "bar",
            currentValue: "baz",
            initialValue: "baz",
            secret: false,
          },
        ],
      })
    ))

  test("if variable exists in both, only selected variable is reset", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.set("a", "S")
          auk.env.global.set("a", "G")
          auk.env.reset("a")
        `,
        {
          selected: [
            {
              key: "a",
              currentValue: "sel",
              initialValue: "initSel",
              secret: false,
            },
          ],
          global: [
            {
              key: "a",
              currentValue: "glob",
              initialValue: "initGlob",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "a",
            currentValue: "initSel",
            initialValue: "initSel",
            secret: false,
          },
        ],
        global: [
          {
            key: "a",
            currentValue: "G",
            initialValue: "initGlob",
            secret: false,
          },
        ],
      })
    ))

  test("resets only the first occurrence if duplicates exist in selected", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.set("dup", "X")
          auk.env.reset("dup")
        `,
        {
          selected: [
            { key: "dup", currentValue: "A", initialValue: "A", secret: false },
            { key: "dup", currentValue: "B", initialValue: "B", secret: false },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          { key: "dup", currentValue: "A", initialValue: "A", secret: false },
          { key: "dup", currentValue: "B", initialValue: "B", secret: false },
        ],
      })
    ))

  test("resets only the first occurrence if duplicates exist in global", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.global.set("gdup", "Y")
          auk.env.reset("gdup")
        `,
        {
          selected: [],
          global: [
            {
              key: "gdup",
              currentValue: "G1",
              initialValue: "I1",
              secret: false,
            },
            {
              key: "gdup",
              currentValue: "G2",
              initialValue: "I2",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "gdup",
            currentValue: "I1",
            initialValue: "I1",
            secret: false,
          },
          {
            key: "gdup",
            currentValue: "G2",
            initialValue: "I2",
            secret: false,
          },
        ],
      })
    ))

  test("no change if attempting to reset a non-existent key", () =>
    expect(
      runTestAndGetEnvs(`auk.env.reset("none")`, {
        selected: [],
        global: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({ selected: [], global: [] })
    ))

  test("keys should be a string", () =>
    expect(
      runTestAndGetEnvs(`auk.env.reset(123)`, { selected: [], global: [] })()
    ).resolves.toBeLeft())

  test("reset reflected in subsequent get in the same script (selected)", () =>
    expect(
      runTest(
        `
          auk.env.set("foo", "override")
          auk.env.reset("foo")
          auk.expect(auk.env.get("foo")).toBe("bar")
        `,
        {
          selected: [
            {
              key: "foo",
              currentValue: "bar",
              initialValue: "bar",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'bar' to be 'bar'" },
        ],
      }),
    ]))

  test("reset works for secret variables", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.set("secret", "newVal")
          auk.env.reset("secret")
        `,
        {
          selected: [
            {
              key: "secret",
              currentValue: "origi",
              initialValue: "origi",
              secret: true,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "secret",
            currentValue: "origi",
            initialValue: "origi",
            secret: true,
          },
        ],
      })
    ))
})

describe("auk.env.active.reset", () => {
  test("resets variable only in selected environment", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.active.set("xxx", "MUT")
          auk.env.active.reset("xxx")
        `,
        {
          selected: [
            { key: "xxx", currentValue: "A", initialValue: "A", secret: false },
          ],
          global: [
            { key: "xxx", currentValue: "B", initialValue: "B", secret: false },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          { key: "xxx", currentValue: "A", initialValue: "A", secret: false },
        ],
        global: [
          { key: "xxx", currentValue: "B", initialValue: "B", secret: false },
        ],
      })
    ))

  test("no effect if key not in selected", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.active.reset("nonexistent")
        `,
        {
          selected: [],
          global: [
            {
              key: "nonexistent",
              currentValue: "G",
              initialValue: "G",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [],
        global: [
          {
            key: "nonexistent",
            currentValue: "G",
            initialValue: "G",
            secret: false,
          },
        ],
      })
    ))

  test("key must be a string", () =>
    expect(
      runTestAndGetEnvs(`auk.env.active.reset(123)`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft())
})

describe("auk.env.global.reset", () => {
  test("resets variable only in global environment", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.global.set("yyy", "GGG")
          auk.env.global.reset("yyy")
        `,
        {
          selected: [
            { key: "yyy", currentValue: "S", initialValue: "S", secret: false },
          ],
          global: [
            {
              key: "yyy",
              currentValue: "G",
              initialValue: "GI",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          { key: "yyy", currentValue: "S", initialValue: "S", secret: false },
        ],
        global: [
          { key: "yyy", currentValue: "GI", initialValue: "GI", secret: false },
        ],
      })
    ))

  test("no effect if key not in global", () =>
    expect(
      runTestAndGetEnvs(
        `
          auk.env.global.reset("nonexistent")
        `,
        {
          selected: [
            {
              key: "nonexistent",
              currentValue: "S",
              initialValue: "S",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "nonexistent",
            currentValue: "S",
            initialValue: "S",
            secret: false,
          },
        ],
        global: [],
      })
    ))

  // Additional regression tests ensuring reset uses the latest state
  describe("auk.env.reset - regression cases", () => {
    test("create via setInitial then set, and reset restores to initial (selected)", () =>
      expect(
        runTestAndGetEnvs(
          `
          // Variable does not exist initially
          auk.env.setInitial("AUTH_TOKEN", "seeded-v1")
          auk.env.set("AUTH_TOKEN", "overridden-v2")
          auk.env.reset("AUTH_TOKEN")
        `,
          {
            selected: [],
            global: [],
          }
        )()
      ).resolves.toEqualRight(
        expect.objectContaining({
          selected: [
            {
              key: "AUTH_TOKEN",
              currentValue: "seeded-v1",
              initialValue: "seeded-v1",
              secret: false,
            },
          ],
          global: [],
        })
      ))

    test("scope flip: remove from global, create in active, reset only affects active and not deleted global", () =>
      expect(
        runTestAndGetEnvs(
          `
          // Start by ensuring global is cleared
          auk.env.global.delete("API_KEY")
          // Create in active with initial and then override
          auk.env.active.setInitial("API_KEY", "run-initial")
          auk.env.active.set("API_KEY", "run-override")
          // Reset should restore to initial in active, global remains absent
          auk.env.active.reset("API_KEY")
        `,
          {
            selected: [],
            global: [
              // Simulate global having had a value in the past; we delete within the script
              {
                key: "API_KEY",
                currentValue: "old-glob",
                initialValue: "old-glob",
                secret: false,
              },
            ],
          }
        )()
      ).resolves.toEqualRight(
        expect.objectContaining({
          selected: [
            {
              key: "API_KEY",
              currentValue: "run-initial",
              initialValue: "run-initial",
              secret: false,
            },
          ],
          // After delete, global should not contain API_KEY
          global: [],
        })
      ))

    test("delete then reset within same script should be a no-op (selected)", () =>
      expect(
        runTestAndGetEnvs(
          `
          auk.env.active.delete("SESSION_ID")
          // Reset after unset should not reintroduce or change anything
          auk.env.active.reset("SESSION_ID")
        `,
          {
            selected: [
              {
                key: "SESSION_ID",
                currentValue: "s-1",
                initialValue: "s-1",
                secret: false,
              },
            ],
            global: [],
          }
        )()
      ).resolves.toEqualRight(
        expect.objectContaining({
          selected: [],
          global: [],
        })
      ))
  })
  test("key must be a string", () =>
    expect(
      runTestAndGetEnvs(`auk.env.global.reset([])`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft())
})
