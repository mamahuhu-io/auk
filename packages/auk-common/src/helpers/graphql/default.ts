import { parse, print } from "graphql"
import { AukGQLRequest, GQL_REQ_SCHEMA_VERSION } from "@auk/data"

const DEFAULT_QUERY = print(
  parse(
    `
      query Request {
        method
        url
        headers {
          key
          value
        }
      }
    `,
    { allowLegacyFragmentVariables: true }
  )
)

export const getDefaultGQLRequest = (): AukGQLRequest => ({
  v: GQL_REQ_SCHEMA_VERSION,
  name: "Untitled",
  url: "https://echo.mamahuhu.dev/graphql",
  headers: [],
  variables: `{
  "id": "1"
}`,
  query: DEFAULT_QUERY,
  auth: {
    authType: "inherit",
    authActive: true,
  },
})
