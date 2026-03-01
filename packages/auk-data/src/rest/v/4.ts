import { z } from "zod"
import { defineVersion } from "verzod"
import { AukRESTAuthOAuth2, V3_SCHEMA } from "./3"
import {
  AukRESTAuthAPIKey as AukRESTAuthAPIKeyOld,
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "./1"

// in this new version, we update the old 'Headers' and 'Query params' to be more consistent with OAuth addTo values
// also in the previous version addTo was a string, which prevented some bugs from being caught by the type system
// this version uses an enum, so we get the values as literals in the type system
export const AukRESTAuthAPIKey = AukRESTAuthAPIKeyOld.extend({
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export type AukRESTAuthAPIKey = z.infer<typeof AukRESTAuthAPIKey>

export const AukRESTAuth = z
  .discriminatedUnion("authType", [
    AukRESTAuthNone,
    AukRESTAuthInherit,
    AukRESTAuthBasic,
    AukRESTAuthBearer,
    AukRESTAuthOAuth2,
    AukRESTAuthAPIKey,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukRESTAuth = z.infer<typeof AukRESTAuth>

export const V4_SCHEMA = V3_SCHEMA.extend({
  v: z.literal("4"),
  auth: AukRESTAuth,
})

export default defineVersion({
  schema: V4_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V3_SCHEMA>) {
    if (old.auth.authType === "api-key") {
      return {
        ...old,
        v: "4" as const,
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
      auth: {
        ...old.auth,
      },
      v: "4" as const,
    }
  },
})
