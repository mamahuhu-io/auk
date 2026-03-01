<template>
  <AppPaneLayout layout-id="gql-primary">
    <template #primary>
      <GraphqlRequestOptions
        v-model="tab.document.request"
        v-model:response="tab.document.response"
        v-model:option-tab="tab.document.optionTabPreference"
        v-model:inherited-properties="tab.document.inheritedProperties"
        :tab-id="tab.id"
      />
    </template>
    <template #secondary>
      <GraphqlResponse :response="tab.document.response" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { watch } from "vue"
import { isEqualAukGQLRequest } from "~/helpers/graphql"
import { AukGQLDocument } from "~/helpers/graphql/document"
import { AukTab } from "~/services/tab"

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: AukTab<AukGQLDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: AukTab<AukGQLDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

// TODO: Come up with a better dirty check
let oldRequest = cloneDeep(tab.value.document.request)
watch(
  () => tab.value.document.request,
  (updatedValue) => {
    // TODO: Check equality of request
    if (
      !tab.value.document.isDirty &&
      !isEqualAukGQLRequest(oldRequest, updatedValue)
    ) {
      tab.value.document.isDirty = true
    }

    oldRequest = cloneDeep(updatedValue)
  },
  { deep: true }
)
</script>
