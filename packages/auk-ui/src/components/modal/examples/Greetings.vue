<template>
  <AukModal title="Grettings Modal" @close="emit('modal-reject')">
    <template #body>
      <p class="text-secondary">Hello, World!</p>
    </template>
  </AukModal>
</template>

<script setup lang="ts">
import { AukModal } from "./../"

const emit = defineEmits<{
  (e: "modal-reject"): void
}>()
</script>
