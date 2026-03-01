<template>
  <AukModal title="Dialog with Input field" @close="emit('modal-reject')">
    <template #body>
      <div>
        <AukButtonSecondary
          label="Open Nested Dialog with Input"
          @click="openNestedInputDialog"
        />

        <AukSmartInput
          type="text"
          placeholder="Enter some text..."
          v-model="text"
          @submit="emit('modal-resolve', { text })"
        />
      </div>
    </template>
    <template #footer>
      <AukButtonPrimary
        label="Submit from Parent"
        @click="emit('modal-resolve', { text })"
      />
      <AukButtonSecondary label="Cancel" @click="emit('modal-reject')" />
    </template>
  </AukModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { AukModal } from "./../"
import {
  AukButtonPrimary,
  AukButtonSecondary,
  AukSmartInput,
} from "./../../index"

import { useModals } from "vue-promise-modals"
import { InputDialog } from "./"

const { openModal } = useModals()

const text = ref<string>("")

async function openNestedInputDialog() {
  try {
    const result = await openModal(InputDialog, {
      title: "Nested Input Dialog",
    })

    console.log("Nested Dialog Result:", result)
    text.value = result.text
  } catch (e) {
    // The error value will be the same value as emitted through the `modal-reject` event
    console.log("Modal Rejected:", e)
  }
}

const emit = defineEmits<{
  (e: "modal-reject"): void
  (e: "modal-resolve", value: { text: string }): void
}>()
</script>
