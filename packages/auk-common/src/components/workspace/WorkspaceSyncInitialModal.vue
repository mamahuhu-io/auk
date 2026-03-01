<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.sync_center_initial_title')"
    styles="sm:max-w-lg"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div
          class="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <IconAlertTriangle class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div class="text-sm text-amber-400">
            {{ t("workspace.sync_center_initial_warning") }}
          </div>
        </div>
        <p class="text-sm text-secondaryLight">
          {{ t("workspace.sync_center_initial_description") }}
        </p>
        <AukButtonSecondary
          :label="t('workspace.sync_center_view_changes')"
          :disabled="isLoadingDiff"
          @click="openDiffPreview"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <AukButtonSecondary
          :label="t('action.cancel')"
          @click="emit('confirm-cancel')"
        />
        <AukButtonSecondary
          :label="t('workspace.sync_center_initial_compare_action')"
          :disabled="isLoadingDiff"
          @click="openDiffPreview"
        />
        <AukButtonSecondary
          :label="t('workspace.sync_center_initial_use_local')"
          :icon="IconHardDrive"
          @click="confirmAction = 'local'"
        />
        <AukButtonPrimary
          :label="t('workspace.sync_center_initial_use_cloud')"
          :icon="IconCloud"
          @click="confirmAction = 'remote'"
        />
      </div>
    </template>
  </AukSmartModal>

  <AukSmartModal
    v-if="showDiffPreview"
    dialog
    :title="t('workspace.sync_center_initial_compare_title')"
    styles="sm:max-w-3xl"
    @close="showDiffPreview = false"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div
          class="flex items-center justify-between text-xs text-secondaryLight"
        >
          <span>{{
            t("workspace.sync_center_initial_compare_remote", {
              ref: remoteRef,
            })
          }}</span>
          <span>{{ t("workspace.sync_center_initial_compare_local") }}</span>
        </div>

        <div v-if="isLoadingDiff" class="flex items-center justify-center py-8">
          <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
        </div>

        <div
          v-else-if="diffError"
          class="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400"
        >
          <IconAlertTriangle class="w-5 h-5 shrink-0" />
          <span class="text-sm">{{ diffError }}</span>
        </div>

        <div
          v-else-if="!diff || diff.stats.filesChanged === 0"
          class="flex flex-col items-center justify-center py-8 text-secondaryLight"
        >
          <IconFileDiff class="w-12 h-12 mb-2 opacity-50" />
          <span class="text-sm">{{ t("workspace.git_no_changes") }}</span>
        </div>

        <div v-else class="flex flex-col gap-3">
          <div
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

          <div class="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            <div
              v-for="file in diff.files"
              :key="file.path"
              class="flex items-center justify-between p-3 rounded-lg bg-primaryLight"
            >
              <div class="flex items-center gap-2 min-w-0">
                <IconFile class="w-4 h-4 text-secondaryLight shrink-0" />
                <span class="text-sm truncate">{{ file.path }}</span>
              </div>
              <div class="flex items-center gap-3 text-xs shrink-0">
                <span class="text-green-500">+{{ file.additions }}</span>
                <span class="text-red-500">-{{ file.deletions }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <AukButtonSecondary
          :label="t('action.close')"
          @click="showDiffPreview = false"
        />
      </div>
    </template>
  </AukSmartModal>

  <AukSmartConfirmModal
    :show="confirmAction !== null"
    :title="confirmTitle"
    @hide-modal="confirmAction = null"
    @resolve="handleConfirm"
  >
    <template #body>
      <p class="text-secondaryLight">
        {{ confirmMessage }}
      </p>
    </template>
  </AukSmartConfirmModal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useWorkspaceStore } from "~/store/workspace"
import { getGitService } from "~/services/git/tauri-git"
import type { GitDiff } from "~/services/git/types"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconCloud from "~icons/lucide/cloud"
import IconHardDrive from "~icons/lucide/hard-drive"
import IconLoader from "~icons/lucide/loader"
import IconFileDiff from "~icons/lucide/file-diff"
import IconFile from "~icons/lucide/file"
import IconPlus from "~icons/lucide/plus"
import IconMinus from "~icons/lucide/minus"

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "confirm-remote"): void
  (e: "confirm-local"): void
  (e: "confirm-cancel"): void
}>()

const t = useI18n()
const { currentWorkspace } = useWorkspaceStore()
const gitService = getGitService()

const showDiffPreview = ref(false)
const isLoadingDiff = ref(false)
const diffError = ref<string | null>(null)
const diff = ref<GitDiff | null>(null)
const confirmAction = ref<"local" | "remote" | null>(null)

const confirmTitle = computed(() => {
  if (confirmAction.value === "local")
    return t("workspace.sync_center_initial_confirm_local_title")
  if (confirmAction.value === "remote")
    return t("workspace.sync_center_initial_confirm_cloud_title")
  return ""
})

const confirmMessage = computed(() => {
  if (confirmAction.value === "local")
    return t("workspace.sync_center_initial_confirm_local_message")
  if (confirmAction.value === "remote")
    return t("workspace.sync_center_initial_confirm_cloud_message")
  return ""
})

const remoteRef = computed(() => {
  const branch = currentWorkspace.value?.git?.branch || "main"
  return `origin/${branch}`
})

const workspacePath = computed(() => currentWorkspace.value?.path)

async function openDiffPreview() {
  if (!workspacePath.value) return
  showDiffPreview.value = true
  isLoadingDiff.value = true
  diffError.value = null
  try {
    diff.value = await gitService.getDiffBetween(
      workspacePath.value,
      remoteRef.value,
      "HEAD"
    )
  } catch (error) {
    diffError.value =
      error instanceof Error ? error.message : "Failed to load diff"
  } finally {
    isLoadingDiff.value = false
  }
}

function handleConfirm() {
  if (confirmAction.value === "local") {
    confirmAction.value = null
    emit("confirm-local")
    return
  }
  if (confirmAction.value === "remote") {
    confirmAction.value = null
    emit("confirm-remote")
  }
}
</script>
