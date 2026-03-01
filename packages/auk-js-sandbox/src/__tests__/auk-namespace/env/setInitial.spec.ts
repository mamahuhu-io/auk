import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("auk.env.setInitial", () => {
  test("sets initial value in selected env when key doesn't exist", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial("newKey", "newValue")
          const val = auk.env.getInitialRaw("newKey")
          auk.expect(val).toBe("newValue")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'newValue' to be 'newValue'" },
        ],
      }),
    ])
  })

  test("updates initial value in selected env when key exists", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial("existing", "updated")
          const val = auk.env.getInitialRaw("existing")
          auk.expect(val).toBe("updated")
        `,
        {
          selected: [
            {
              key: "existing",
              currentValue: "current",
              initialValue: "original",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'updated' to be 'updated'" },
        ],
      }),
    ])
  })

  test("updates selected env when key exists in both selected and global", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial("shared", "selectedUpdate")
          const val = auk.env.getInitialRaw("shared")
          auk.expect(val).toBe("selectedUpdate")
        `,
        {
          selected: [
            {
              key: "shared",
              currentValue: "selCur",
              initialValue: "selInit",
              secret: false,
            },
          ],
          global: [
            {
              key: "shared",
              currentValue: "globCur",
              initialValue: "globInit",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'selectedUpdate' to be 'selectedUpdate'",
          },
        ],
      }),
    ])
  })

  test("sets initial value in global env when only exists in global", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial("globalOnly", "globalUpdate")
          const val = auk.env.getInitialRaw("globalOnly")
          auk.expect(val).toBe("globalUpdate")
        `,
        {
          selected: [],
          global: [
            {
              key: "globalOnly",
              currentValue: "current",
              initialValue: "original",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'globalUpdate' to be 'globalUpdate'",
          },
        ],
      }),
    ])
  })

  test("allows setting empty string as initial value", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial("empty", "")
          const val = auk.env.getInitialRaw("empty")
          auk.expect(val).toBe("")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("allows setting template syntax as initial value", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial("template", "<<FOO>>")
          const val = auk.env.getInitialRaw("template")
          auk.expect(val).toBe("<<FOO>>")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected '<<FOO>>' to be '<<FOO>>'" },
        ],
      }),
    ])
  })

  test("errors for non-string key", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial(123, "value")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })

  test("errors for non-string value", () => {
    return expect(
      runTest(
        `
          auk.env.setInitial("key", 456)
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("auk.env.active.setInitial", () => {
  test("sets initial value in selected env only", () => {
    return expect(
      runTest(
        `
          auk.env.active.setInitial("activeKey", "activeValue")
          const activeVal = auk.env.active.getInitialRaw("activeKey")
          const globalVal = auk.env.global.getInitialRaw("activeKey")
          auk.expect(activeVal).toBe("activeValue")
          auk.expect(globalVal).toBe(null)
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'activeValue' to be 'activeValue'",
          },
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("updates existing selected env variable", () => {
    return expect(
      runTest(
        `
          auk.env.active.setInitial("existing", "updated")
          const val = auk.env.active.getInitialRaw("existing")
          auk.expect(val).toBe("updated")
        `,
        {
          selected: [
            {
              key: "existing",
              currentValue: "current",
              initialValue: "original",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'updated' to be 'updated'" },
        ],
      }),
    ])
  })

  test("does not affect global env even if key exists there", () => {
    return expect(
      runTest(
        `
          auk.env.active.setInitial("shared", "activeUpdate")
          const activeVal = auk.env.active.getInitialRaw("shared")
          const globalVal = auk.env.global.getInitialRaw("shared")
          auk.expect(activeVal).toBe("activeUpdate")
          auk.expect(globalVal).toBe("globalOriginal")
        `,
        {
          selected: [
            {
              key: "shared",
              currentValue: "selCur",
              initialValue: "selInit",
              secret: false,
            },
          ],
          global: [
            {
              key: "shared",
              currentValue: "globCur",
              initialValue: "globalOriginal",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'activeUpdate' to be 'activeUpdate'",
          },
          {
            status: "pass",
            message: "Expected 'globalOriginal' to be 'globalOriginal'",
          },
        ],
      }),
    ])
  })

  test("allows setting empty string", () => {
    return expect(
      runTest(
        `
          auk.env.active.setInitial("blank", "")
          const val = auk.env.active.getInitialRaw("blank")
          auk.expect(val).toBe("")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("errors for non-string key", () => {
    return expect(
      runTest(
        `
          auk.env.active.setInitial(null, "value")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })

  test("errors for non-string value", () => {
    return expect(
      runTest(
        `
          auk.env.active.setInitial("key", {})
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("auk.env.global.setInitial", () => {
  test("sets initial value in global env only", () => {
    return expect(
      runTest(
        `
          auk.env.global.setInitial("globalKey", "globalValue")
          const globalVal = auk.env.global.getInitialRaw("globalKey")
          const activeVal = auk.env.active.getInitialRaw("globalKey")
          auk.expect(globalVal).toBe("globalValue")
          auk.expect(activeVal).toBe(null)
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'globalValue' to be 'globalValue'",
          },
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("updates existing global env variable", () => {
    return expect(
      runTest(
        `
          auk.env.global.setInitial("existing", "updated")
          const val = auk.env.global.getInitialRaw("existing")
          auk.expect(val).toBe("updated")
        `,
        {
          selected: [],
          global: [
            {
              key: "existing",
              currentValue: "current",
              initialValue: "original",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'updated' to be 'updated'" },
        ],
      }),
    ])
  })

  test("does not affect selected env even if key exists there", () => {
    return expect(
      runTest(
        `
          auk.env.global.setInitial("shared", "globalUpdate")
          const globalVal = auk.env.global.getInitialRaw("shared")
          const activeVal = auk.env.active.getInitialRaw("shared")
          auk.expect(globalVal).toBe("globalUpdate")
          auk.expect(activeVal).toBe("activeOriginal")
        `,
        {
          selected: [
            {
              key: "shared",
              currentValue: "selCur",
              initialValue: "activeOriginal",
              secret: false,
            },
          ],
          global: [
            {
              key: "shared",
              currentValue: "globCur",
              initialValue: "globInit",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'globalUpdate' to be 'globalUpdate'",
          },
          {
            status: "pass",
            message: "Expected 'activeOriginal' to be 'activeOriginal'",
          },
        ],
      }),
    ])
  })

  test("allows setting empty string", () => {
    return expect(
      runTest(
        `
          auk.env.global.setInitial("empty", "")
          const val = auk.env.global.getInitialRaw("empty")
          auk.expect(val).toBe("")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("allows setting template syntax", () => {
    return expect(
      runTest(
        `
          auk.env.global.setInitial("template", "<<BAR>>")
          const val = auk.env.global.getInitialRaw("template")
          auk.expect(val).toBe("<<BAR>>")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected '<<BAR>>' to be '<<BAR>>'" },
        ],
      }),
    ])
  })

  test("errors for non-string key", () => {
    return expect(
      runTest(
        `
          auk.env.global.setInitial([], "value")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })

  test("errors for non-string value", () => {
    return expect(
      runTest(
        `
          auk.env.global.setInitial("key", true)
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})
