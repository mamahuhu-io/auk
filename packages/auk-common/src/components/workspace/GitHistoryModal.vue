<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.git_sync_history')"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Stats Summary -->
        <div
          class="grid grid-cols-3 gap-3 p-3 rounded-lg bg-primaryLight text-sm"
        >
          <div class="flex flex-col items-center">
            <span class="text-lg font-semibold text-green-500">
              {{ syncStats.successfulSyncs }}
            </span>
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.git_history_success") }}
            </span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-lg font-semibold text-red-500">
              {{ syncStats.failedSyncs }}
            </span>
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.git_history_failed") }}
            </span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-lg font-semibold text-amber-500">
              {{ syncStats.totalConflicts }}
            </span>
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.git_history_conflicts") }}
            </span>
          </div>
        </div>

        <!-- History List -->
        <div class="flex flex-col max-h-[400px] overflow-y-auto">
          <div
            v-if="isLoadingHistory"
            class="flex items-center justify-center py-8"
          >
            <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
          </div>

          <div
            v-else-if="syncHistory.length === 0"
            class="flex flex-col items-center justify-center py-8 text-secondaryLight"
          >
            <IconHistory class="w-12 h-12 mb-2 opacity-50" />
            <span class="text-sm">{{ t("workspace.git_history_empty") }}</span>
          </div>

          <div v-else class="flex flex-col gap-2">
            <div
              v-for="entry in syncHistory"
              :key="entry.id"
              class="flex items-center gap-3 p-3 rounded-lg bg-primaryLight hover:bg-primaryDark transition-colors"
            >
              <!-- Status Icon -->
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                :class="getStatusClass(entry.result)"
              >
                <component :is="getStatusIcon(entry.result)" class="w-4 h-4" />
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium capitalize">
                    {{ entry.operation }}
                  </span>
                  <span
                    class="px-1.5 py-0.5 text-xs rounded"
                    :class="getResultBadgeClass(entry.result)"
                  >
                    {{ t(`workspace.git_result_${entry.result}`) }}
                  </span>
                </div>
                <div
                  class="flex items-center gap-3 mt-1 text-xs text-secondaryLight"
                >
                  <span v-if="entry.pulled > 0" class="flex items-center gap-1">
                    <IconArrowDown class="w-3 h-3" />
                    {{ entry.pulled }}
                  </span>
                  <span v-if="entry.pushed > 0" class="flex items-center gap-1">
                    <IconArrowUp class="w-3 h-3" />
                    {{ entry.pushed }}
                  </span>
                  <span
                    v-if="entry.conflicts.length > 0"
                    class="flex items-center gap-1 text-amber-500"
                  >
                    <IconAlertTriangle class="w-3 h-3" />
                    {{ entry.conflicts.length }}
                  </span>
                </div>
                <div
                  v-if="entry.error"
                  class="mt-1 text-xs text-red-400 truncate"
                >
                  {{ entry.error }}
                </div>
              </div>

              <!-- Time -->
              <div class="text-xs text-secondaryLight shrink-0">
                {{ formatTime(entry.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <AukButtonSecondary
          v-if="syncHistory.length > 0"
          :label="t('workspace.git_history_clear')"
          :icon="IconTrash"
          @click="handleClearHistory"
        />
        <div class="flex-1" />
        <AukButtonSecondary :label="t('action.close')" @click="emit('close')" />
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitHistory } from "~/composables/useGitHistory"
import IconLoader from "~icons/lucide/loader"
import IconHistory from "~icons/lucide/history"
import IconCheck from "~icons/lucide/check"
import IconX from "~icons/lucide/x"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconArrowDown from "~icons/lucide/arrow-down"
import IconArrowUp from "~icons/lucide/arrow-up"
import IconTrash from "~icons/lucide/trash-2"

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()
const {
  syncHistory,
  syncStats,
  isLoadingHistory,
  loadSyncHistory,
  clearHistory,
} = useGitHistory()

// Load history when modal opens
watch(
  () => props.show,
  (show) => {
    if (show) {
      loadSyncHistory()
    }
  }
)

onMounted(() => {
  if (props.show) {
    loadSyncHistory()
  }
})

function getStatusIcon(result: string) {
  switch (result) {
    case "success":
      return IconCheck
    case "failed":
      return IconX
    case "conflicts":
      return IconAlertTriangle
    default:
      return IconHistory
  }
}

function getStatusClass(result: string): string {
  switch (result) {
    case "success":
      return "bg-green-500/20 text-green-500"
    case "failed":
      return "bg-red-500/20 text-red-500"
    case "conflicts":
      return "bg-amber-500/20 text-amber-500"
    default:
      return "bg-gray-500/20 text-gray-500"
  }
}

function getResultBadgeClass(result: string): string {
  switch (result) {
    case "success":
      return "bg-green-500/20 text-green-400"
    case "failed":
      return "bg-red-500/20 text-red-400"
    case "conflicts":
      return "bg-amber-500/20 text-amber-400"
    default:
      return "bg-gray-500/20 text-gray-400"
  }
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return t("workspace.git_just_now")
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return date.toLocaleDateString()
}

function handleClearHistory() {
  clearHistory()
}
</script>
