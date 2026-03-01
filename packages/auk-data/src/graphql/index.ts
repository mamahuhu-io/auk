import { InferredEntity, createVersionedEntity } from "verzod"
import { z } from "zod"
import V1_VERSION from "./v/1"
import V2_VERSION from "./v/2"
import V3_VERSION from "./v/3"
import V4_VERSION from "./v/4"
import V5_VERSION from "./v/5"
import V6_VERSION from "./v/6"
import V7_VERSION from "./v/7"
import V8_VERSION from "./v/8"
import V9_VERSION from "./v/9"

export {
  AukGQLAuthBasic,
  AukGQLAuthBearer,
  AukGQLAuthInherit,
  AukGQLAuthNone,
} from "./v/2"

export { AukGQLAuthAPIKey } from "./v/4"

export { GQLHeader, AukGQLAuthAWSSignature } from "./v/6"
export { AukGQLAuth, AukGQLAuthOAuth2 } from "./v/9"

export const GQL_REQ_SCHEMA_VERSION = 9

const versionedObject = z.object({
  v: z.number(),
})

export const AukGQLRequest = createVersionedEntity({
  latestVersion: 9,
  versionMap: {
    1: V1_VERSION,
    2: V2_VERSION,
    3: V3_VERSION,
    4: V4_VERSION,
    5: V5_VERSION,
    6: V6_VERSION,
    7: V7_VERSION,
    8: V8_VERSION,
    9: V9_VERSION,
  },
  getVersion(x) {
    const result = versionedObject.safeParse(x)

    return result.success ? result.data.v : null
  },
})

export type AukGQLRequest = InferredEntity<typeof AukGQLRequest>

const DEFAULT_QUERY = `
query Request {
  method
  url
  headers {
    key
    value
  }
}`.trim()

export function getDefaultGQLRequest(): AukGQLRequest {
  return {
    v: GQL_REQ_SCHEMA_VERSION,
    name: "Untitled",
    url: "https://echo.mamahuhu.dev/graphql",
    headers: [],
    variables: `
{
  "id": "1"
}`.trim(),
    query: DEFAULT_QUERY,
    auth: {
      authType: "inherit",
      authActive: true,
    },
  }
}

/**
 * @deprecated This function is deprecated. Use `AukGQLRequest` instead.
 */
export function translateToGQLRequest(x: unknown): AukGQLRequest {
  const result = AukGQLRequest.safeParse(x)
  return result.type === "ok" ? result.value : getDefaultGQLRequest()
}

export function makeGQLRequest(x: Omit<AukGQLRequest, "v">): AukGQLRequest {
  return {
    v: GQL_REQ_SCHEMA_VERSION,
    ...x,
  }
}
