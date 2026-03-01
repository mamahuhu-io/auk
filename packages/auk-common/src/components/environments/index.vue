<template>
  <div>
    <div
      class="sticky top-0 z-10 flex flex-shrink-0 flex-col overflow-x-auto bg-primary"
    >
      <WorkspaceCurrent :section="t('tab.environments')" />
      <EnvironmentsMyEnvironment
        environment-index="Global"
        :environment="globalEnvironment"
        :duplicate-global-environment-loading="
          duplicateGlobalEnvironmentLoading
        "
        class="border-b border-dividerLight"
        @duplicate-global-environment="duplicateGlobalEnvironment"
        @edit-environment="editEnvironment('Global')"
      />
    </div>
    <EnvironmentsMy @select-environment="handleEnvironmentChange" />
    <EnvironmentsMyDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment-index="editingEnvironmentIndex"
      :editing-variable-name="editingVariableName"
      :env-vars="envVars"
      :is-secret-option-selected="secretOptionSelected"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsAdd
      :show="showModalNew"
      :name="editingVariableName"
      :value="editingVariableValue"
      :position="position"
      @hide-modal="displayModalNew(false)"
    />
  </div>

  <AukSmartConfirmModal
    :show="showConfirmRemoveEnvModal"
    :title="`${t('confirm.remove_environment')}`"
    @hide-modal="showConfirmRemoveEnvModal = false"
    @resolve="removeSelectedEnvironment()"
  />
</template>

<script setup lang="ts">
import { useReadonlyStream, useStream } from "@composables/stream"
import { Environment, GlobalEnvironment } from "@auk/data"
import { cloneDeep } from "lodash-es"
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { defineActionHandler } from "~/helpers/actions"
import {
  createEnvironment,
  deleteEnvironment,
  getGlobalVariables,
  getSelectedEnvironmentIndex,
  globalEnv$,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/store/environments"

const t = useI18n()
const toast = useToast()

const globalEnv = useReadonlyStream(globalEnv$, {} as GlobalEnvironment)

const globalEnvironment = computed<Environment>(() => ({
  v: 2 as const,
  id: "Global",
  name: "Global",
  variables: globalEnv.value.variables,
}))

const selectedEnvironmentIndex = useStream(
  selectedEnvironmentIndex$,
  { type: "NO_ENV_SELECTED" },
  setSelectedEnvironmentIndex
)

const showConfirmRemoveEnvModal = ref(false)
const showModalNew = ref(false)
const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironmentIndex = ref<"Global" | null>(null)
const editingVariableName = ref("")
const editingVariableValue = ref("")
const secretOptionSelected = ref(false)
const duplicateGlobalEnvironmentLoading = ref(false)

const position = ref({ top: 0, left: 0 })

const displayModalNew = (shouldDisplay: boolean) => {
  showModalNew.value = shouldDisplay
}

const displayModalEdit = (shouldDisplay: boolean) => {
  action.value = "edit"
  showModalDetails.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}

export type HandleEnvChangeProp = {
  index: number
  env?: {
    type: "my-environment"
    environment: Environment
  }
}

const handleEnvironmentChange = ({ index, env }: HandleEnvChangeProp) => {
  if (env?.type === "my-environment") {
    selectedEnvironmentIndex.value = {
      type: "WORKSPACE_ENV",
      index,
    }
  }
}

const editEnvironment = (environmentIndex: "Global") => {
  editingEnvironmentIndex.value = environmentIndex
  action.value = "edit"
  editingVariableName.value = ""
  displayModalEdit(true)
}

const duplicateGlobalEnvironment = async () => {
  createEnvironment(
    `Global - ${t("action.duplicate")}`,
    cloneDeep(getGlobalVariables())
  )

  toast.success(`${t("environment.duplicated")}`)
}

const removeSelectedEnvironment = () => {
  const selectedEnvIndex = getSelectedEnvironmentIndex()
  if (selectedEnvIndex?.type === "NO_ENV_SELECTED") return

  if (selectedEnvIndex?.type === "WORKSPACE_ENV") {
    deleteEnvironment(selectedEnvIndex.index)
    toast.success(`${t("state.deleted")}`)
  }
}

const resetSelectedData = () => {
  editingEnvironmentIndex.value = null
  editingVariableName.value = ""
  editingVariableValue.value = ""
  secretOptionSelected.value = false
}

defineActionHandler("modals.environment.new", () => {
  action.value = "new"
  showModalDetails.value = true
})

defineActionHandler("modals.environment.delete-selected", () => {
  showConfirmRemoveEnvModal.value = true
})

const additionalVars = ref<Environment["variables"]>([])

const envVars = () => [...globalEnv.value.variables, ...additionalVars.value]

defineActionHandler(
  "modals.global.environment.update",
  ({ variables, isSecret }) => {
    if (variables) {
      additionalVars.value = variables
    }
    secretOptionSelected.value = isSecret ?? false
    editEnvironment("Global")
    editingVariableName.value = "Global"
  }
)

defineActionHandler("modals.environment.add", ({ envName, variableName }) => {
  editingVariableName.value = envName
  editingVariableValue.value = variableName ?? ""
  displayModalNew(true)
})
</script>
