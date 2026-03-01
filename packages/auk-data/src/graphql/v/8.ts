import { defineVersion } from "verzod"
import { z } from "zod"

import {
  AukGQLAuthBasic,
  AukGQLAuthBearer,
  AukGQLAuthInherit,
  AukGQLAuthNone,
} from "./2"
import { AukGQLAuthAPIKey } from "./4"
import { AukGQLAuthAWSSignature } from "./6"
import { AukRESTAuthOAuth2 } from "../../rest/v/11/auth"
import { V7_SCHEMA } from "./7"

export { AukRESTAuthOAuth2 as AukGQLAuthOAuth2 } from "../../rest/v/11/auth"

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

export const V8_SCHEMA = V7_SCHEMA.extend({
  v: z.literal(8),
  auth: AukGQLAuth,
})

export default defineVersion({
  schema: V8_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V7_SCHEMA>) {
    const auth = old.auth

    return {
      ...old,
      v: 8 as const,
      auth:
        auth.authType === "oauth-2"
          ? {
              ...auth,
              grantTypeInfo:
                auth.grantTypeInfo.grantType === "CLIENT_CREDENTIALS"
                  ? {
                      ...auth.grantTypeInfo,
                      clientAuthentication: "IN_BODY" as const,
                    }
                  : auth.grantTypeInfo,
            }
          : auth,
    }
  },
})
