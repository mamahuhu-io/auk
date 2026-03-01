import tern from "tern"
import { registerTernLinter } from "./ternlint"
import ECMA_DEF from "~/helpers/terndoc/ecma.json"
import PW_PRE_DEF from "~/helpers/terndoc/pw-pre.json"
import PW_TEST_DEF from "~/helpers/terndoc/pw-test.json"
import PW_EXTRAS_DEF from "~/helpers/terndoc/pw-extras.json"

interface TernMessage {
  message: string
  from: unknown
  to: unknown
  severity: string
  lineNumber?: number
  file?: string
}

interface TernCompletion {
  name: string
  type?: string
  doc?: string
}

interface TernCompletionResult {
  completions?: TernCompletion[]
}

const server = new tern.Server({
  defs: [ECMA_DEF, PW_EXTRAS_DEF],
  plugins: {
    lint: {
      rules: [],
    },
  },
})

registerTernLinter()

function performLinting(code: string): Promise<TernMessage[]> {
  return new Promise((resolve, reject) => {
    server.request(
      {
        query: {
          type: "lint",
          file: "doc",
          lineCharPositions: true,
        },
        files: [
          {
            type: "full",
            name: "doc",
            text: code,
          },
        ],
      },
      (err: Error | null, res: { messages: TernMessage[] }) => {
        if (!err) resolve(res.messages)
        else reject(err)
      }
    )
  })
}

export function performPreRequestLinting(code: string): Promise<TernMessage[]> {
  server.deleteDefs("pw-test")
  server.deleteDefs("pw-pre")
  server.addDefs(PW_PRE_DEF)
  return performLinting(code)
}

export function performTestLinting(code: string): Promise<TernMessage[]> {
  server.deleteDefs("pw-test")
  server.deleteDefs("pw-pre")
  server.addDefs(PW_TEST_DEF)
  return performLinting(code)
}

function postProcessCompletionResult(
  res: TernCompletionResult
): TernCompletionResult {
  if (res.completions) {
    const index = res.completions.findIndex((el) => el.name === "pw")

    if (index !== -1) {
      const result = res.completions[index]

      res.completions.splice(index, 1)
      res.completions.splice(0, 0, result)
    }
  }

  return res
}

function performCompletion(
  code: string,
  row: number,
  col: number
): Promise<TernCompletionResult> {
  return new Promise((resolve, reject) => {
    server.request(
      {
        query: {
          type: "completions",
          file: "doc",
          end: {
            line: row,
            ch: col,
          },
          guess: false,
          types: true,
          includeKeywords: true,
          inLiteral: false,
        },
        files: [
          {
            type: "full",
            name: "doc",
            text: code,
          },
        ],
      },
      (err: Error | null, res: TernCompletionResult) => {
        if (err) reject(err)
        else resolve(postProcessCompletionResult(res))
      }
    )
  })
}

export function getPreRequestScriptCompletions(
  code: string,
  row: number,
  col: number
): Promise<TernCompletionResult> {
  server.deleteDefs("pw-test")
  server.deleteDefs("pw-pre")
  server.addDefs(PW_PRE_DEF)
  return performCompletion(code, row, col)
}

export function getTestScriptCompletions(
  code: string,
  row: number,
  col: number
): Promise<TernCompletionResult> {
  server.deleteDefs("pw-test")
  server.deleteDefs("pw-pre")
  server.addDefs(PW_TEST_DEF)
  return performCompletion(code, row, col)
}
