<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('request.new')"
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
          @submit="addRequest"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div class="flex space-x-2">
          <AukButtonPrimary
            :label="t('action.save')"
            :loading="loadingState"
            outline
            @click="addRequest"
          />
          <AukButtonSecondary
            :label="t('action.cancel')"
            outline
            filled
            @click="hideModal"
          />
        </div>
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { ref } from "vue"

const toast = useToast()
const t = useI18n()

const props = withDefaults(
  defineProps<{
    show?: boolean
    loadingState?: boolean
  }>(),
  {
    show: false,
    loadingState: false,
  }
)

const emit = defineEmits<{
  (event: "hide-modal"): void
  (event: "add-request", name: string): void
}>()

const editingName = ref("")

const addRequest = () => {
  if (props.loadingState) {
    return
  }

  if (editingName.value.trim() === "") {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }

  emit("add-request", editingName.value)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
