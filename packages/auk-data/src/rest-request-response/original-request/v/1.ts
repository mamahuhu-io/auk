import { defineVersion } from "verzod"
import { z } from "zod"
import { AukRESTHeaders, AukRESTParams } from "../../../rest/v/7"
import { AukRESTReqBody } from "../../../rest/v/6"
import { AukRESTRequestVariables } from "../../../rest/v/2"

import { AukRESTAuth } from "../../../rest/v/8/auth"

export const V1_SCHEMA = z.object({
  v: z.literal("1"),
  name: z.string(),
  method: z.string(),
  endpoint: z.string(),
  headers: AukRESTHeaders,
  params: AukRESTParams,
  body: AukRESTReqBody,
  auth: AukRESTAuth,
  requestVariables: AukRESTRequestVariables,
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
