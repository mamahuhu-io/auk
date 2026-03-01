import { defineVersion, entityReference } from "verzod"
import { z } from "zod"
import { AukRESTResponseOriginalRequest } from "../original-request"
import { StatusCodes } from "../../utils/statusCodes"

export const ValidCodes = z.union(
  Object.keys(StatusCodes).map((code) => z.literal(parseInt(code))) as [
    z.ZodLiteral<number>,
    z.ZodLiteral<number>,
    ...z.ZodLiteral<number>[]
  ]
)

export const AukRESTResponseHeaders = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
  })
)

export type AukRESTResponseHeader = z.infer<typeof AukRESTResponseHeaders>

export const V0_SCHEMA = z.object({
  name: z.string(),
  originalRequest: entityReference(AukRESTResponseOriginalRequest),
  status: z.string(),
  code: z.optional(ValidCodes).nullable().catch(null),
  headers: AukRESTResponseHeaders,
  body: z.string(),
})

export default defineVersion({
  initial: true,
  schema: V0_SCHEMA,
})
