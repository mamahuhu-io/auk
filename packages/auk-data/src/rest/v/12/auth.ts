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

export const AukRESTAuthHAWK = z.object({
  authType: z.literal("hawk"),
  authId: z.string().catch(""),
  authKey: z.string().catch(""),
  algorithm: z.enum(["sha256", "sha1"]).catch("sha256"),
  includePayloadHash: z.boolean().catch(false),

  // Optional fields
  user: z.string().optional(),
  nonce: z.string().optional(),
  ext: z.string().optional(),
  app: z.string().optional(),
  dlg: z.string().optional(),
  timestamp: z.string().optional(),
})

export const AukRESTAuthAkamaiEdgeGrid = z.object({
  authType: z.literal("akamai-eg"),
  accessToken: z.string().catch(""),
  clientToken: z.string().catch(""),
  clientSecret: z.string().catch(""),

  // Optional fields
  nonce: z.string().optional(),
  timestamp: z.string().optional(),
  host: z.string().optional(),
  headersToSign: z.string().optional(),
  maxBodySize: z.string().optional(),
})

export type AukRESTAuthHAWK = z.infer<typeof AukRESTAuthHAWK>
export type AukRESTAuthAkamaiEdgeGrid = z.infer<
  typeof AukRESTAuthAkamaiEdgeGrid
>

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
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukRESTAuth = z.infer<typeof AukRESTAuth>
