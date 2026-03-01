<template>
  <div class="flex flex-col">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="branches.length === 0"
      class="flex flex-col items-center justify-center py-8 text-secondaryLight"
    >
      <IconGitBranch class="w-12 h-12 mb-2 opacity-50" />
      <span class="text-sm">{{ t("workspace.git_no_branches") }}</span>
    </div>

    <!-- Branch List -->
    <div v-else class="flex flex-col max-h-[350px] overflow-y-auto">
      <div
        v-for="branch in branches"
        :key="branch.name"
        class="flex items-center gap-3 p-3 border-b border-dividerLight last:border-b-0 hover:bg-primaryLight transition-colors"
      >
        <!-- Branch Icon -->
        <div
          class="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          :class="
            branch.current
              ? 'bg-accent/20 text-accent'
              : branch.remote
                ? 'bg-blue-500/20 text-blue-500'
                : 'bg-primaryLight text-secondaryLight'
          "
        >
          <IconGitBranch class="w-4 h-4" />
        </div>

        <!-- Branch Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="text-sm font-semibold truncate"
              :class="branch.current ? 'text-accent' : ''"
            >
              {{ branch.name }}
            </span>
            <span
              v-if="branch.current"
              class="px-1.5 py-0.5 text-xs rounded bg-accent/20 text-accent"
            >
              {{ t("workspace.git_current") }}
            </span>
          </div>

          <!-- Ahead/Behind Info -->
          <div
            v-if="!branch.remote && (branch.ahead > 0 || branch.behind > 0)"
            class="flex items-center gap-3 mt-1 text-xs text-secondaryLight"
          >
            <span v-if="branch.ahead > 0" class="flex items-center gap-1">
              <IconArrowUp class="w-3 h-3 text-green-500" />
              {{ branch.ahead }} {{ t("workspace.git_ahead") }}
            </span>
            <span v-if="branch.behind > 0" class="flex items-center gap-1">
              <IconArrowDown class="w-3 h-3 text-amber-500" />
              {{ branch.behind }} {{ t("workspace.git_behind") }}
            </span>
          </div>

          <!-- Last Commit -->
          <div
            v-if="branch.lastCommit"
            class="mt-1 text-xs text-secondaryLight truncate"
          >
            {{ branch.lastCommit.message }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- Checkout Button -->
          <AukButtonSecondary
            v-if="!branch.current"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('workspace.git_checkout')"
            :icon="IconLogIn"
            @click="emit('checkout', branch.name)"
          />

          <!-- Merge Button (only for non-current local branches) -->
          <AukButtonSecondary
            v-if="!branch.current && !branch.remote"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('workspace.git_merge')"
            :icon="IconGitMerge"
            @click="emit('merge', branch.name)"
          />

          <!-- Delete Button (only for non-current local branches) -->
          <AukButtonSecondary
            v-if="!branch.current && !branch.remote"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('workspace.git_delete_branch')"
            :icon="IconTrash"
            class="!text-red-500"
            @click="confirmDelete(branch.name)"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <AukSmartConfirmModal
      :show="!!deletingBranch"
      :title="t('workspace.git_delete_branch')"
      @hide="deletingBranch = null"
      @resolve="handleDeleteConfirm"
    >
      <template #body>
        <p class="text-secondaryLight">
          {{
            t("workspace.git_delete_branch_confirm", { branch: deletingBranch })
          }}
        </p>
      </template>
    </AukSmartConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "~/composables/i18n"
import type { GitBranch } from "~/services/git/types"
import IconLoader from "~icons/lucide/loader"
import IconGitBranch from "~icons/lucide/git-branch"
import IconGitMerge from "~icons/lucide/git-merge"
import IconArrowUp from "~icons/lucide/arrow-up"
import IconArrowDown from "~icons/lucide/arrow-down"
import IconLogIn from "~icons/lucide/log-in"
import IconTrash from "~icons/lucide/trash-2"

defineProps<{
  branches: GitBranch[]
  isLoading: boolean
  currentBranch: string
}>()

const emit = defineEmits<{
  (e: "checkout", branch: string): void
  (e: "delete", branch: string): void
  (e: "merge", branch: string): void
}>()

const t = useI18n()
const deletingBranch = ref<string | null>(null)

function confirmDelete(branch: string) {
  deletingBranch.value = branch
}

function handleDeleteConfirm(confirmed: boolean) {
  if (confirmed && deletingBranch.value) {
    emit("delete", deletingBranch.value)
  }
  deletingBranch.value = null
}
</script>
