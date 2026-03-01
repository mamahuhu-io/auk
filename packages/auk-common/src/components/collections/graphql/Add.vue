<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="`${t('collection.new')}`"
    @close="hideModal"
  >
    <template #body>
      <AukSmartInput
        v-model="name"
        placeholder=" "
        input-styles="floating-input"
        :label="t('action.label')"
        @submit="addNewCollection"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <AukButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="addNewCollection"
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
import { ref } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { makeCollection } from "@auk/data"
import { addGraphqlCollection } from "~/store/collections"
import { platform } from "~/platform"

const t = useI18n()
const toast = useToast()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref<string | null>(null)

const addNewCollection = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  addGraphqlCollection(
    makeCollection({
      name: name.value,
      folders: [],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      variables: [],
    })
  )

  hideModal()

  platform.analytics?.logEvent({
    type: "AUK_CREATE_COLLECTION",
    isRootCollection: true,
    platform: "gql",
    workspaceType: "personal",
  })
}

const hideModal = () => {
  name.value = null
  emit("hide-modal")
}
</script>
