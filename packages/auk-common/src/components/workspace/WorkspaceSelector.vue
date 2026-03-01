<template>
  <div class="flex items-center">
    <div ref="selectorRef" class="relative">
      <!-- Current Workspace Button -->
      <button
        ref="buttonRef"
        class="flex items-center gap-2 px-3 h-8 rounded border border-accentDark bg-accentLight/50 text-accent hover:border-accent hover:bg-accentLight focus-visible:border-accent focus-visible:bg-accentLight transition-colors"
        @click="toggleDropdown"
      >
        <div class="relative flex items-center">
          <IconFolder class="w-4 h-4 text-current" />
          <span
            v-if="currentWorkspace?.git?.enabled"
            v-tippy="{ theme: 'tooltip' }"
            :title="syncStatusText"
            class="absolute -bottom-1 -right-1 h-2 w-2 rounded-full border-2 border-primaryLight"
            :class="syncStatusClass"
          />
        </div>
        <span class="text-sm font-medium text-current truncate max-w-[150px]">
          {{ currentWorkspace?.name || t("workspace.select") }}
        </span>
        <IconChevronDown
          class="w-4 h-4 text-current transition-transform"
          :class="{ 'rotate-180': isOpen }"
        />
      </button>

      <!-- Dropdown Menu - Teleported to body to avoid overflow issues -->
      <Teleport to="body">
        <transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            ref="dropdownRef"
            class="fixed w-64 rounded-lg bg-popover border border-dividerDark shadow-lg z-[9999]"
            :style="dropdownStyle"
          >
            <!-- Sync Center Entry -->
            <div v-if="isGitEnabled" class="p-2 bg-primaryLight/50">
              <AukButtonSecondary
                :label="t('workspace.sync_center_title')"
                :icon="IconCloud"
                class="w-full justify-between"
                @click="openSyncCenter"
              />
              <p class="mt-2 text-xs text-secondaryLight px-1">
                {{ t("workspace.sync_center_entry_hint") }}
              </p>
            </div>

            <!-- Divider if Git is enabled -->
            <div v-if="isGitEnabled" class="border-t border-dividerDark"></div>

            <!-- Workspace List -->
            <div class="p-2 max-h-64 overflow-y-auto">
              <div
                class="text-xs font-bold text-secondaryLight uppercase tracking-wide mb-2 px-1"
              >
                {{ t("workspace.title") }}
              </div>
              <div
                v-for="workspace in workspaces"
                :key="workspace.id"
                class="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-primaryDark transition-colors"
                :class="{
                  'bg-primaryLight': workspace.id === currentWorkspace?.id,
                }"
                @click="selectWorkspace(workspace.id)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <IconFolder
                    class="w-4 h-4 text-secondaryLight flex-shrink-0"
                  />
                  <span class="text-sm text-secondaryDark truncate">{{
                    workspace.name
                  }}</span>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <span
                    v-if="workspace.git?.enabled"
                    class="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400"
                  >
                    Git
                  </span>
                  <IconCheck
                    v-if="workspace.id === currentWorkspace?.id"
                    class="w-4 h-4 text-green-400"
                  />
                </div>
              </div>

              <div
                v-if="workspaces.length === 0"
                class="px-3 py-4 text-center text-secondaryLight text-sm"
              >
                {{ t("workspace.no_workspaces") }}
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-dividerDark"></div>

            <!-- Actions -->
            <div class="p-2">
              <button
                class="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-primaryDark transition-colors"
                @click="openCreateDialog"
              >
                <IconPlus class="w-4 h-4 text-secondaryLight" />
                <span class="text-sm text-secondaryDark">{{
                  t("workspace.create_new")
                }}</span>
              </button>
              <button
                class="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-primaryDark transition-colors"
                @click="openManageDialog"
              >
                <IconSettings class="w-4 h-4 text-secondaryLight" />
                <span class="text-sm text-secondaryDark">{{
                  t("workspace.manage")
                }}</span>
              </button>
            </div>
          </div>
        </transition>
      </Teleport>

      <!-- Create Workspace Dialog -->
      <WorkspaceCreateModal
        v-if="showCreateDialog"
        @close="showCreateDialog = false"
        @created="onWorkspaceCreated"
      />

      <!-- Manage Workspaces Dialog -->
      <WorkspaceManageModal
        v-if="showManageDialog"
        @close="showManageDialog = false"
      />

      <SyncCenterModal
        :show="showSyncCenter"
        @close="showSyncCenter = false"
        @open-versions="openVersionsModal"
        @open-activity="openActivityModal"
        @open-conflicts="handleOpenConflicts"
        @open-branches="openBranchesModal"
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

      <GitBranchModal
        :show="showBranchModal"
        @close="showBranchModal = false"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue"
