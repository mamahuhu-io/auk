<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.sync_center_title')"
    styles="sm:max-w-2xl"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Status Card -->
        <div
          class="flex items-center justify-between gap-3 p-4 rounded-lg border"
          :class="statusCardClass"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full"
              :class="statusIconClass"
            >
              <component
                :is="statusIcon"
                class="w-5 h-5"
                :class="{ 'animate-spin': statusType === 'syncing' }"
              />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium truncate">{{
                statusTitle
              }}</span>
              <span class="text-xs text-secondaryLight truncate">
                {{ statusSubtitle }}
              </span>
            </div>
          </div>
          <AukButtonPrimary
            :label="primaryActionLabel"
            :icon="primaryActionIcon"
            :loading="isSyncing"
            :disabled="primaryActionDisabled"
            @click="handlePrimaryAction"
          />
        </div>
        <p class="text-xs text-secondaryLight">
          {{ t("workspace.sync_center_authoritative_hint") }}
        </p>

        <!-- Summary -->
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col p-3 rounded-lg bg-primaryLight">
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.sync_center_last_sync") }}
            </span>
            <span class="text-sm font-medium text-secondary">
              {{ lastSyncTimeFormatted || t("workspace.sync_center_not_yet") }}
            </span>
          </div>
          <div class="flex flex-col p-3 rounded-lg bg-primaryLight">
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.sync_center_changes") }}
            </span>
            <span class="text-sm font-medium text-secondary">
              {{ changesCount }}
            </span>
          </div>
          <div class="flex flex-col p-3 rounded-lg bg-primaryLight">
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.sync_center_conflicts") }}
            </span>
            <span class="text-sm font-medium text-secondary">
              {{ conflictsCount }}
            </span>
          </div>
        </div>

        <!-- Changes Summary -->
        <div
          class="flex items-center justify-between gap-3 p-3 rounded-lg bg-primaryLight"
        >
          <div class="flex flex-col gap-1">
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.sync_center_changes_summary") }}
            </span>
            <span class="text-sm font-medium text-secondary">
              <template v-if="isLoadingDiff">
                {{ t("workspace.sync_center_changes_summary_loading") }}
              </template>
              <template v-else>
                {{ filesChanged }} {{ t("workspace.git_files_changed") }},
                <span class="text-green-500">+{{ totalAdditions }}</span>
                <span class="text-red-500 ml-1">-{{ totalDeletions }}</span>
              </template>
            </span>
          </div>
          <AukButtonSecondary
            :label="t('workspace.sync_center_view_changes')"
            :disabled="isLoadingDiff || filesChanged === 0"
            @click="openChangesModal"
          />
        </div>

        <!-- Sync Scope -->
        <div class="flex flex-col gap-2 p-3 rounded-lg bg-primaryLight">
          <span
            class="text-xs font-bold uppercase tracking-wide text-secondaryLight"
          >
            {{ t("workspace.sync_center_scope_title") }}
          </span>
          <div class="text-xs text-secondaryLight">
            {{ t("workspace.sync_center_scope_includes") }}
          </div>
          <div class="text-xs text-secondaryLight">
            {{ t("workspace.sync_center_scope_excludes") }}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex flex-col gap-2">
          <span
            class="text-xs font-bold uppercase tracking-wide text-secondaryLight"
          >
            {{ t("workspace.sync_center_quick_actions") }}
          </span>
          <div class="grid grid-cols-3 gap-2">
            <AukButtonSecondary
              :label="t('workspace.sync_center_history_versions')"
              :icon="IconHistory"
              @click="emit('open-versions')"
            />
            <AukButtonSecondary
              :label="t('workspace.git_sync_history')"
              :icon="IconList"
              @click="emit('open-activity')"
            />
            <AukButtonSecondary
              :label="t('workspace.sync_center_conflict_center')"
              :icon="IconAlertTriangle"
              :disabled="conflictsCount === 0"
              @click="emit('open-conflicts')"
            />
            <AukButtonSecondary
              :label="t('workspace.git_branches')"
              :icon="IconGitBranch"
              @click="emit('open-branches')"
            />
            <AukButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="oauthStatusText"
              :label="t('workspace.git_oauth_accounts')"
              :icon="IconShield"
              @click="emit('open-oauth')"
            />
            <AukButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="gitignoreStatusText"
              :label="t('workspace.git_ignore_title')"
              :icon="IconFileText"
              @click="emit('open-gitignore')"
            />
            <AukButtonSecondary
              :label="t('workspace.sync_center_settings')"
              :icon="IconSettings"
              @click="emit('open-settings')"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <AukButtonSecondary :label="t('action.close')" @click="emit('close')" />
      </div>
    </template>
  </AukSmartModal>

  <GitDiffModal :show="showChangesModal" @close="showChangesModal = false" />
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitStatus } from "~/composables/useGitStatus"
import { useGitOAuth } from "~/composables/useGitOAuth"
import { useGitDiff } from "~/composables/useGitDiff"
import { useWorkspaceStore } from "~/store/workspace"
import { getFileSystem } from "~/services/workspace-storage/filesystem"
import { joinPath } from "~/platform/capabilities"
import GitDiffModal from "./GitDiffModal.vue"
import IconCheck from "~icons/lucide/check"
import IconCloudOff from "~icons/lucide/cloud-off"
import IconCloud from "~icons/lucide/cloud"
import IconLoader from "~icons/lucide/loader"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconRefreshCw from "~icons/lucide/refresh-cw"
import IconHistory from "~icons/lucide/history"
import IconList from "~icons/lucide/list"
import IconSettings from "~icons/lucide/settings"
import IconPower from "~icons/lucide/power"
import IconGitBranch from "~icons/lucide/git-branch"
import IconShield from "~icons/lucide/shield"
import IconFileText from "~icons/lucide/file-text"

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "open-versions"): void
  (e: "open-activity"): void
  (e: "open-conflicts"): void
  (e: "open-branches"): void
  (e: "open-oauth"): void
  (e: "open-gitignore"): void
  (e: "open-settings"): void
  (e: "primary-action", status: string): void
}>()

