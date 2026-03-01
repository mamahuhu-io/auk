<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <HttpRequest v-model="tab" />
      <HttpRequestOptions
        v-model="tab.document.request"
        v-model:option-tab="tab.document.optionTabPreference!"
        v-model:inherited-properties="tab.document.inheritedProperties"
      />
    </template>
    <template #secondary>
      <HttpResponse
        v-model:document="tab.document"
        :tab-id="tab.id"
        :is-embed="false"
      />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { watch } from "vue"
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { isEqualAukRESTRequest } from "@auk/data"
import { AukTab } from "~/services/tab"
import { AukRequestDocument } from "~/helpers/rest/document"

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: AukTab<AukRequestDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: AukTab<AukRequestDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

// TODO: Come up with a better dirty check
let oldRequest = cloneDeep(tab.value.document.request)
watch(
  () => tab.value.document.request,
  (updatedValue) => {
    if (
      !tab.value.document.isDirty &&
      !isEqualAukRESTRequest(oldRequest, updatedValue)
    ) {
      tab.value.document.isDirty = true
    }

    oldRequest = cloneDeep(updatedValue)
  },
  { deep: true }
)
</script>
