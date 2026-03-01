import { Environment } from "@auk/data"

export const environmentsExporter = (myEnvironments: Environment[]) => {
  return JSON.stringify(myEnvironments, null, 2)
}
