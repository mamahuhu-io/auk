import { z } from "zod"
import {
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "../1"
import { AukRESTAuthAPIKey } from "../4"
import {
  AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld,
  AukRESTAuthAWSSignature,
} from "../7"
import {
  AukRESTAuthDigest,
  PasswordGrantTypeParams as PasswordGrantTypeParamsOld,
} from "../8/auth"
import { AukRESTAuthAkamaiEdgeGrid, AukRESTAuthHAWK } from "../12/auth"
import { AukRESTAuthJWT } from "../13/auth"
import { ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld } from "../11/auth"
import { ImplicitOauthFlowParams as ImplicitOauthFlowParamsOld } from "../3"

export { AukRESTAuthJWT } from "../13/auth"

// Define the OAuth2 advanced parameter structure
export const OAuth2AdvancedParam = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  active: z.boolean(),
  sendIn: z.enum(["headers", "url", "body"]).catch("headers"),
})

// omit sendIn from OAuth2AuthRequestParam
export const OAuth2AuthRequestParam = OAuth2AdvancedParam.omit({ sendIn: true })

export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  authRequestParams: z.array(OAuth2AuthRequestParam).optional().default([]),
  tokenRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
  refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
})

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    tokenRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
    refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
  })

export const PasswordGrantTypeParams = PasswordGrantTypeParamsOld.extend({
  tokenRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
  refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
})

export const ImplicitOauthFlowParams = ImplicitOauthFlowParamsOld.extend({
  authRequestParams: z.array(OAuth2AuthRequestParam).optional().default([]),
  refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
})

// Extend OAuth2 with advanced parameters
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
    AukRESTAuthHAWK,
    AukRESTAuthAkamaiEdgeGrid,
    AukRESTAuthJWT,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukRESTAuth = z.infer<typeof AukRESTAuth>
