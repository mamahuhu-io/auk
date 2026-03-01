<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.git_merge_branch')"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Merge Info -->
        <div class="flex items-center gap-3 p-4 rounded-lg bg-primaryLight">
          <div class="flex items-center gap-2">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20 text-accent"
            >
              <IconGitBranch class="w-5 h-5" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-secondaryLight">
                {{ t("workspace.git_merge_from") }}
              </span>
              <span class="text-sm font-medium text-primaryDark">
                {{ branch }}
              </span>
            </div>
          </div>

          <IconArrowRight class="w-5 h-5 text-secondaryLight" />

          <div class="flex items-center gap-2">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 text-green-500"
            >
              <IconGitBranch class="w-5 h-5" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-secondaryLight">
                {{ t("workspace.git_merge_into") }}
              </span>
              <span class="text-sm font-medium text-primaryDark">
                {{ currentBranch }}
              </span>
            </div>
          </div>
        </div>

        <!-- Warning -->
        <div
          class="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-400"
        >
          <IconAlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1 text-sm">
            <p>{{ t("workspace.git_merge_warning") }}</p>
          </div>
        </div>

        <!-- Merge Description -->
        <p class="text-sm text-secondaryLight">
          {{
            t("workspace.git_merge_description", {
              from: branch,
              into: currentBranch,
            })
          }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <AukButtonSecondary
          :label="t('action.cancel')"
          :disabled="isMerging"
          @click="emit('close')"
        />
        <AukButtonPrimary
          :label="t('workspace.git_merge')"
          :icon="IconGitMerge"
          :loading="isMerging"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { useGitBranch } from "~/composables/useGitBranch"
import IconGitBranch from "~icons/lucide/git-branch"
import IconGitMerge from "~icons/lucide/git-merge"
import IconArrowRight from "~icons/lucide/arrow-right"
import IconAlertTriangle from "~icons/lucide/alert-triangle"

defineProps<{
  show: boolean
  branch: string
  isMerging: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "confirm"): void
}>()

const t = useI18n()
const { currentBranch } = useGitBranch()
</script>
