import {
  parseTemplateString,
  AukRESTAuth,
  Environment,
  AukRESTHeader,
} from "@auk/data"

export async function generateBasicAuthHeaders(
  auth: AukRESTAuth & { authType: "basic" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<AukRESTHeader[]> {
  const username = parseTemplateString(
    auth.username,
    envVars,
    false,
    showKeyIfSecret
  )
  const password = parseTemplateString(
    auth.password,
    envVars,
    false,
    showKeyIfSecret
  )

  return [
    {
      active: true,
      key: "Authorization",
      value: `Basic ${btoa(`${username}:${password}`)}`,
      description: "",
    },
  ]
}
