import { z } from "zod"

import { defineVersion } from "verzod"

import { AukRESTAuthOAuth2 } from "../../rest/v/5"
import {
  AukGQLAuthAPIKey as AukGQLAuthAPIKeyOld,
  AukGQLAuthBasic,
  AukGQLAuthBearer,
  AukGQLAuthInherit,
  AukGQLAuthNone,
} from "./2"
import { V3_SCHEMA } from "./3"

export { AukRESTAuthOAuth2 as AukGQLAuthOAuth2 } from "../../rest/v/5"

export const AukGQLAuthAPIKey = AukGQLAuthAPIKeyOld.extend({
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export type AukGqlAuthOAuth2 = z.infer<typeof AukRESTAuthOAuth2>

export const AukGQLAuth = z
  .discriminatedUnion("authType", [
    AukGQLAuthNone,
    AukGQLAuthInherit,
    AukGQLAuthBasic,
    AukGQLAuthBearer,
    AukGQLAuthAPIKey,
    AukRESTAuthOAuth2, // both rest and gql have the same auth type for oauth2
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukGQLAuth = z.infer<typeof AukGQLAuth>

export const V4_SCHEMA = V3_SCHEMA.extend({
  v: z.literal(4),
  auth: AukGQLAuth,
})

export default defineVersion({
  initial: false,
  schema: V4_SCHEMA,
  up(old: z.infer<typeof V3_SCHEMA>) {
    if (old.auth.authType === "api-key") {
      return {
        ...old,
        v: 4 as const,
        auth: {
          ...old.auth,
          addTo:
            old.auth.addTo === "Query params"
              ? ("QUERY_PARAMS" as const)
              : ("HEADERS" as const),
        },
      }
    }

    return {
      ...old,
      v: 4 as const,
      auth: {
        ...old.auth,
      },
    }
  },
})
