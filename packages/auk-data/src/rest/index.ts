import * as Eq from "fp-ts/Eq"
import * as S from "fp-ts/string"
import cloneDeep from "lodash/cloneDeep"
import { createVersionedEntity, InferredEntity } from "verzod"
import { z } from "zod"

import { lodashIsEqualEq, mapThenEq, undefinedEq } from "../utils/eq"

import V0_VERSION from "./v/0"
import V1_VERSION from "./v/1"
import V2_VERSION, { AukRESTRequestVariables } from "./v/2"
import V3_VERSION from "./v/3"
import V4_VERSION from "./v/4"
import V5_VERSION from "./v/5"
import V6_VERSION from "./v/6"
import V7_VERSION, { AukRESTHeaders, AukRESTParams } from "./v/7"
import V8_VERSION from "./v/8"
import V9_VERSION from "./v/9"
import V10_VERSION from "./v/10"
import { AukRESTReqBody } from "./v/10/body"
import V11_VERSION from "./v/11"
import V12_VERSION from "./v/12"
import V13_VERSION from "./v/13"
import { AukRESTAuth } from "./v/15/auth"
import V14_VERSION from "./v/14"
import V15_VERSION from "./v/15/index"
import V16_VERSION from "./v/16"
import { AukRESTRequestResponses } from "../rest-request-response"
import { generateUniqueRefId } from "../utils/collection"
import V17_VERSION from "./v/17"

export * from "./content-types"

export {
  AukRESTAuthBasic,
  AukRESTAuthBearer,
  AukRESTAuthInherit,
  AukRESTAuthNone,
} from "./v/1"

export { AukRESTRequestVariables } from "./v/2"

export { AukRESTAuthAPIKey } from "./v/4"

export { AukRESTAuthAWSSignature, AukRESTHeaders, AukRESTParams } from "./v/7"

export { AukRESTAuthDigest } from "./v/8/auth"

export { FormDataKeyValue } from "./v/9/body"

export { AukRESTReqBody } from "./v/10/body"

export { AukRESTAuthHAWK, AukRESTAuthAkamaiEdgeGrid } from "./v/12/auth"

export { AukRESTAuth, AukRESTAuthJWT } from "./v/15/auth"
export { AuthCodeGrantTypeParams } from "./v/15/auth"
export { PasswordGrantTypeParams } from "./v/15/auth"
export { ImplicitOauthFlowParams } from "./v/15/auth"
export {
  AukRESTAuthOAuth2,
  ClientCredentialsGrantTypeParams,
  OAuth2AdvancedParam,
  OAuth2AuthRequestParam,
} from "./v/15/auth"

export {
  AukRESTRequestResponse,
  AukRESTRequestResponses,
} from "../rest-request-response"

const versionedObject = z.object({
  // v is a stringified number
  v: z.string().regex(/^\d+$/).transform(Number),
})

export const AukRESTRequest = createVersionedEntity({
  latestVersion: 17,
  versionMap: {
    0: V0_VERSION,
    1: V1_VERSION,
    2: V2_VERSION,
    3: V3_VERSION,
    4: V4_VERSION,
    5: V5_VERSION,
    6: V6_VERSION,
    7: V7_VERSION,
    8: V8_VERSION,
    9: V9_VERSION,
    10: V10_VERSION,
    11: V11_VERSION,
    12: V12_VERSION,
    13: V13_VERSION,
    14: V14_VERSION,
    15: V15_VERSION,
    16: V16_VERSION,
    17: V17_VERSION,
  },
  getVersion(data) {
    // For V1 onwards we have the v string storing the number
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // For V0 we have to check the schema
    const result = V0_VERSION.schema.safeParse(data)

    return result.success ? 0 : null
  },
})

export type AukRESTRequest = InferredEntity<typeof AukRESTRequest>

// TODO: Handle the issue with the preRequestScript and testScript type check failures on pre-commit
const AukRESTRequestEq = Eq.struct<AukRESTRequest>({
  id: undefinedEq(S.Eq),
  v: S.Eq,
  auth: lodashIsEqualEq,
  body: lodashIsEqualEq,
  endpoint: S.Eq,
  headers: mapThenEq(
    (arr) => arr.filter((h: any) => h.key !== "" && h.value !== ""),
    lodashIsEqualEq
  ),
  params: mapThenEq(
    (arr) => arr.filter((p: any) => p.key !== "" && p.value !== ""),
    lodashIsEqualEq
  ),
  method: S.Eq,
  name: S.Eq,
  preRequestScript: S.Eq,
  testScript: S.Eq,
  requestVariables: mapThenEq(
    (arr) => arr.filter((v: any) => v.key !== "" && v.value !== ""),
    lodashIsEqualEq
  ),
  responses: lodashIsEqualEq,
  _ref_id: undefinedEq(S.Eq),
  description: lodashIsEqualEq,
})

