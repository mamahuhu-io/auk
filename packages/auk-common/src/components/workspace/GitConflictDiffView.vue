<template>
  <div class="flex flex-col gap-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400"
    >
      <IconAlertCircle class="w-5 h-5 shrink-0" />
      <span class="text-sm">{{ error }}</span>
    </div>

    <!-- Diff View -->
    <div v-else-if="conflictContent" class="flex flex-col gap-4">
      <!-- File Header -->
      <div class="flex items-center gap-2 text-sm font-medium text-primaryDark">
        <IconFile class="w-4 h-4 text-secondaryLight" />
        <span class="truncate">{{ file }}</span>
      </div>

      <!-- Side-by-Side View -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Local (Ours) -->
        <div
          class="flex flex-col rounded-lg overflow-hidden border border-dividerLight"
        >
          <div
            class="flex items-center justify-between px-3 py-2 bg-green-500/10 border-b border-dividerLight"
          >
            <span class="text-sm font-medium text-green-500">
              {{ t("workspace.git_local_version") }}
            </span>
            <AukButtonSecondary
              :label="t('workspace.git_use_this')"
              :icon="IconCheck"
              class="!text-green-500"
              @click="emit('resolve', 'ours')"
            />
          </div>
          <div class="overflow-auto max-h-[300px] bg-primaryDark">
            <pre
              class="p-3 text-xs font-mono whitespace-pre-wrap break-words"
              >{{
                conflictContent.ours || t("workspace.git_empty_content")
              }}</pre
            >
          </div>
        </div>

        <!-- Remote (Theirs) -->
        <div
          class="flex flex-col rounded-lg overflow-hidden border border-dividerLight"
        >
          <div
            class="flex items-center justify-between px-3 py-2 bg-blue-500/10 border-b border-dividerLight"
          >
            <span class="text-sm font-medium text-blue-500">
              {{ t("workspace.git_remote_version") }}
            </span>
            <AukButtonSecondary
              :label="t('workspace.git_use_this')"
              :icon="IconCheck"
              class="!text-blue-500"
              @click="emit('resolve', 'theirs')"
            />
          </div>
          <div class="overflow-auto max-h-[300px] bg-primaryDark">
            <pre
              class="p-3 text-xs font-mono whitespace-pre-wrap break-words"
              >{{
                conflictContent.theirs || t("workspace.git_empty_content")
              }}</pre
            >
          </div>
        </div>
      </div>

      <!-- Base Version (if available) -->
      <div
        v-if="conflictContent.base"
        class="flex flex-col rounded-lg overflow-hidden border border-dividerLight"
      >
        <div
          class="flex items-center gap-2 px-3 py-2 bg-primaryLight border-b border-dividerLight cursor-pointer"
          @click="showBase = !showBase"
        >
          <component
            :is="showBase ? IconChevronDown : IconChevronRight"
            class="w-4 h-4 text-secondaryLight"
          />
          <span class="text-sm font-medium text-secondaryLight">
            {{ t("workspace.git_base_version") }}
          </span>
        </div>
        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="showBase"
            class="overflow-auto max-h-[200px] bg-primaryDark"
          >
            <pre
              class="p-3 text-xs font-mono whitespace-pre-wrap break-words"
              >{{ conflictContent.base }}</pre
            >
          </div>
        </transition>
      </div>

      <!-- Help Text -->
      <div
        class="flex items-start gap-2 p-3 rounded-lg bg-primaryLight text-sm text-secondaryLight"
      >
        <IconHelpCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <div class="flex flex-col gap-1">
          <p>{{ t("workspace.git_conflict_help_1") }}</p>
          <p>{{ t("workspace.git_conflict_help_2") }}</p>
        </div>
      </div>
    </div>

    <!-- No Content State -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-8 text-secondaryLight"
    >
      <IconFileDiff class="w-12 h-12 mb-2 opacity-50" />
      <span class="text-sm">{{ t("workspace.git_select_conflict") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitDiff } from "~/composables/useGitDiff"
import IconLoader from "~icons/lucide/loader"
import IconAlertCircle from "~icons/lucide/alert-circle"
import IconFile from "~icons/lucide/file"
import IconCheck from "~icons/lucide/check"
import IconChevronRight from "~icons/lucide/chevron-right"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconFileDiff from "~icons/lucide/file-diff"

const props = defineProps<{
  file: string
}>()

const emit = defineEmits<{
  (e: "resolve", resolution: "ours" | "theirs"): void
}>()

const t = useI18n()
const { conflictContent, isLoading, error, loadConflictContent } = useGitDiff()

const showBase = ref(false)

// Load conflict content when file changes
watch(
  () => props.file,
  async (file) => {
    if (file) {
      showBase.value = false
      await loadConflictContent(file)
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (props.file) {
    await loadConflictContent(props.file)
  }
})
</script>
