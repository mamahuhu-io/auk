<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('modal.edit_response')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex gap-1">
        <AukSmartInput
          v-model="editingName"
          class="flex-grow"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="editResponse"
        />
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <AukButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="editResponse"
        />
        <AukButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { AukRESTRequest } from "@auk/data"
import { useVModel } from "@vueuse/core"

const toast = useToast()
const t = useI18n()

const props = withDefaults(
  defineProps<{
    show?: boolean
    loadingState?: boolean
    modelValue?: string
    requestContext: AukRESTRequest | null
  }>(),
  {
    show: false,
    loadingState: false,
    modelValue: "",
  }
)

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
  (e: "update:modelValue", value: string): void
}>()

const editingName = useVModel(props, "modelValue")

const editResponse = () => {
  if (editingName.value.trim() === "") {
    toast.error(t("response.invalid_name"))
    return
  }

  const responses = props.requestContext?.responses || []

  //check if any other response has the same name
  const hasSameNameResponse = Object.keys(responses).some(
    (key) => key === editingName.value
  )

  if (hasSameNameResponse) {
    toast.error(t("request.response_name_exists"))
    return
  }

  emit("submit", editingName.value)
}

const hideModal = () => {
  editingName.value = ""
  emit("hide-modal")
}
</script>