const t = useI18n()
const { currentWorkspace } = useWorkspaceStore()
const fs = getFileSystem()

const {
  isGitEnabled,
  isSyncing,
  hasConflicts,
  changesCount,
  conflictsCount,
  lastSyncTime,
  lastSyncResult,
  error,
  gitSyncManager,
} = useGitStatus()

const { accounts, isExpired, isHydrated } = useGitOAuth()

const {
  isLoading: isLoadingDiff,
  filesChanged,
  totalAdditions,
  totalDeletions,
  loadDiff,
  clearDiff,
} = useGitDiff()

const now = ref(new Date())
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null
const showChangesModal = ref(false)
const gitignoreStatus = ref<"none" | "default" | "custom">("none")

const DEFAULT_GITIGNORE = `# Secrets
*.secret.json
secrets/

# Local state
.local/
*.local.json

# System files
.DS_Store
Thumbs.db`

onMounted(() => {
  timeUpdateInterval = setInterval(() => {
    now.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      gitSyncManager.refreshStatus()
      loadDiff()
      loadGitIgnoreStatus()
    } else {
      clearDiff()
    }
  }
)

const statusType = computed(() => {
  if (!isGitEnabled.value) return "disabled"
  if (error.value === "INITIAL_SYNC_REQUIRED") return "setup"
  if (hasConflicts.value) return "conflicts"
  if (isSyncing.value) return "syncing"
  if (lastSyncResult.value && !lastSyncResult.value.success) return "failed"
  if (error.value) return "failed"
  if (lastSyncTime.value) return "synced"
  return "ready"
})

const lastSyncTimeFormatted = computed(() => {
  const time = lastSyncTime.value
  if (!time) return null

  const diff = now.value.getTime() - time.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t("workspace.git_just_now")
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
})

const statusTitle = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return t("workspace.sync_center_status_disabled")
    case "setup":
      return t("workspace.sync_center_status_setup")
    case "conflicts":
      return t("workspace.sync_center_status_conflicts")
    case "syncing":
      return t("workspace.sync_center_status_syncing")
    case "failed":
      return t("workspace.sync_center_status_failed")
    case "synced":
      return t("workspace.sync_center_status_synced")
    default:
      return t("workspace.sync_center_status_ready")
  }
})

