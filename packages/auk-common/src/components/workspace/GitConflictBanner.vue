<template>
  <transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="transform -translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div
      v-if="showBanner"
      class="flex items-center justify-between px-4 py-2 bg-amber-500/20 border-b border-amber-500/30"
    >
      <div class="flex items-center gap-2">
        <IconAlertTriangle class="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span class="text-sm text-amber-600 dark:text-amber-400">
          {{ bannerMessage }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <AukButtonSecondary
          :label="t('workspace.git_resolve_conflicts')"
          class="!text-amber-600 dark:!text-amber-400 !bg-amber-500/20 hover:!bg-amber-500/30"
          filled
          @click="openConflictModal"
        />
        <button
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.dismiss')"
          class="p-1 rounded hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors"
          @click="dismissBanner"
        >
          <IconX class="w-4 h-4" />
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitStatus } from "~/composables/useGitStatus"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconX from "~icons/lucide/x"

const t = useI18n()

// Use Git status composable
const {
  currentWorkspace,
  isGitEnabled,
  hasConflicts,
  conflictsCount,
  isBannerDismissed,
  openConflictModal,
  dismissBanner,
} = useGitStatus()

const showBanner = computed(() => {
  return isGitEnabled.value && hasConflicts.value && !isBannerDismissed.value
})

const bannerMessage = computed(() => {
  const workspaceName = currentWorkspace.value?.name ?? ""
  return t("workspace.git_conflict_banner", {
    name: workspaceName,
    count: conflictsCount.value,
  })
})
</script>
