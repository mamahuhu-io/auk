import { z } from "zod"

import { defineVersion } from "verzod"

import { AukRESTAuthOAuth2 } from "../../rest/v/3"
import {
  AukGQLAuthAPIKey,
  AukGQLAuthBasic,
  AukGQLAuthBearer,
  AukGQLAuthInherit,
  AukGQLAuthNone,
  V2_SCHEMA,
} from "./2"

export { AukRESTAuthOAuth2 as AukGQLAuthOAuth2 } from "../../rest/v/3"

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

export const V3_SCHEMA = V2_SCHEMA.extend({
  v: z.literal(3),
  auth: AukGQLAuth,
})

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V2_SCHEMA>) {
    if (old.auth.authType === "oauth-2") {
      const { token, accessTokenURL, scope, clientID, authURL } = old.auth

      return {
        ...old,
        v: 3 as const,
        auth: {
          ...old.auth,
          authType: "oauth-2" as const,
          grantTypeInfo: {
            grantType: "AUTHORIZATION_CODE" as const,
            authEndpoint: authURL,
            tokenEndpoint: accessTokenURL,
            clientID: clientID,
            clientSecret: "",
            scopes: scope,
            isPKCE: false,
            token,
          },
          addTo: "HEADERS" as const,
        },
      }
    }

    return {
      ...old,
      v: 3 as const,
      auth: {
        ...old.auth,
      },
    }
  },
})
