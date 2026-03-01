import { z } from "zod"
import { defineVersion } from "verzod"
import {
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "./1"
import { AukRESTAuthAPIKey } from "./4"
import { V6_SCHEMA } from "./6"

import { AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld } from "./5"

import {
  ClientCredentialsGrantTypeParams,
  ImplicitOauthFlowParams,
  PasswordGrantTypeParams,
} from "./3"

// Add refreshToken to all grant types except Implicit
export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  refreshToken: z.string().optional(),
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

export const AukRESTParams = z.array(
  z.object({
    key: z.string().catch(""),
    value: z.string().catch(""),
    active: z.boolean().catch(true),
    description: z.string().catch(""),
  })
)

export type AukRESTParams = z.infer<typeof AukRESTParams>

export const AukRESTHeaders = z.array(
  z.object({
    key: z.string().catch(""),
    value: z.string().catch(""),
    active: z.boolean().catch(true),
    description: z.string().catch(""),
  })
)

export type AukRESTHeaders = z.infer<typeof AukRESTHeaders>

// in this new version, we add a new auth type for AWS Signature
// this auth type is used for AWS Signature V5 authentication
// it requires the user to provide the access key id, secret access key, region, service name, and service token

export const AukRESTAuthAWSSignature = z.object({
  authType: z.literal("aws-signature"),
  accessKey: z.string().catch(""),
  secretKey: z.string().catch(""),
  region: z.string().catch(""),
  serviceName: z.string().catch(""),
  serviceToken: z.string().optional(),
  signature: z.object({}).optional(),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export type AukRESTAuthAWSSignature = z.infer<typeof AukRESTAuthAWSSignature>

export const AukRESTAuth = z
  .discriminatedUnion("authType", [
    AukRESTAuthNone,
    AukRESTAuthInherit,
    AukRESTAuthBasic,
    AukRESTAuthBearer,
    AukRESTAuthOAuth2,
    AukRESTAuthAPIKey,
    AukRESTAuthAWSSignature,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukRESTAuth = z.infer<typeof AukRESTAuth>

export const V7_SCHEMA = V6_SCHEMA.extend({
  v: z.literal("7"),
  params: AukRESTParams,
  headers: AukRESTHeaders,
  auth: AukRESTAuth,
})

export default defineVersion({
  schema: V7_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V6_SCHEMA>) {
    const params = old.params.map((param) => {
      return {
        ...param,
        description: "",
      }
    })

    const headers = old.headers.map((header) => {
      return {
        ...header,
        description: "",
      }
    })

    return {
      ...old,
      v: "7" as const,
      params,
      headers,
      // no need to update anything for AukRESTAuth, because the newly added refreshToken is optional
    }
  },
})
