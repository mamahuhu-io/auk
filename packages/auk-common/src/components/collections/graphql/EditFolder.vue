<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="`${t('folder.edit')}`"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <AukSmartInput
        v-model="name"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="editFolder"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <AukButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="editFolder"
        />
        <AukButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { editGraphqlFolder } from "~/store/collections"
import { handleTokenValidation } from "~/helpers/handleTokenValidation"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  folderPath?: string
  folder: any
  editingFolderName: string
}>()

const emit = defineEmits(["hide-modal"])

const name = ref("")

watch(
  () => props.editingFolderName,
  (val) => {
    name.value = val
  }
)

const editFolder = async () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  editGraphqlFolder(props.folderPath, {
    ...(props.folder as any),
    name: name.value,
  })
  hideModal()
}

const hideModal = () => {
  name.value = ""
  emit("hide-modal")
}
</script>
