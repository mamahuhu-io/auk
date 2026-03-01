<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <AukSmartInput
        v-model="branchName"
        :placeholder="t('workspace.git_new_branch_name')"
        class="flex-1"
        @keyup.enter="handleCreate"
      />
      <AukButtonPrimary
        :label="t('workspace.git_create_branch')"
        :icon="IconPlus"
        :loading="isCreating"
        :disabled="!isValid"
        @click="handleCreate"
      />
    </div>

    <!-- Validation Error -->
    <p v-if="validationError" class="text-xs text-red-400">
      {{ validationError }}
    </p>

    <!-- Help Text -->
    <p class="text-xs text-secondaryLight">
      {{ t("workspace.git_branch_name_hint") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "~/composables/i18n"
import IconPlus from "~icons/lucide/plus"

defineProps<{
  isCreating: boolean
}>()

const emit = defineEmits<{
  (e: "create", name: string): void
}>()

const t = useI18n()
const branchName = ref("")

// Branch name validation
const validationError = computed(() => {
  const name = branchName.value.trim()
  if (!name) return null

  // Check for invalid characters
  if (/\s/.test(name)) {
    return t("workspace.git_branch_no_spaces")
  }
  if (/^[-.]/.test(name) || /[-.]$/.test(name)) {
    return t("workspace.git_branch_invalid_start_end")
  }
  if (/\.\./.test(name)) {
    return t("workspace.git_branch_no_double_dots")
  }
  if (/[~^:?*\[\]\\]/.test(name)) {
    return t("workspace.git_branch_invalid_chars")
  }

  return null
})

const isValid = computed(() => {
  return branchName.value.trim().length > 0 && !validationError.value
})

function handleCreate() {
  if (!isValid.value) return

  emit("create", branchName.value.trim())
  branchName.value = ""
}
</script>
