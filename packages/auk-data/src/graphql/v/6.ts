import { defineVersion } from "verzod"
import { z } from "zod"
import { AukRESTAuthAWSSignature } from "./../../rest/v/7"
import {
  AukGQLAuthBasic,
  AukGQLAuthBearer,
  AukGQLAuthInherit,
  AukGQLAuthNone,
} from "./2"
import { AukGQLAuthOAuth2, V5_SCHEMA } from "./5"
import { AukGQLAuthAPIKey } from "./4"

export { AukRESTAuthOAuth2 as AukGQLAuthOAuth2 } from "../../rest/v/7"

// Both REST & GQL have the same schema definition for AWS Signature Authorization type
export const AukGQLAuthAWSSignature = AukRESTAuthAWSSignature

export type AukGQLAuthAWSSignature = z.infer<typeof AukGQLAuthAWSSignature>

export const GQLHeader = z.object({
  key: z.string().catch(""),
  value: z.string().catch(""),
  active: z.boolean().catch(true),
  description: z.string().catch(""),
})

export type GQLHeader = z.infer<typeof GQLHeader>

export const AukGQLAuth = z
  .discriminatedUnion("authType", [
    AukGQLAuthNone,
    AukGQLAuthInherit,
    AukGQLAuthBasic,
    AukGQLAuthBearer,
    AukGQLAuthOAuth2,
    AukGQLAuthAPIKey,
    AukGQLAuthAWSSignature,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukGQLAuth = z.infer<typeof AukGQLAuth>

export const V6_SCHEMA = V5_SCHEMA.extend({
  v: z.literal(6),
  auth: AukGQLAuth,
  headers: z.array(GQLHeader).catch([]),
})

export default defineVersion({
  schema: V6_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V6_SCHEMA>) {
    const headers = old.headers.map((header) => {
      return {
        ...header,
        description: "",
      }
    })

    return {
      ...old,
      v: 6 as const,
      headers,
    }
  },
})
