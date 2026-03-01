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
import { AukRESTAuthOAuth2 } from "../../rest/v/15/auth"
import { V8_SCHEMA } from "./8"

export { AukRESTAuthOAuth2 as AukGQLAuthOAuth2 } from "../../rest/v/15/auth"

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

export const V9_SCHEMA = V8_SCHEMA.extend({
  v: z.literal(9),
  auth: AukGQLAuth,
})

export default defineVersion({
  schema: V9_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V8_SCHEMA>) {
    // If the auth is OAuth2, migrate it to include the new advanced parameters
    let newAuth: z.infer<typeof AukGQLAuth>
    if (old.auth.authType === "oauth-2") {
      const oldGrantTypeInfo = old.auth.grantTypeInfo
      let newGrantTypeInfo

      // Add the advanced parameters to the appropriate grant type
      if (oldGrantTypeInfo.grantType === "AUTHORIZATION_CODE") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          authRequestParams: [],
          tokenRequestParams: [],
          refreshRequestParams: [],
        }
      } else if (oldGrantTypeInfo.grantType === "CLIENT_CREDENTIALS") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          tokenRequestParams: [],
          refreshRequestParams: [],
        }
      } else if (oldGrantTypeInfo.grantType === "PASSWORD") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          tokenRequestParams: [],
          refreshRequestParams: [],
        }
      } else if (oldGrantTypeInfo.grantType === "IMPLICIT") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          authRequestParams: [],
          refreshRequestParams: [],
        }
      } else {
        newGrantTypeInfo = oldGrantTypeInfo
      }

      newAuth = {
        ...old.auth,
        grantTypeInfo: newGrantTypeInfo,
      } as z.infer<typeof AukGQLAuth>
    } else {
      newAuth = old.auth
    }

    return {
      ...old,
      v: 9 as const,
      auth: newAuth,
    }
  },
})
