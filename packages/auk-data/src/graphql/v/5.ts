import { z } from "zod"

import { defineVersion } from "verzod"

import { AukRESTAuthOAuth2 } from "../../rest/v/5"
import {
  AukGQLAuthBasic,
  AukGQLAuthBearer,
  AukGQLAuthInherit,
  AukGQLAuthNone,
} from "./2"
import { AukGQLAuthAPIKey, V4_SCHEMA } from "./4"

export { AukRESTAuthOAuth2 as AukGQLAuthOAuth2 } from "../../rest/v/5"

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

export const V5_SCHEMA = V4_SCHEMA.extend({
  v: z.literal(5),
  auth: AukGQLAuth,
})

export default defineVersion({
  initial: false,
  schema: V5_SCHEMA,
  up(old: z.infer<typeof V4_SCHEMA>) {
    return {
      ...old,
      v: 5 as const,
    }
  },
})
