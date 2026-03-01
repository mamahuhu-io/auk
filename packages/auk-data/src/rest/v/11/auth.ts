import {
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "../1"
import { AukRESTAuthAPIKey } from "../4"
import { AuthCodeGrantTypeParams, AukRESTAuthAWSSignature } from "../7"
import {
  ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld,
  AukRESTAuthDigest,
  PasswordGrantTypeParams,
} from "../8/auth"
import { ImplicitOauthFlowParams } from "../3"
import { z } from "zod"

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    clientAuthentication: z.enum(["AS_BASIC_AUTH_HEADERS", "IN_BODY"]),
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
    AukRESTAuthAWSSignature,
    AukRESTAuthDigest,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukRESTAuth = z.infer<typeof AukRESTAuth>
