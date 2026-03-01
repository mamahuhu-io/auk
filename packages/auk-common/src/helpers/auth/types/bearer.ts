import {
  parseTemplateString,
  AukRESTAuth,
  Environment,
  AukRESTHeader,
} from "@auk/data"

export async function generateBearerAuthHeaders(
  auth: AukRESTAuth & { authType: "bearer" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<AukRESTHeader[]> {
  const token = parseTemplateString(auth.token, envVars, false, showKeyIfSecret)

  return [
    {
      active: true,
      key: "Authorization",
      value: `Bearer ${token}`,
      description: "",
    },
  ]
}
