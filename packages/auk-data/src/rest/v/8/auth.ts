import {
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "../1"

import { AukRESTAuthAPIKey } from "../4"

import {
  ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld,
  ImplicitOauthFlowParams,
  PasswordGrantTypeParams as PasswordGrantTypeParamsOld,
} from "../3"

import { AuthCodeGrantTypeParams, AukRESTAuthAWSSignature } from "../7"
import { z } from "zod"

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    clientSecret: z.string().optional(),
  })

export const PasswordGrantTypeParams = PasswordGrantTypeParamsOld.extend({
  clientSecret: z.string().optional(),
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

// in this new version, we add a new auth type for Digest authentication
export const AukRESTAuthDigest = z.object({
  authType: z.literal("digest"),
  username: z.string().catch(""),
  password: z.string().catch(""),
  realm: z.string().catch(""),
  nonce: z.string().catch(""),
  algorithm: z.enum(["MD5", "MD5-sess"]).catch("MD5"),
  qop: z.enum(["auth", "auth-int"]).catch("auth"),
  nc: z.string().catch(""),
  cnonce: z.string().catch(""),
  opaque: z.string().catch(""),
  disableRetry: z.boolean().catch(false),
})

export type AukRESTAuthDigest = z.infer<typeof AukRESTAuthDigest>

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