const statusSubtitle = computed(() => {
  if (statusType.value === "synced" && lastSyncTimeFormatted.value) {
    return `${t("workspace.sync_center_last_sync")} · ${lastSyncTimeFormatted.value}`
  }
  if (statusType.value === "failed" && lastSyncTimeFormatted.value) {
    return `${t("workspace.sync_center_last_sync")} · ${lastSyncTimeFormatted.value}`
  }
  if (statusType.value === "ready" && changesCount.value > 0) {
    return `${changesCount.value} ${t("workspace.sync_center_changes")}`
  }
  return t("workspace.sync_center_status_hint")
})

const statusIcon = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return IconPower
    case "setup":
      return IconSettings
    case "conflicts":
      return IconAlertTriangle
    case "syncing":
      return IconLoader
    case "failed":
      return IconCloudOff
    case "synced":
      return IconCheck
    default:
      return IconCloud
  }
})

const statusCardClass = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return "bg-primaryLight border-dividerLight"
    case "setup":
      return "bg-amber-500/10 border-amber-500/30"
    case "conflicts":
      return "bg-amber-500/10 border-amber-500/30"
    case "syncing":
      return "bg-blue-500/10 border-blue-500/30"
    case "failed":
      return "bg-red-500/10 border-red-500/30"
    case "synced":
      return "bg-green-500/10 border-green-500/30"
    default:
      return "bg-primaryLight border-dividerLight"
  }
})

const statusIconClass = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return "bg-primaryDark text-secondaryLight"
    case "setup":
      return "bg-amber-500/20 text-amber-500"
    case "conflicts":
      return "bg-amber-500/20 text-amber-500"
    case "syncing":
      return "bg-blue-500/20 text-blue-500"
    case "failed":
      return "bg-red-500/20 text-red-500"
    case "synced":
      return "bg-green-500/20 text-green-500"
    default:
      return "bg-primaryDark text-secondaryLight"
  }
})

const primaryActionLabel = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return t("workspace.sync_center_primary_setup")
    case "setup":
      return t("workspace.sync_center_primary_setup")
    case "conflicts":
      return t("workspace.sync_center_primary_resolve")
    case "failed":
      return t("workspace.sync_center_primary_retry")
    default:
      return t("workspace.sync_center_primary_sync")
  }
})

const primaryActionIcon = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return IconSettings
    case "conflicts":
      return IconAlertTriangle
    default:
      return IconRefreshCw
  }
})

const primaryActionDisabled = computed(() => {
  if (isSyncing.value) return true
  return false
})

async function handlePrimaryAction() {
  emit("primary-action", statusType.value)
}

function openChangesModal() {
  showChangesModal.value = true
}

const oauthStatusText = computed(() => {
  if (!isHydrated.value) {
    return t("state.loading")
  }
  if (!accounts.value.length) {
    return t("workspace.git_oauth_status_none")
  }
  const hasExpired = accounts.value.some((account) => isExpired(account))
  return hasExpired
    ? t("workspace.git_oauth_status_expired")
    : t("workspace.git_oauth_status_connected")
})

const gitignoreStatusText = computed(() => {
  switch (gitignoreStatus.value) {
    case "custom":
      return t("workspace.git_ignore_status_custom")
    case "default":
      return t("workspace.git_ignore_status_default")
    default:
      return t("workspace.git_ignore_status_none")
  }
})

async function loadGitIgnoreStatus() {
  const workspacePath = currentWorkspace.value?.path
  if (!workspacePath) {
    gitignoreStatus.value = "none"
    return
  }

  try {
    const path = await joinPath(workspacePath, ".gitignore")
    const exists = await fs.fileExists(path)
    if (!exists) {
      gitignoreStatus.value = "none"
      return
    }

    const content = await fs.readFile(path)
    const normalize = (value: string) => value.replace(/\r\n/g, "\n").trim()
    gitignoreStatus.value =
      normalize(content) === normalize(DEFAULT_GITIGNORE) ? "default" : "custom"
  } catch (error) {
    console.warn("[SyncCenterModal] Failed to load .gitignore status:", error)
    gitignoreStatus.value = "none"
  }
}
</script>
