import { InfraPlatformDef } from "@auk/common/platform/infra"
import * as E from "fp-ts/Either"

// Simplified for local-only mode - no backend SMTP check needed
export const def: InfraPlatformDef = {
  getIsSMTPEnabled: async () => {
    // In local-only mode, SMTP is not available
    return E.right(false)
  },
}
