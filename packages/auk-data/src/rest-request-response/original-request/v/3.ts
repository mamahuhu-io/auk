import { defineVersion } from "verzod"
import { z } from "zod"

import { V2_SCHEMA } from "./2"
import { AukRESTAuth } from "../../../rest/v/11/auth"
import { AukRESTReqBody } from "../../../rest/v/10/body"

export const V3_SCHEMA = V2_SCHEMA.extend({
  v: z.literal("3"),
  auth: AukRESTAuth,
  body: AukRESTReqBody,
})

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V2_SCHEMA>) {
    const auth = old.auth

    return {
      ...old,
      v: "3" as const,
      auth:
        auth.authType === "oauth-2"
          ? {
              ...auth,
              grantTypeInfo:
                auth.grantTypeInfo.grantType === "CLIENT_CREDENTIALS"
                  ? {
                      ...auth.grantTypeInfo,
                      clientAuthentication: "IN_BODY" as const,
                    }
                  : auth.grantTypeInfo,
            }
          : auth,
    }
  },
})
