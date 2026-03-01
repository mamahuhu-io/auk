<template>
  <AukSmartModal
    v-if="showConflictModal"
    dialog
    :title="t('workspace.git_resolve_conflicts')"
    styles="sm:max-w-[90vw] sm:h-[85vh] p-0 overflow-hidden flex flex-col !bg-primary git-conflict-modal mx-auto"
    full-width
    :full-width-body="true"
    @close="closeConflictModal"
  >
    <template #body>
      <div class="flex flex-col h-full bg-primary w-full">
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-dividerLight shrink-0 bg-primary z-20"
        >
          <div class="flex items-center gap-4 min-w-0">
            <div class="flex flex-col">
              <span class="text-base font-bold text-secondaryDark">
                {{ t("workspace.git_resolve_conflicts") }}
              </span>
              <span
                v-if="conflicts.length > 0"
                class="text-xs text-secondaryLight flex items-center gap-1"
              >
                <span class="font-mono text-secondaryDark">{{
                  conflicts.length
                }}</span>
                {{ t("workspace.git_history_conflicts") }}
              </span>
              <span v-else class="text-xs text-green-500 font-medium">
                {{ t("action.done") }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div
              v-if="conflicts.length > 0"
              class="flex items-center bg-primaryLight rounded p-0.5 border border-dividerLight"
            >
              <button
                v-tippy="{ content: 'Previous conflict' }"
                class="p-1 rounded hover:bg-primaryDark hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-secondary"
                :disabled="currentIndex <= 0"
                @click="prevFile"
              >
                <IconChevronLeft class="w-4 h-4" />
              </button>
              <span
                class="text-xs font-mono px-2 text-secondaryDark min-w-[3rem] text-center"
              >
                {{ currentIndex + 1 }} / {{ conflicts.length }}
              </span>
              <button
                v-tippy="{ content: 'Next conflict' }"
                class="p-1 rounded hover:bg-primaryDark hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-secondary"
                :disabled="currentIndex >= conflicts.length - 1"
                @click="nextFile"
              >
                <IconChevronRight class="w-4 h-4" />
              </button>
            </div>

            <div class="h-6 w-px bg-dividerLight mx-1"></div>

            <!-- More Actions -->
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions.focus()"
            >
              <AukButtonSecondary
                :icon="IconMoreVertical"
                outline
                class="!border-none !px-2 hover:bg-primaryLight"
              />
              <template #content>
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none min-w-[200px]"
                  role="menu"
                >
                  <AukSmartItem
                    :icon="IconCopy"
                    :label="t('workspace.git_use_all_ours')"
                    @click="applyAllPreset('ours')"
                  />
                  <AukSmartItem
                    :icon="IconCopy"
                    :label="t('workspace.git_use_all_theirs')"
                    @click="applyAllPreset('theirs')"
                  />
                  <hr class="border-dividerLight my-1" />
                  <AukSmartItem
                    :icon="IconX"
                    :label="t('workspace.git_abort_sync')"
                    class="text-red-500 hover:bg-red-500/10"
                    @click="handleAbortSync"
                  />
                </div>
              </template>
            </tippy>

            <!-- Main Action -->
            <AukButtonPrimary
              :label="t('workspace.git_resolve_conflicts')"
              :icon="IconCheck"
              :disabled="!selectedFile || isSaving"
              class="min-w-[120px]"
              @click="handleSave()"
            />
          </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 min-h-0">
          <!-- Sidebar -->
          <div
            class="w-64 border-r border-dividerLight bg-primaryLight/20 flex flex-col shrink-0 overflow-y-auto"
          >
            <div
              v-for="file in conflicts"
              :key="file"
              class="group flex flex-col px-4 py-3 cursor-pointer border-l-[3px] transition-all"
              :class="
                selectedFile === file
                  ? 'bg-primary border-accent'
                  : 'border-transparent hover:bg-primaryLight/50 hover:border-dividerDark'
              "
              @click="selectFile(file)"
            >
              <div class="flex items-center gap-2 mb-1">
                <IconFile
                  class="w-4 h-4 shrink-0"
                  :class="
                    selectedFile === file
                      ? 'text-accent'
                      : 'text-secondaryLight'
                  "
                />
                <span
                  class="text-sm truncate font-medium"
                  :class="
                    selectedFile === file
                      ? 'text-secondaryDark'
                      : 'text-secondary'
                  "
                  >{{ file }}</span
                >
              </div>

              <!-- Stats -->
              <div
                v-if="conflictStats[file]"
                class="text-[10px] flex gap-3 pl-6 opacity-70 group-hover:opacity-100"
              >
                <span
                  class="text-green-500 font-medium flex items-center gap-0.5"
                >
                  <IconPlus class="w-3 h-3" />
                  {{ conflictStats[file].additions }}
                </span>
                <span
                  class="text-red-500 font-medium flex items-center gap-0.5"
                >
                  <IconMinus class="w-3 h-3" />
                  {{ conflictStats[file].deletions }}
                </span>
              </div>
            </div>
          </div>

          <!-- Editor Area -->
          <div class="flex-1 flex flex-col min-w-0 bg-primary">
            <div
              v-if="selectedFile"
              class="flex-1 min-h-0 flex flex-col relative p-4 gap-4"
            >
              <!-- Toolbar for current file -->
              <div
                class="flex items-center justify-between shrink-0 bg-primaryLight/30 p-2 rounded-lg border border-dividerLight"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <IconFileDiff class="w-4 h-4 text-secondaryLight shrink-0" />
                  <span class="font-mono text-sm text-secondaryDark truncate">{{
                    selectedFile
                  }}</span>
                </div>
                <div class="flex gap-2 shrink-0">
                  <AukButtonSecondary
                    :label="t('workspace.git_use_ours')"
                    class="!h-8 !text-xs"
                    :icon="IconCheck"
                    outline
                    filled
                    @click="applyPreset('ours')"
                  />
                  <AukButtonSecondary
                    :label="t('workspace.git_use_theirs')"
                    class="!h-8 !text-xs"
                    :icon="IconCheck"
                    outline
                    filled
                    @click="applyPreset('theirs')"
                  />
                  <AukButtonSecondary
                    :icon="IconEye"
                    :label="t('workspace.sync_center_view_changes')"
                    class="!h-8 !text-xs"
                    outline
                    @click="openDiffModal"
                  />
                </div>
              </div>

              <div
                class="flex-1 min-h-0 overflow-hidden relative rounded-lg border border-dividerLight shadow-sm"
              >
                <GitConflictMergeView
                  ref="mergeViewRef"
                  :file="selectedFile"
                  :conflict-content="conflictContent"
                  :is-loading="isLoading"
                  :error="error"
                  :is-saving="isSaving"
                  class="h-full"
                />
              </div>
            </div>
            <div
              v-else
              class="flex-1 flex flex-col items-center justify-center text-secondaryLight bg-primaryLight/10"
            >
              <IconCheckCircle class="w-16 h-16 opacity-10 mb-4" />
              <p class="text-lg font-medium opacity-50">
                {{ t("workspace.git_select_conflict") }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AukSmartModal>

  <GitDiffModal
    :show="showDiffModal"
    :file="selectedFile"
    @close="showDiffModal = false"
  />
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitStatus } from "~/composables/useGitStatus"
import { useGitDiff } from "~/composables/useGitDiff"
import { getGitService } from "~/services/git/tauri-git"
import GitConflictMergeView from "./GitConflictMergeView.vue"
import GitDiffModal from "./GitDiffModal.vue"
import { AukSmartItem } from "@auk/ui"

// Icons
import IconCheck from "~icons/lucide/check"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFile from "~icons/lucide/file"
import IconFileDiff from "~icons/lucide/file-diff"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconCopy from "~icons/lucide/copy"
import IconX from "~icons/lucide/x"
import IconChevronLeft from "~icons/lucide/chevron-left"
import IconChevronRight from "~icons/lucide/chevron-right"
import IconPlus from "~icons/lucide/plus"
import IconMinus from "~icons/lucide/minus"
import IconEye from "~icons/lucide/eye"

const t = useI18n()
const {
  conflicts,
  showConflictModal,
  closeConflictModal,
  resolveConflictWithContentAndContinue,
  abortRebase,
  currentWorkspace,
} = useGitStatus()

const { conflictContent, isLoading, error, loadConflictContent } = useGitDiff()

const selectedFile = ref("")
const isSaving = ref(false)
const mergeViewRef = ref<InstanceType<typeof GitConflictMergeView> | null>(null)
const conflictStats = ref<
  Record<string, { additions: number; deletions: number }>
>({})
const showDiffModal = ref(false)
const tippyActions = ref<HTMLElement | null>(null)

const currentIndex = computed(() => conflicts.value.indexOf(selectedFile.value))

const selectFile = (file: string) => {
  selectedFile.value = file
}

const prevFile = () => {
  if (currentIndex.value > 0)
    selectFile(conflicts.value[currentIndex.value - 1])
}

const nextFile = () => {
  if (currentIndex.value < conflicts.value.length - 1)
    selectFile(conflicts.value[currentIndex.value + 1])
}

watch(
  () => conflicts.value,
  (files) => {
    if (!files.length) {
      selectedFile.value = ""
      // Optional: Auto close if empty?
      // closeConflictModal() // Maybe let the user see "All done" and close manually or auto close.
      // Existing logic closed it automatically in `resolveConflictAndContinue`.
      return
    }
    // If selected file is not in list (e.g. resolved), pick the first one
    if (!selectedFile.value || !files.includes(selectedFile.value)) {
      selectedFile.value = files[0]
    }
    loadConflictStats(files)
  },
  { immediate: true }
)

watch(
  () => selectedFile.value,
  async (file) => {
    if (file) {
      await loadConflictContent(file)
    }
  },
  { immediate: true }
)

const handleSave = async (content?: string) => {
  if (!selectedFile.value) return
  isSaving.value = true
  const resolvedContent = content ?? mergeViewRef.value?.getContent() ?? ""
  await resolveConflictWithContentAndContinue(
    selectedFile.value,
    resolvedContent
  )
  isSaving.value = false
}

const applyPreset = (preset: "ours" | "theirs") => {
  if (!conflictContent.value || !mergeViewRef.value) return
  const content =
    preset === "ours"
      ? conflictContent.value.ours
      : conflictContent.value.theirs
  mergeViewRef.value.setEditorContent(content ?? "")
}

const applyAllPreset = async (preset: "ours" | "theirs") => {
  if (!conflicts.value.length) return
  isSaving.value = true
  const files = [...conflicts.value]
  const gitService = getGitService()

  try {
    for (const file of files) {
      if (!currentWorkspace.value) break
      const content = await gitService.getConflictContent(
        currentWorkspace.value.path,
        file
      )
      const resolved =
        preset === "ours" ? (content.ours ?? "") : (content.theirs ?? "")
      await resolveConflictWithContentAndContinue(file, resolved)
    }
  } finally {
    isSaving.value = false
  }
}

function openDiffModal() {
  if (!selectedFile.value) return
  showDiffModal.value = true
}

const handleAbortSync = async () => {
  if (confirm(t("workspace.git_abort_sync") + "?")) {
    await abortRebase()
    closeConflictModal()
  }
}

async function loadConflictStats(files: string[]) {
  if (!files.length) {
    conflictStats.value = {}
    return
  }
  if (!currentWorkspace.value) return
  const gitService = getGitService()
  const stats: Record<string, { additions: number; deletions: number }> = {}

  // Load in chunks or parallel but handle errors gracefully
  await Promise.all(
    files.map(async (file) => {
      try {
        const diff = await gitService.getFileDiff(
          currentWorkspace.value!.path,
          file,
          false
        )
        stats[file] = {
          additions: diff.additions,
          deletions: diff.deletions,
        }
      } catch {
        stats[file] = { additions: 0, deletions: 0 }
      }
    })
  )
  conflictStats.value = stats
}
</script>

<style scoped>
/* Ensure modal body takes full height and overrides default max-height */
:deep(.git-conflict-modal [class*="max-h-"]) {
  max-height: none !important;
  height: 100% !important;
  display: flex;
  flex-direction: column;
}

/* Fallback if the class isn't exactly as expected */
:deep(.auk-smart-modal-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
