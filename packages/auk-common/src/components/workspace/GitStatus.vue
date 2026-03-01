<template>
  <div v-if="isGitEnabled" class="flex items-center gap-2">
    <!-- Git Branch Badge (Clickable) -->
    <div
      v-tippy="{ theme: 'tooltip' }"
      :title="statusTooltip"
      class="flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer hover:opacity-80 transition-opacity"
      :class="statusClass"
      @click="openBranchModal"
    >
      <component :is="statusIcon" class="w-3.5 h-3.5" />
      <span v-if="showBranch" class="truncate max-w-[80px]">{{ branch }}</span>
      <IconChevronDown class="w-3 h-3 opacity-60" />
    </div>

    <!-- Sync Button -->
    <AukButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="syncButtonTitle"
      :icon="isSyncing ? IconLoader : IconRefreshCw"
      :class="{ 'animate-spin': isSyncing }"
      :disabled="isSyncing"
      class="!p-1"
      @click="handleSync"
    />

    <!-- History Button -->
    <AukButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="t('workspace.git_sync_history')"
      :icon="IconHistory"
      class="!p-1"
      @click="openHistoryModal"
    />

    <!-- Commit Log Button -->
    <AukButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="t('workspace.git_commit_log')"
      :icon="IconGitCommit"
      class="!p-1"
      @click="openCommitLogModal"
    />

    <!-- OAuth Accounts Button -->
    <AukButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="t('workspace.git_oauth_accounts')"
      :icon="IconShield"
      class="!p-1"
      @click="openOAuthModal"
    />

    <!-- Changes Indicator (Clickable to view diff) -->
    <div
      v-if="hasChanges && !isSyncing"
      v-tippy="{ theme: 'tooltip' }"
      :title="changesTitle + ' - ' + t('workspace.git_click_view_diff')"
      class="flex items-center gap-1 px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-500 cursor-pointer hover:opacity-80 transition-opacity"
      @click="openDiffModal"
    >
      <IconCircleDot class="w-3 h-3" />
      <span>{{ changesCount }}</span>
    </div>

    <!-- Conflicts Warning -->
    <div
      v-if="hasConflicts"
      v-tippy="{ theme: 'tooltip' }"
      :title="t('workspace.git_conflicts')"
      class="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-500 cursor-pointer"
      @click="openConflictModal"
    >
      <IconAlertTriangle class="w-3 h-3" />
      <span>{{ conflictsCount }}</span>
    </div>

    <!-- Last Sync Time -->
    <span
      v-if="lastSyncTimeFormatted && !isSyncing"
      v-tippy="{ theme: 'tooltip' }"
      :title="t('workspace.git_last_sync')"
      class="text-xs text-secondaryLight"
    >
      {{ lastSyncTimeFormatted }}
    </span>

    <!-- Modals -->
    <template v-if="!delegateModals">
      <GitHistoryModal
        :show="showHistoryModal"
        @close="showHistoryModal = false"
      />

      <GitCommitLogModal
        :show="showCommitLogModal"
        @close="showCommitLogModal = false"
      />

      <GitBranchModal
        :show="showBranchModal"
        @close="showBranchModal = false"
      />

      <GitDiffModal :show="showDiffModal" @close="showDiffModal = false" />

      <GitOAuthModal :show="showOAuthModal" @close="showOAuthModal = false" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitStatus } from "~/composables/useGitStatus"
import GitHistoryModal from "./GitHistoryModal.vue"
import GitCommitLogModal from "./GitCommitLogModal.vue"
import GitBranchModal from "./GitBranchModal.vue"
import GitDiffModal from "./GitDiffModal.vue"
import GitOAuthModal from "./GitOAuthModal.vue"
import IconRefreshCw from "~icons/lucide/refresh-cw"
import IconLoader from "~icons/lucide/loader"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconCheck from "~icons/lucide/check"
import IconCloud from "~icons/lucide/cloud"
import IconCloudOff from "~icons/lucide/cloud-off"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconHistory from "~icons/lucide/history"
import IconGitCommit from "~icons/lucide/git-commit"
import IconShield from "~icons/lucide/shield"

