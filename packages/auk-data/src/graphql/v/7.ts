import { defineVersion } from "verzod"
import { z } from "zod"

import {
  AukGQLAuthBasic,
  AukGQLAuthBearer,
  AukGQLAuthInherit,
  AukGQLAuthNone,
} from "./2"
import { AukGQLAuthAPIKey } from "./4"
import { AukGQLAuthAWSSignature, V6_SCHEMA } from "./6"
import { AukRESTAuthOAuth2 } from "./../../rest/v/7"

export { AukRESTAuthOAuth2 as AukGQLAuthOAuth2 } from "../../rest/v/7"

export const AukGQLAuth = z
  .discriminatedUnion("authType", [
    AukGQLAuthNone,
    AukGQLAuthInherit,
    AukGQLAuthBasic,
    AukGQLAuthBearer,
    AukRESTAuthOAuth2,
    AukGQLAuthAPIKey,
    AukGQLAuthAWSSignature,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukGQLAuth = z.infer<typeof AukGQLAuth>

export const V7_SCHEMA = V6_SCHEMA.extend({
  v: z.literal(7),
  auth: AukGQLAuth,
})

export default defineVersion({
  schema: V7_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V6_SCHEMA>) {
    return {
      ...old,
      v: 7 as const,
      // no need to update anything for AukGQLAuth, because we loosened the previous schema by making `clientSecret` optional
    }
  },
})
