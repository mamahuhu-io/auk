import { Environment } from "@auk/data"
import { SandboxTestResult } from "@auk/js-sandbox"

export type AukTestExpectResult = {
  status: "fail" | "pass" | "error"
  message: string
}

export type AukTestData = {
  description: string
  expectResults: AukTestExpectResult[]
  tests: AukTestData[]
}

export type AukTestResult = {
  tests: AukTestData[]
  expectResults: AukTestExpectResult[]
  description: string
  scriptError: boolean

  envDiff: {
    global: {
      additions: Environment["variables"]
      updations: Array<
        Environment["variables"][number] & { previousValue: string }
      >
      deletions: Environment["variables"]
    }
    selected: {
      additions: Environment["variables"]
      updations: Array<
        Environment["variables"][number] & { previousValue: string }
      >
      deletions: Environment["variables"]
    }
  }

  consoleEntries: SandboxTestResult["consoleEntries"]
}
