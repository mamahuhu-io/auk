import { z } from "zod"
import {
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "../1"
import { AukRESTAuthAPIKey } from "../4"
import { AukRESTAuthAWSSignature } from "../7"
import { AukRESTAuthDigest } from "../8/auth"
import { AukRESTAuthOAuth2 } from "../11/auth"
import { AukRESTAuthAkamaiEdgeGrid, AukRESTAuthHAWK } from "../12/auth"

export const AukRESTAuthJWT = z.object({
  authType: z.literal("jwt"),
  secret: z.string().catch(""),
  privateKey: z.string().catch(""), // For RSA/ECDSA algorithms
  algorithm: z
    .enum([
      "HS256",
      "HS384",
      "HS512",
      "RS256",
      "RS384",
      "RS512",
      "PS256",
      "PS384",
      "PS512",
      "ES256",
      "ES384",
      "ES512",
    ])
    .catch("HS256"),
  payload: z.string().catch("{}"),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
  isSecretBase64Encoded: z.boolean().catch(false),
  headerPrefix: z.string().catch("Bearer "),
  paramName: z.string().catch("token"),
  jwtHeaders: z.string().catch("{}"),
})

export type AukRESTAuthJWT = z.infer<typeof AukRESTAuthJWT>

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
