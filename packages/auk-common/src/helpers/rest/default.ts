import { AukRESTRequest, RESTReqSchemaVersion } from "@auk/data"

export const getDefaultRESTRequest = (): AukRESTRequest => ({
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
})
