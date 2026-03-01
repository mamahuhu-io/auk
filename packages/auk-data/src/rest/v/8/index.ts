import { defineVersion } from "verzod"
import { z } from "zod"

import { V7_SCHEMA } from "../7"

import { AukRESTRequestResponses } from "../../../rest-request-response"

import { AukRESTAuth } from "./auth"

export const V8_SCHEMA = V7_SCHEMA.extend({
  v: z.literal("8"),
  auth: AukRESTAuth,
  responses: AukRESTRequestResponses,
})

export default defineVersion({
  schema: V8_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V7_SCHEMA>) {
    return {
      ...old,
      v: "8" as const,
      // no need to update anything for AukRESTAuth, because we loosened the previous schema by making `clientSecret` optional
      responses: {},
    }
  },
})
