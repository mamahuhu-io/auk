<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="modalTitle"
    styles="sm:max-w-3xl"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
        </div>

        <!-- Error State -->
        <div
          v-else-if="error"
          class="flex flex-col items-center justify-center py-8 text-red-400"
        >
          <IconAlertCircle class="w-12 h-12 mb-2 opacity-50" />
          <span class="text-sm">{{ error }}</span>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!fileDiff && (!diff || diff.files.length === 0)"
          class="flex flex-col items-center justify-center py-8 text-secondaryLight"
        >
          <IconFileDiff class="w-12 h-12 mb-2 opacity-50" />
          <span class="text-sm">{{ t("workspace.git_no_changes") }}</span>
        </div>

        <!-- Stats Summary (for multiple files) -->
        <div
          v-else-if="diff && !fileDiff"
          class="flex items-center gap-4 p-3 rounded-lg bg-primaryLight text-sm"
        >
          <span class="flex items-center gap-1">
            <IconFile class="w-4 h-4 text-secondaryLight" />
            {{ diff.stats.filesChanged }}
            {{ t("workspace.git_files_changed") }}
          </span>
          <span class="flex items-center gap-1 text-green-500">
            <IconPlus class="w-4 h-4" />
            {{ diff.stats.additions }}
          </span>
          <span class="flex items-center gap-1 text-red-500">
            <IconMinus class="w-4 h-4" />
            {{ diff.stats.deletions }}
          </span>
        </div>

        <!-- File List (when no specific file selected) -->
        <div
          v-if="diff && !fileDiff"
          class="flex flex-col gap-2 max-h-[400px] overflow-y-auto"
        >
          <div
            v-for="fileItem in diff.files"
            :key="fileItem.path"
            class="flex items-center justify-between p-3 rounded-lg bg-primaryLight hover:bg-primaryDark transition-colors cursor-pointer"
            @click="handleFileClick(fileItem.path)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <IconFile class="w-4 h-4 text-secondaryLight shrink-0" />
              <span class="text-sm truncate">{{ fileItem.path }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs shrink-0">
              <span class="text-green-500">+{{ fileItem.additions }}</span>
              <span class="text-red-500">-{{ fileItem.deletions }}</span>
              <IconChevronRight class="w-4 h-4 text-secondaryLight" />
            </div>
          </div>
        </div>

        <!-- Single File Diff View -->
        <div v-if="fileDiff" class="flex flex-col gap-3">
          <!-- File Header -->
          <div
            class="flex items-center justify-between p-2 rounded-lg bg-primaryLight"
          >
            <div class="flex items-center gap-2 min-w-0">
              <AukButtonSecondary
                v-if="diff"
                :icon="IconArrowLeft"
                @click.stop="fileDiff = null"
              />
              <IconFile class="w-4 h-4 text-secondaryLight" />
              <span class="text-sm font-medium truncate">{{
                fileDiff.path
              }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="text-green-500">+{{ fileDiff.additions }}</span>
              <span class="text-red-500">-{{ fileDiff.deletions }}</span>
            </div>
          </div>

          <!-- Diff Content -->
          <div class="overflow-auto max-h-[400px] rounded-lg bg-primaryDark">
            <div
              v-for="(hunk, hunkIndex) in fileDiff.hunks"
              :key="hunkIndex"
              class="border-b border-dividerDark last:border-b-0"
            >
              <!-- Hunk Header -->
              <div
                class="px-3 py-1 text-xs text-secondaryLight bg-primaryLight font-mono"
              >
                {{ hunk.header }}
              </div>

              <!-- Diff Lines -->
              <div class="font-mono text-xs">
                <div
                  v-for="(line, lineIndex) in hunk.lines"
                  :key="lineIndex"
                  class="flex"
                  :class="getLineClass(line.type)"
                >
                  <span
                    class="w-12 px-2 py-0.5 text-right text-secondaryDark select-none border-r border-dividerDark"
                  >
                    {{ line.oldLineNumber || "" }}
                  </span>
                  <span
                    class="w-12 px-2 py-0.5 text-right text-secondaryDark select-none border-r border-dividerDark"
                  >
                    {{ line.newLineNumber || "" }}
                  </span>
                  <span class="flex-1 px-2 py-0.5 whitespace-pre">
                    <span class="select-none mr-1">{{
                      getLinePrefix(line.type)
                    }}</span>
                    {{ line.content }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <AukButtonSecondary :label="t('action.close')" @click="emit('close')" />
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitDiff } from "~/composables/useGitDiff"
import type { GitCommit, GitDiffFile } from "~/services/git/types"
import IconLoader from "~icons/lucide/loader"
import IconAlertCircle from "~icons/lucide/alert-circle"
import IconFileDiff from "~icons/lucide/file-diff"
import IconFile from "~icons/lucide/file"
import IconPlus from "~icons/lucide/plus"
import IconMinus from "~icons/lucide/minus"
import IconChevronRight from "~icons/lucide/chevron-right"
import IconArrowLeft from "~icons/lucide/arrow-left"

const props = defineProps<{
  show: boolean
  commit?: GitCommit
  file?: string
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()
const {
  diff,
  fileDiff: fileDiffState,
  isLoading,
  error,
  loadDiff,
  loadFileDiff,
  clearDiff,
} = useGitDiff()

const fileDiff = ref<GitDiffFile | null>(null)

const modalTitle = computed(() => {
  if (props.commit) {
    return `${t("workspace.git_diff")}: ${props.commit.shortHash}`
  }
  if (props.file) {
    return `${t("workspace.git_diff")}: ${props.file}`
  }
  return t("workspace.git_changes")
})

// Load diff when modal opens
watch(
  () => props.show,
  async (show) => {
    if (show) {
      fileDiff.value = null
      if (props.file) {
        await loadFileDiff(props.file, false, props.commit?.hash)
        fileDiff.value = fileDiffState.value
      } else {
        await loadDiff(props.commit?.hash)
      }
    } else {
      clearDiff()
    }
  }
)

onMounted(async () => {
  if (props.show) {
    if (props.file) {
      await loadFileDiff(props.file, false, props.commit?.hash)
      fileDiff.value = fileDiffState.value
    } else {
      await loadDiff(props.commit?.hash)
    }
  }
})

async function handleFileClick(path: string) {
  await loadFileDiff(path, false, props.commit?.hash)
  fileDiff.value = fileDiffState.value
}

function getLineClass(type: string): string {
  switch (type) {
    case "add":
      return "bg-green-500/10"
    case "delete":
      return "bg-red-500/10"
    default:
      return ""
  }
}

function getLinePrefix(type: string): string {
  switch (type) {
    case "add":
      return "+"
    case "delete":
      return "-"
    default:
      return " "
  }
}
</script>
