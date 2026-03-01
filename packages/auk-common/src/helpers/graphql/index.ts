import { AukGQLRequest, ValidContentTypes } from "@auk/data"
import * as Eq from "fp-ts/Eq"
import * as N from "fp-ts/number"
import * as S from "fp-ts/string"
import { lodashIsEqualEq, mapThenEq, undefinedEq } from "./eq"

export type FormDataKeyValue = {
  key: string
  active: boolean
} & ({ isFile: true; value: Blob[] } | { isFile: false; value: string })

export type AukGQLReqBodyFormData = {
  contentType: "multipart/form-data"
  body: FormDataKeyValue[]
}

export type AukGQLReqBody =
  | {
      contentType: Exclude<ValidContentTypes, "multipart/form-data">
      body: string
    }
  | AukGQLReqBodyFormData
  | {
      contentType: null
      body: null
    }

export const AukGQLRequestEq = Eq.struct<AukGQLRequest>({
  id: undefinedEq(S.Eq),
  v: N.Eq,
  name: S.Eq,
  url: S.Eq,
  headers: mapThenEq(
    (arr) => arr.filter((h) => h.key !== "" && h.value !== ""),
    lodashIsEqualEq
  ),
  query: S.Eq,
  variables: S.Eq,
  auth: lodashIsEqualEq,
})

export const isEqualAukGQLRequest = AukGQLRequestEq.equals
