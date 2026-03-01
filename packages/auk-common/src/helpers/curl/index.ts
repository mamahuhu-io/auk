import { flow } from "fp-ts/function"
import { cloneDeep } from "lodash-es"
import { parseCurlCommand } from "./curlparser"

export const parseCurlToAukRESTReq = flow(parseCurlCommand, cloneDeep)
