<template>
  <AukModal
    :title="title ?? 'Dialog with Input field'"
    @close="emit('modal-reject')"
  >
    <template #body>
      <AukSmartInput
        type="text"
        placeholder="Enter some text..."
        v-model="text"
        @submit="emit('modal-resolve', { text })"
      />
    </template>
    <template #footer>
      <AukButtonPrimary
        label="Submit"
        @click="emit('modal-resolve', { text })"
      />
      <AukButtonSecondary
        filled
        label="Cancel"
        @click="emit('modal-reject')"
      />
    </template>
  </AukModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { AukModal } from "./../"
import {
  AukSmartInput,
  AukButtonSecondary,
  AukButtonPrimary,
} from "./../../index"

const text = ref<string>("")

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  (e: "modal-reject"): void
  (e: "modal-resolve", value: { text: string }): void
}>()
</script>
