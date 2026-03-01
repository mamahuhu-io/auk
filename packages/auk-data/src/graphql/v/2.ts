import { z } from "zod"
import { defineVersion } from "verzod"
import { GQLHeader, V1_SCHEMA } from "./1"

export const AukGQLAuthNone = z.object({
  authType: z.literal("none"),
})

export type AukGQLAuthNone = z.infer<typeof AukGQLAuthNone>

export const AukGQLAuthBasic = z.object({
  authType: z.literal("basic"),

  username: z.string().catch(""),
  password: z.string().catch(""),
})

export type AukGQLAuthBasic = z.infer<typeof AukGQLAuthBasic>

export const AukGQLAuthBearer = z.object({
  authType: z.literal("bearer"),

  token: z.string().catch(""),
})

export type AukGQLAuthBearer = z.infer<typeof AukGQLAuthBearer>

export const AukGQLAuthOAuth2 = z.object({
  authType: z.literal("oauth-2"),

  token: z.string().catch(""),
  oidcDiscoveryURL: z.string().catch(""),
  authURL: z.string().catch(""),
  accessTokenURL: z.string().catch(""),
  clientID: z.string().catch(""),
  scope: z.string().catch(""),
})

export type AukGQLAuthOAuth2 = z.infer<typeof AukGQLAuthOAuth2>

export const AukGQLAuthAPIKey = z.object({
  authType: z.literal("api-key"),

  key: z.string().catch(""),
  value: z.string().catch(""),
  addTo: z.string().catch("Headers"),
})

export type AukGQLAuthAPIKey = z.infer<typeof AukGQLAuthAPIKey>

export const AukGQLAuthInherit = z.object({
  authType: z.literal("inherit"),
})

export type AukGQLAuthInherit = z.infer<typeof AukGQLAuthInherit>

export const AukGQLAuth = z
  .discriminatedUnion("authType", [
    AukGQLAuthNone,
    AukGQLAuthBasic,
    AukGQLAuthBearer,
    AukGQLAuthOAuth2,
    AukGQLAuthAPIKey,
    AukGQLAuthInherit,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type AukGQLAuth = z.infer<typeof AukGQLAuth>

export const V2_SCHEMA = z.object({
  id: z.optional(z.string()),
  v: z.literal(2),

  name: z.string(),
  url: z.string(),
  headers: z.array(GQLHeader).catch([]),
  query: z.string(),
  variables: z.string(),

  auth: AukGQLAuth,
})

export default defineVersion({
  initial: false,
  schema: V2_SCHEMA,
  up(old: z.infer<typeof V1_SCHEMA>) {
    return <z.infer<typeof V2_SCHEMA>>{
      ...old,
      v: 2,
      auth: {
        authActive: true,
        authType: "none",
      },
    }
  },
})
