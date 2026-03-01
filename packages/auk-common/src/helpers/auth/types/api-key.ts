import {
  parseTemplateString,
  AukRESTAuth,
  Environment,
  AukRESTHeader,
  AukRESTParam,
} from "@auk/data"

export async function generateApiKeyAuthHeaders(
  auth: AukRESTAuth & { authType: "api-key" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<AukRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  return [
    {
      active: true,
      key: parseTemplateString(auth.key, envVars, false, showKeyIfSecret),
      value: parseTemplateString(
        auth.value ?? "",
        envVars,
        false,
        showKeyIfSecret
      ),
      description: "",
    },
  ]
}

export async function generateApiKeyAuthParams(
  auth: AukRESTAuth & { authType: "api-key" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<AukRESTParam[]> {
  if (auth.addTo !== "QUERY_PARAMS") return []

  return [
    {
      active: true,
      key: parseTemplateString(auth.key, envVars, false, showKeyIfSecret),
      value: parseTemplateString(auth.value, envVars, false, showKeyIfSecret),
      description: "",
    },
  ]
}
