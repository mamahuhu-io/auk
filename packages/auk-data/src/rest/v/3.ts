import { z } from "zod"
import {
  AukRESTAuthAPIKey,
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "./1"
import { V2_SCHEMA } from "./2"

import { defineVersion } from "verzod"

export const AuthCodeGrantTypeParams = z.object({
  grantType: z.literal("AUTHORIZATION_CODE"),
  authEndpoint: z.string().trim(),
  tokenEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  clientSecret: z.string().trim(),
  scopes: z.string().trim().optional(),
  token: z.string().catch(""),
  isPKCE: z.boolean(),
  codeVerifierMethod: z
    .union([z.literal("plain"), z.literal("S256")])
    .optional(),
})

export const ClientCredentialsGrantTypeParams = z.object({
  grantType: z.literal("CLIENT_CREDENTIALS"),
  authEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  clientSecret: z.string().trim(),
  scopes: z.string().trim().optional(),
  token: z.string().catch(""),
})

export const PasswordGrantTypeParams = z.object({
  grantType: z.literal("PASSWORD"),
  authEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  clientSecret: z.string().trim(),
  scopes: z.string().trim().optional(),
  username: z.string().trim(),
  password: z.string().trim(),
  token: z.string().catch(""),
})

export const ImplicitOauthFlowParams = z.object({
  grantType: z.literal("IMPLICIT"),
  authEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  scopes: z.string().trim().optional(),
  token: z.string().catch(""),
})

export const AukRESTAuthOAuth2 = z.object({
  authType: z.literal("oauth-2"),
  grantTypeInfo: z.discriminatedUnion("grantType", [
    AuthCodeGrantTypeParams,
    ClientCredentialsGrantTypeParams,
    PasswordGrantTypeParams,
    ImplicitOauthFlowParams,
  ]),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export type AukRESTAuthOAuth2 = z.infer<typeof AukRESTAuthOAuth2>

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

// V2_SCHEMA has one change in AukRESTAuthOAuth2, we'll add the grant_type field
export const V3_SCHEMA = V2_SCHEMA.extend({
  v: z.literal("3"),
  auth: AukRESTAuth,
})

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V2_SCHEMA>) {
    if (old.auth.authType === "oauth-2") {
      const { token, accessTokenURL, scope, clientID, authURL } = old.auth

      return {
        ...old,
        v: "3" as const,
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
      v: "3" as const,
      auth: {
        ...old.auth,
      },
    }
  },
})
