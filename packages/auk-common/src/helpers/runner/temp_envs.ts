import { ref } from "vue"
import { GlobalEnvironmentVariable } from "@auk/data"

export const temporaryVariables = ref<GlobalEnvironmentVariable[]>([])

export function getTemporaryVariables() {
  return temporaryVariables.value
}

export function setTemporaryVariables(variables: GlobalEnvironmentVariable[]) {
  temporaryVariables.value = variables
}