const props = withDefaults(
  defineProps<{
    showBranch?: boolean
    delegateModals?: boolean
  }>(),
  {
    showBranch: true,
    delegateModals: false,
  }
)

const emit = defineEmits<{
  (
    e: "open-modal",
    modal: "history" | "commit" | "oauth" | "branch" | "diff"
  ): void
}>()

const t = useI18n()

// Use Git status composable
const {
  gitStatus,
  isGitEnabled,
  isSyncing,
  hasChanges,
  hasConflicts,
  conflictsCount,
  changesCount,
  branch,
  lastSyncTime,
  sync,
  openConflictModal,
} = useGitStatus()

// Modal visibility states
const showHistoryModal = ref(false)
const showCommitLogModal = ref(false)
const showBranchModal = ref(false)
const showDiffModal = ref(false)
const showOAuthModal = ref(false)

// Timer to update the "time ago" display
const now = ref(new Date())
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Update "now" every 30 seconds to refresh the time display
  timeUpdateInterval = setInterval(() => {
    now.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})

// Component-specific computed properties
const lastSyncTimeFormatted = computed(() => {
  const time = lastSyncTime.value
  if (!time) return null

  // Use reactive now value to trigger updates
  const diff = now.value.getTime() - time.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return t("workspace.git_just_now")
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
})

const statusIcon = computed(() => {
  if (hasConflicts.value) return IconCloudOff
  if (hasChanges.value) return IconCloud
  return IconCheck
})

const statusClass = computed(() => {
  if (hasConflicts.value) return "bg-red-500/20 text-red-500"
  if (hasChanges.value) return "bg-amber-500/20 text-amber-500"
  return "bg-green-500/20 text-green-500"
})

const statusTooltip = computed(() => {
  const status = gitStatus.value
  if (!status) return t("workspace.git_status_unknown")

  const parts: string[] = [`${t("workspace.git_branch")}: ${status.branch}`]

  if (status.ahead > 0) {
    parts.push(`${status.ahead} ${t("workspace.git_ahead")}`)
  }
  if (status.behind > 0) {
    parts.push(`${status.behind} ${t("workspace.git_behind")}`)
  }
  if (status.modified.length > 0) {
    parts.push(`${status.modified.length} ${t("workspace.git_modified")}`)
  }
  if (status.untracked.length > 0) {
    parts.push(`${status.untracked.length} ${t("workspace.git_untracked")}`)
  }
  if (status.conflicted.length > 0) {
    parts.push(`${status.conflicted.length} ${t("workspace.git_conflicted")}`)
  }

  return parts.join("\n")
})

const syncButtonTitle = computed(() => {
  if (isSyncing.value) return t("workspace.git_syncing")
  return t("workspace.git_sync_now")
})

const changesTitle = computed(() => {
  const status = gitStatus.value
  if (!status) return ""

  const parts: string[] = []
  if (status.modified.length > 0) {
    parts.push(`${status.modified.length} ${t("workspace.git_modified")}`)
  }
  if (status.untracked.length > 0) {
    parts.push(`${status.untracked.length} ${t("workspace.git_untracked")}`)
  }
  if (status.staged.length > 0) {
    parts.push(`${status.staged.length} ${t("workspace.git_staged")}`)
  }

  return parts.join(", ")
})

// Methods
const handleSync = async () => {
  await sync()
}

const openHistoryModal = () => {
  if (props.delegateModals) {
    emit("open-modal", "history")
    return
  }
  showHistoryModal.value = true
}

const openCommitLogModal = () => {
  if (props.delegateModals) {
    emit("open-modal", "commit")
    return
  }
  showCommitLogModal.value = true
}

const openOAuthModal = () => {
  if (props.delegateModals) {
    emit("open-modal", "oauth")
    return
  }
  showOAuthModal.value = true
}

const openBranchModal = () => {
  if (props.delegateModals) {
    emit("open-modal", "branch")
    return
  }
  showBranchModal.value = true
}

const openDiffModal = () => {
  if (props.delegateModals) {
    emit("open-modal", "diff")
    return
  }
  showDiffModal.value = true
}
</script>
