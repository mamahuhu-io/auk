<template>
  <div class="relative flex flex-1 flex-col overflow-auto">
    <HttpResponseMeta
      :response="doc.response"
      :is-embed="isEmbed"
      :is-loading="loading"
    />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      v-model:document="doc"
      :is-editable="false"
      :tab-id="tabId"
      @save-as-example="saveAsExample"
    />
  </div>
  <HttpSaveResponseName
    v-model:response-name="responseName"
    :has-same-name-response="hasSameNameResponse"
    :show="showSaveResponseName"
    @submit="onSaveAsExample"
    @hide-modal="showSaveResponseName = false"
  />
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed, ref } from "vue"
import { AukRequestDocument } from "~/helpers/rest/document"
import { useResponseBody } from "@composables/lens-actions"
import { getStatusCodeReasonPhrase } from "~/helpers/utils/statusCodes"
import {
  AukRESTRequestResponse,
  AukRESTResponseOriginalRequest,
  makeAukRESTResponseOriginalRequest,
} from "@auk/data"
import { editRESTRequest } from "~/store/collections"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  document: AukRequestDocument
  tabId: string
  isEmbed: boolean
}>()

const emit = defineEmits<{
  (e: "update:tab", val: AukRequestDocument): void
}>()

const doc = useVModel(props, "document", emit)

const hasResponse = computed(
  () =>
    doc.value.response?.type === "success" ||
    doc.value.response?.type === "fail"
)

const responseName = ref("")
const showSaveResponseName = ref(false)

const hasSameNameResponse = computed(() => {
  return responseName.value
    ? responseName.value in doc.value.request.responses
    : false
})

const loading = computed(
  // Check both response type AND testResults to ensure we stay in loading state
  // during test execution (when testResults is null)
  () => doc.value.response?.type === "loading" || doc.value.testResults === null
)

const saveAsExample = () => {
  showSaveResponseName.value = true
  responseName.value = doc.value.request.name
}

const onSaveAsExample = () => {
  const response = doc.value.response

  if (response && response.type === "success") {
    const { responseBodyText } = useResponseBody(response)

    const statusText = getStatusCodeReasonPhrase(
      response.statusCode,
      response.statusText
    )

    const {
      method,
      endpoint,
      headers,
      body,
      auth,
      params,
      name,
      requestVariables,
    } = response.req

    const originalRequest: AukRESTResponseOriginalRequest =
      makeAukRESTResponseOriginalRequest({
        method,
        endpoint,
        headers,
        body,
        auth,
        params,
        name,
        requestVariables,
      })

    const resName = responseName.value.trim()

    const responseObj: AukRESTRequestResponse = {
      status: statusText,
      code: response.statusCode,
      headers: response.headers,
      body: responseBodyText.value,
      name: resName,
      originalRequest,
    }

    doc.value.request.responses = {
      ...doc.value.request.responses,
      [resName]: responseObj,
    }

    showSaveResponseName.value = false

    const saveCtx = doc.value.saveContext
    if (!saveCtx) return

    const req = doc.value.request

    if (saveCtx.originLocation === "user-collection") {
      try {
        editRESTRequest(saveCtx.folderPath, saveCtx.requestIndex, req)
        toast.success(`${t("response.saved")}`)
        responseName.value = ""
      } catch (e) {
        console.error(e)
        responseName.value = ""
      }
    } else {
      // Team collections not supported in local mode
      toast.error(`${t("error.no_permission")}`)
      responseName.value = ""
    }
  }
}
</script>
