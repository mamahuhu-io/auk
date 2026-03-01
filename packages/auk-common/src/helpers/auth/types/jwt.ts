import {
  Environment,
  generateJWTToken,
  AukRESTAuth,
  AukRESTHeader,
  AukRESTParam,
  parseTemplateString,
} from "@auk/data"

export async function generateJwtAuthHeaders(
  auth: AukRESTAuth & { authType: "jwt" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<AukRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  const token = await generateJWTToken({
    algorithm: auth.algorithm || "HS256",
    secret: parseTemplateString(auth.secret, envVars, false),
    privateKey: parseTemplateString(auth.privateKey, envVars, false),
    payload: parseTemplateString(auth.payload, envVars, false),
    jwtHeaders: parseTemplateString(auth.jwtHeaders, envVars, false),
    isSecretBase64Encoded: auth.isSecretBase64Encoded,
  })

  if (!token) return []

  // Get prefix (defaults to "Bearer " if not specified)
  const headerPrefix = parseTemplateString(
    auth.headerPrefix,
    envVars,
    false,
    showKeyIfSecret
  )

  return [
    {
      active: true,
      key: "Authorization",
      value: `${headerPrefix}${token}`,
      description: "",
    },
  ]
}

export async function generateJwtAuthParams(
  auth: AukRESTAuth & { authType: "jwt" },
  envVars: Environment["variables"]
): Promise<AukRESTParam[]> {
  if (auth.addTo !== "QUERY_PARAMS") return []

  const token = await generateJWTToken({
    algorithm: auth.algorithm || "HS256",
    secret: parseTemplateString(auth.secret, envVars, false),
    privateKey: parseTemplateString(auth.privateKey, envVars, false),
    payload: parseTemplateString(auth.payload, envVars, false),
    jwtHeaders: parseTemplateString(auth.jwtHeaders, envVars, false),
    isSecretBase64Encoded: auth.isSecretBase64Encoded,
  })

  if (!token) return []

  // Get param name (defaults to "token" if not specified)
  const paramName = parseTemplateString(auth.paramName, envVars)

  return [
    {
      active: true,
      key: paramName,
      value: token,
      description: "",
    },
  ]
}
