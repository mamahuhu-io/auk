import {
  parseTemplateString,
  AukRESTAuth,
  Environment,
  AukRESTHeader,
  AukRESTParam,
} from "@auk/data"

export async function generateOAuth2AuthHeaders(
  auth: AukRESTAuth & { authType: "oauth-2" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<AukRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  const token = parseTemplateString(
    auth.grantTypeInfo.token,
    envVars,
    false,
    showKeyIfSecret
  )

  return [
    {
      active: true,
      key: "Authorization",
      value: `Bearer ${token}`,
      description: "",
    },
  ]
}

export async function generateOAuth2AuthParams(
  auth: AukRESTAuth & { authType: "oauth-2" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<AukRESTParam[]> {
  if (auth.addTo !== "QUERY_PARAMS") return []

  const token = parseTemplateString(
    auth.grantTypeInfo.token,
    envVars,
    false,
    showKeyIfSecret
  )

  return [
    {
      active: true,
      key: "access_token",
      value: token,
      description: "",
    },
  ]
}
