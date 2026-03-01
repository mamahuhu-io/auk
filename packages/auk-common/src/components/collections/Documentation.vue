<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('documentation.title')"
    @close="hideModal"
  >
    <template #body>
      <textarea
        v-model="documentation"
        class="w-full h-48 p-3 rounded border border-divider bg-primary text-secondaryDark"
        :placeholder="t('documentation.add_description_placeholder')"
      ></textarea>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <AukButtonPrimary
          :label="t('action.save')"
          outline
          @click="saveDocumentation"
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
import { computed, ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useService } from "dioc/vue"
import { DocumentationService } from "~/services/documentation.service"
import type { AukCollection, AukRESTRequest } from "@auk/data"

const t = useI18n()
const toast = useToast()
const documentationService = useService(DocumentationService)

const props = withDefaults(
  defineProps<{
    show?: boolean
    pathOrID?: string | null
    collection?: AukCollection | null
    collectionID?: string
    folderPath?: string | null
    requestIndex?: number | null
    requestID?: string | null
    request?: AukRESTRequest | null
  }>(),
  {
    show: false,
    pathOrID: null,
    collection: null,
    collectionID: undefined,
    folderPath: null,
    requestIndex: null,
    requestID: null,
    request: null,
  }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const documentation = ref("")

const isRequestDoc = computed(() => !!props.request)

const documentationId = computed(() => {
  if (isRequestDoc.value) {
    return (
      props.requestID ||
      props.request?._ref_id ||
      `${props.folderPath ?? ""}:${props.requestIndex ?? ""}`
    )
  }
  return props.collection?._ref_id || props.pathOrID || "collection"
})

const loadDocumentation = () => {
  const type = isRequestDoc.value ? "request" : "collection"
  const doc = documentationService.getDocumentation(type, documentationId.value)
  documentation.value = doc ?? ""
}

watch(
  () => [
    props.show,
    props.collection,
    props.request,
    props.pathOrID,
    props.folderPath,
    props.requestIndex,
    props.requestID,
  ],
  () => {
    if (props.show) loadDocumentation()
  },
  { immediate: true }
)

const saveDocumentation = () => {
  if (isRequestDoc.value && props.request) {
    documentationService.setRequestDocumentation(
      documentationId.value,
      documentation.value,
      {
        parentCollectionID: props.pathOrID ?? "",
        folderPath: props.folderPath ?? "",
        requestIndex: props.requestIndex ?? undefined,
        requestData: props.request,
      }
    )
  } else if (props.collection) {
    documentationService.setCollectionDocumentation(
      documentationId.value,
      documentation.value,
      {
        pathOrID: props.pathOrID ?? props.collection._ref_id ?? "",
        collectionData: props.collection,
      }
    )
  } else {
    toast.error(t("error.something_went_wrong"))
    return
  }

  toast.success(t("state.saved"))
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