export const RESTReqSchemaVersion = "17"

export type AukRESTParam = AukRESTRequest["params"][number]
export type AukRESTHeader = AukRESTRequest["headers"][number]
export type AukRESTRequestVariable = AukRESTRequest["requestVariables"][number]

export const isEqualAukRESTRequest = AukRESTRequestEq.equals

/**
 * Safely tries to extract REST Request data from an unknown value.
 * If we fail to detect certain bits, we just resolve it to the default value
 * @param x The value to extract REST Request data from
 * @param defaultReq The default REST Request to source from
 *
 * @deprecated Usage of this function is no longer recommended and is only here
 * for legacy reasons and will be removed
 */
export function safelyExtractRESTRequest(
  x: unknown,
  defaultReq: AukRESTRequest
): AukRESTRequest {
  const req = cloneDeep(defaultReq)

  if (!!x && typeof x === "object") {
    if ("id" in x && typeof x.id === "string") req.id = x.id

    if ("_ref_id" in x && typeof x._ref_id === "string") req._ref_id = x._ref_id

    if ("name" in x && typeof x.name === "string") req.name = x.name

    if ("method" in x && typeof x.method === "string") req.method = x.method

    if ("endpoint" in x && typeof x.endpoint === "string")
      req.endpoint = x.endpoint

    if ("preRequestScript" in x && typeof x.preRequestScript === "string")
      req.preRequestScript = x.preRequestScript

    if ("testScript" in x && typeof x.testScript === "string")
      req.testScript = x.testScript

    if ("body" in x) {
      const result = AukRESTReqBody.safeParse(x.body)

      if (result.success) {
        req.body = result.data
      }
    }

    if ("auth" in x) {
      const result = AukRESTAuth.safeParse(x.auth)

      if (result.success) {
        req.auth = result.data
      }
    }

    if ("params" in x) {
      const result = AukRESTParams.safeParse(x.params)

      if (result.success) {
        req.params = result.data
      }
    }

    if ("headers" in x) {
      const result = AukRESTHeaders.safeParse(x.headers)

      if (result.success) {
        req.headers = result.data
      }
    }

    if ("requestVariables" in x) {
      const result = AukRESTRequestVariables.safeParse(x.requestVariables)

      if (result.success) {
        req.requestVariables = result.data
      }
    }

    if ("responses" in x) {
      const result = AukRESTRequestResponses.safeParse(x.responses)
      if (result.success) {
        req.responses = result.data
      }
    }

    if ("description" in x && typeof x.description === "string") {
      req.description = x.description
    }
  }

  return req
}

export function makeRESTRequest(x: Omit<AukRESTRequest, "v">): AukRESTRequest {
  return {
    v: RESTReqSchemaVersion,
    _ref_id: x._ref_id ?? generateUniqueRefId("req"),
    ...x,
  }
}

export function getDefaultRESTRequest(): AukRESTRequest {
  const ref_id = generateUniqueRefId("req")
  return {
    v: RESTReqSchemaVersion,
    endpoint: "https://echo.mamahuhu.dev",
    name: "Untitled",
    params: [],
    headers: [],
    method: "GET",
    auth: {
      authType: "inherit",
      authActive: true,
    },
    preRequestScript: "",
    testScript: "",
    body: {
      contentType: null,
      body: null,
    },
    requestVariables: [],
    responses: {},
    _ref_id: ref_id,
    description: null,
  }
}

/**
 * Checks if the given value is a AukRESTRequest
 * @param x The value to check
 *
 * @deprecated This function is no longer recommended and is only here for legacy reasons
 * Use `AukRESTRequest.is`/`AukRESTRequest.isLatest` instead.
 */
export function isAukRESTRequest(x: unknown): x is AukRESTRequest {
  return AukRESTRequest.isLatest(x)
}

/**
 * Safely parses a value into a AukRESTRequest.
 * @param x The value to check
 *
 * @deprecated This function is no longer recommended and is only here for
 * legacy reasons. Use `AukRESTRequest.safeParse` instead.
 */
export function translateToNewRequest(x: unknown): AukRESTRequest {
  const result = AukRESTRequest.safeParse(x)
  return result.type === "ok" ? result.value : getDefaultRESTRequest()
}
