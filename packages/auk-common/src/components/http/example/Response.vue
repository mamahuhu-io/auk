<template>
  <HttpExampleResponseMeta v-model:response="doc.response" />
  <HttpExampleLenseBodyRenderer v-model:document="doc" />
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import {
  AukRequestDocument,
  AukSavedExampleDocument,
} from "~/helpers/rest/document"

const props = defineProps<{
  document: AukSavedExampleDocument
  isEmbed: boolean
}>()

const emit = defineEmits<{
  (e: "update:tab", val: AukRequestDocument): void
}>()

const doc = useVModel(props, "document", emit)
</script>
