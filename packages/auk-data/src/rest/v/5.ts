import { z } from "zod"
import { defineVersion } from "verzod"
import {
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "./1"
import { AukRESTAuthAPIKey, V4_SCHEMA } from "./4"
import {
  AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld,
  ClientCredentialsGrantTypeParams,
  AukRESTAuthOAuth2 as AukRESTAuthOAuth2Old,
  ImplicitOauthFlowParams,
  PasswordGrantTypeParams,
} from "./3"

export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  clientSecret: z.string().optional(),
})

export const AukRESTAuthOAuth2 = AukRESTAuthOAuth2Old.extend({
  grantTypeInfo: z.discriminatedUnion("grantType", [
    AuthCodeGrantTypeParams,
    ClientCredentialsGrantTypeParams,
    PasswordGrantTypeParams,
    ImplicitOauthFlowParams,
  ]),
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

export const V5_SCHEMA = V4_SCHEMA.extend({
  v: z.literal("5"),
  auth: AukRESTAuth,
})

export default defineVersion({
  schema: V5_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V4_SCHEMA>) {
    // v5 is not a breaking change in terms of migrations
    // we're just making clientSecret in authcode + pkce flow optional
    return {
      ...old,
      v: "5" as const,
    }
  },
})
