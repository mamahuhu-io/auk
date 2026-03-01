import { InferredEntity, createVersionedEntity, entityReference } from "verzod"
import { z } from "zod"
import V0_VERSION from "./v/0"
import {
  AukRESTResOriginalReqSchemaVersion,
  AukRESTResponseOriginalRequest,
} from "./original-request"

export { AukRESTResponseOriginalRequest } from "./original-request"

const versionedObject = z.object({
  v: z.number(),
})

export const AukRESTRequestResponse = createVersionedEntity({
  latestVersion: 0,
  versionMap: {
    0: V0_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // Schema starts from version 0, so if the version is not present,
    // we assume it's version 0
    const result = V0_VERSION.schema.safeParse(data)
    return result.success ? 0 : null
  },
})

export type AukRESTRequestResponse = InferredEntity<
  typeof AukRESTRequestResponse
>

export const AukRESTRequestResponses = z.record(
  z.string(),
  entityReference(AukRESTRequestResponse)
)

export type AukRESTRequestResponses = z.infer<typeof AukRESTRequestResponses>

export function makeAukRESTResponseOriginalRequest(
  x: Omit<AukRESTResponseOriginalRequest, "v">
): AukRESTResponseOriginalRequest {
  return {
    v: AukRESTResOriginalReqSchemaVersion,
    ...x,
  }
}