import { useI18n } from "@composables/i18n"
import { useWorkspaceStore } from "~/store/workspace"
import { useGitStatus } from "~/composables/useGitStatus"
import WorkspaceCreateModal from "./WorkspaceCreateModal.vue"
import WorkspaceManageModal from "./WorkspaceManageModal.vue"
import SyncCenterModal from "./SyncCenterModal.vue"
import VersionsHistoryModal from "./VersionsHistoryModal.vue"
import GitHistoryModal from "./GitHistoryModal.vue"
import GitBranchModal from "./GitBranchModal.vue"
import GitOAuthModal from "./GitOAuthModal.vue"
import GitIgnoreModal from "./GitIgnoreModal.vue"
import WorkspaceEditModal from "./WorkspaceEditModal.vue"
import InitialSyncModal from "./WorkspaceSyncInitialModal.vue"
import IconFolder from "~icons/lucide/folder"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconCheck from "~icons/lucide/check"
import IconPlus from "~icons/lucide/plus"
import IconSettings from "~icons/lucide/settings"
import IconCloud from "~icons/lucide/cloud"

const t = useI18n()

const {
  workspaces,
  currentWorkspace,
  switchWorkspace,
  initializeWorkspaceStore,
} = useWorkspaceStore()

// Use Git status composable
const {
  isGitEnabled,
  isSyncing,
  hasConflicts,
  lastSyncTime,
  lastSyncResult,
  error,
  sync,
  openConflictModal,
  showConflictModal,
} = useGitStatus()

const selectorRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const showCreateDialog = ref(false)
const showManageDialog = ref(false)
const showSyncCenter = ref(false)
const showVersionsModal = ref(false)
const showActivityModal = ref(false)
const showBranchModal = ref(false)
const showSettingsModal = ref(false)
const showInitialSync = ref(false)
const showOAuthModal = ref(false)
const showGitIgnoreModal = ref(false)
const dropdownPosition = ref({ top: 0, left: 0 })

// Compute dropdown style based on button position
const dropdownStyle = computed(() => ({
  top: `${dropdownPosition.value.top}px`,
  left: `${dropdownPosition.value.left}px`,
}))

// Update dropdown position based on button location
function updateDropdownPosition() {
  if (buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    const dropdownWidth = 256 // w-64 is 16rem = 256px
    const windowWidth = window.innerWidth

    let left = rect.left

    // Check if dropdown would overflow right side of screen
    if (left + dropdownWidth > windowWidth) {
      // Align right edge of dropdown with right edge of button
      left = rect.right - dropdownWidth
    }

    dropdownPosition.value = {
      top: rect.bottom + 8,
      left: left,
    }
  }
}

// Initialize workspace store on mount
onMounted(async () => {
  await initializeWorkspaceStore()
  document.addEventListener("click", handleClickOutside)
  window.addEventListener("resize", updateDropdownPosition)
  window.addEventListener("scroll", updateDropdownPosition, true)
})

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside)
  window.removeEventListener("resize", updateDropdownPosition)
  window.removeEventListener("scroll", updateDropdownPosition, true)
})

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node

  // If conflict modal is open, don't close the dropdown
  // This prevents the dropdown from closing when clicking inside the teleported modal
  if (showConflictModal.value) return
  const modalPortal = document.getElementById("auk-modal-portal")
  if (modalPortal && modalPortal.contains(target)) return

  if (
    selectorRef.value &&
    !selectorRef.value.contains(target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target)
  ) {
    isOpen.value = false
  }
}

function toggleDropdown(event: MouseEvent) {
  event.stopPropagation()
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updateDropdownPosition()
    })
  }
}

async function selectWorkspace(workspaceId: string) {
  await switchWorkspace(workspaceId)
  isOpen.value = false
}

function openCreateDialog() {
  isOpen.value = false
  showCreateDialog.value = true
}

function openManageDialog() {
  isOpen.value = false
  showManageDialog.value = true
}

function onWorkspaceCreated(payload?: { openSyncCenter: boolean }) {
  showCreateDialog.value = false
  if (payload?.openSyncCenter) {
    showSyncCenter.value = true
  }
}

const syncStatusType = computed(() => {
  if (!isGitEnabled.value) return "disabled"
  if (error.value === "INITIAL_SYNC_REQUIRED") return "setup"
  if (hasConflicts.value) return "conflicts"
  if (isSyncing.value) return "syncing"
  if (lastSyncResult.value && !lastSyncResult.value.success) return "failed"
  if (lastSyncTime.value) return "synced"
  return "ready"
})

const syncStatusClass = computed(() => {
  switch (syncStatusType.value) {
    case "setup":
    case "conflicts":
      return "bg-amber-500"
    case "syncing":
      return "bg-blue-500"
    case "failed":
      return "bg-red-500"
    case "synced":
      return "bg-green-500"
    default:
      return "bg-secondaryLight"
  }
})

const syncStatusText = computed(() => {
  switch (syncStatusType.value) {
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

function openSyncCenter() {
  isOpen.value = false
  showSyncCenter.value = true
}

function openVersionsModal() {
  showSyncCenter.value = false
  showVersionsModal.value = true
}

function openActivityModal() {
  showSyncCenter.value = false
  showActivityModal.value = true
}

function openBranchesModal() {
  showSyncCenter.value = false
  showBranchModal.value = true
}

function openSettings() {
  showSyncCenter.value = false
  showSettingsModal.value = true
}

function openOAuthModal() {
  showSyncCenter.value = false
  showOAuthModal.value = true
}

function openGitIgnoreModal() {
  showSyncCenter.value = false
  showGitIgnoreModal.value = true
}

function handleOpenConflicts() {
  showSyncCenter.value = false
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
