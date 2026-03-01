<template>
  <div v-if="currentWorkspace" class="flex items-center gap-2">
    <AukButtonSecondary
      v-if="compact"
      v-tippy="{ theme: 'tooltip' }"
      :title="statusText"
      :icon="statusIcon"
      class="!h-8 !w-8 !p-0 !rounded-full"
      @click="openCenter"
    />
    <template v-else>
      <button
        class="flex items-center gap-2 px-3 h-8 rounded-full border transition-colors"
        :class="statusButtonClass"
        @click="openCenter"
      >
        <component
          :is="statusIcon"
          class="w-4 h-4"
          :class="{ 'animate-spin': statusType === 'syncing' }"
        />
        <span class="text-xs font-medium truncate max-w-[160px]">
          {{ statusText }}
        </span>
      </button>

      <AukButtonPrimary
        :label="t('workspace.sync_center_title')"
        :icon="IconCloud"
        :loading="isSyncing"
        :disabled="isSyncing"
        class="!h-8 !px-3 !text-xs"
        @click="openCenter"
      />
    </template>

    <SyncCenterModal
      :show="showCenter"
      @close="showCenter = false"
      @open-versions="openVersionsModal"
      @open-activity="openActivityModal"
      @open-conflicts="handleOpenConflicts"
      @open-oauth="openOAuthModal"
      @open-gitignore="openGitIgnoreModal"
      @open-settings="openSettings"
      @primary-action="handlePrimaryAction"
    />

    <VersionsHistoryModal
      :show="showVersionsModal"
      @close="showVersionsModal = false"
    />

    <GitHistoryModal
      :show="showActivityModal"
      @close="showActivityModal = false"
    />

    <GitOAuthModal :show="showOAuthModal" @close="showOAuthModal = false" />

    <GitIgnoreModal
      :show="showGitIgnoreModal"
      @close="showGitIgnoreModal = false"
    />

    <WorkspaceEditModal
      v-if="showSettingsModal && currentWorkspace"
      :workspace="currentWorkspace"
      @close="showSettingsModal = false"
      @updated="showSettingsModal = false"
    />

    <InitialSyncModal
      :show="showInitialSync"
      @close="showInitialSync = false"
      @confirm-remote="handleInitialSyncRemote"
      @confirm-local="handleInitialSyncLocal"
      @confirm-cancel="showInitialSync = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitStatus } from "~/composables/useGitStatus"
import { useWorkspaceStore } from "~/store/workspace"
import SyncCenterModal from "./SyncCenterModal.vue"
import VersionsHistoryModal from "./VersionsHistoryModal.vue"
import GitHistoryModal from "./GitHistoryModal.vue"
import GitOAuthModal from "./GitOAuthModal.vue"
import GitIgnoreModal from "./GitIgnoreModal.vue"
import WorkspaceEditModal from "./WorkspaceEditModal.vue"
import InitialSyncModal from "./WorkspaceSyncInitialModal.vue"
import IconCheck from "~icons/lucide/check"
import IconCloudOff from "~icons/lucide/cloud-off"
import IconCloud from "~icons/lucide/cloud"
import IconLoader from "~icons/lucide/loader"
import IconSettings from "~icons/lucide/settings"

const props = withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: false,
  }
)
const { compact } = toRefs(props)

const t = useI18n()
const { currentWorkspace } = useWorkspaceStore()

const {
  isGitEnabled,
  isSyncing,
  hasConflicts,
  lastSyncTime,
  lastSyncResult,
  error,
  sync,
  openConflictModal,
} = useGitStatus()

const showCenter = ref(false)
const showVersionsModal = ref(false)
const showActivityModal = ref(false)
const showSettingsModal = ref(false)
const showInitialSync = ref(false)
const showOAuthModal = ref(false)
const showGitIgnoreModal = ref(false)

const statusType = computed(() => {
  if (!isGitEnabled.value) return "disabled"
  if (error.value === "INITIAL_SYNC_REQUIRED") return "setup"
  if (hasConflicts.value) return "conflicts"
  if (isSyncing.value) return "syncing"
  if (lastSyncResult.value && !lastSyncResult.value.success) return "failed"
  if (lastSyncTime.value) return "synced"
  return "ready"
})

const statusText = computed(() => {
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

const statusIcon = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return IconSettings
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

const statusButtonClass = computed(() => {
  switch (statusType.value) {
    case "disabled":
      return "border-dividerLight bg-primaryLight text-secondaryLight"
    case "setup":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600"
    case "conflicts":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600"
    case "syncing":
      return "border-blue-500/40 bg-blue-500/10 text-blue-600"
    case "failed":
      return "border-red-500/40 bg-red-500/10 text-red-600"
    case "synced":
      return "border-green-500/40 bg-green-500/10 text-green-600"
    default:
      return "border-dividerLight bg-primaryLight text-secondaryLight"
  }
})

function openCenter() {
  showCenter.value = true
}

function openVersionsModal() {
  showCenter.value = false
  showVersionsModal.value = true
}

function openActivityModal() {
  showCenter.value = false
  showActivityModal.value = true
}

function openSettings() {
  showCenter.value = false
  showSettingsModal.value = true
}

function openOAuthModal() {
  showCenter.value = false
  showOAuthModal.value = true
}

function openGitIgnoreModal() {
  showCenter.value = false
  showGitIgnoreModal.value = true
}

function handleOpenConflicts() {
  showCenter.value = false
  openConflictModal()
}

async function handlePrimaryAction(status: string) {
  if (status === "disabled") {
    openSettings()
    return
  }
  if (status === "conflicts") {
    openConflictModal()
    return
  }
  if (status === "setup") {
    showInitialSync.value = true
    return
  }
  const result = await sync({ initialStrategy: "ask" })
  if (result.error === "INITIAL_SYNC_REQUIRED") {
    showInitialSync.value = true
  }
}

async function handleInitialSyncRemote() {
  showInitialSync.value = false
  await sync({ initialStrategy: "remote" })
}

async function handleInitialSyncLocal() {
  showInitialSync.value = false
  await sync({ initialStrategy: "local" })
}
</script>
