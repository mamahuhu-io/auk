import { z } from "zod"
import { defineVersion } from "verzod"
import { V11_SCHEMA } from "../11"

import { AukRESTAuth } from "./auth"

export const V12_SCHEMA = V11_SCHEMA.extend({
  v: z.literal("12"),
  auth: AukRESTAuth,
})

export default defineVersion({
  schema: V12_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V11_SCHEMA>) {
    return {
      ...old,
      v: "12" as const,
    }
  },
})
