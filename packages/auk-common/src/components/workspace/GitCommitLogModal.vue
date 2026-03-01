<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.git_commit_log')"
    styles="sm:max-w-xl"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Loading State -->
        <div
          v-if="isLoadingCommits"
          class="flex items-center justify-center py-8"
        >
          <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
        </div>

        <!-- Empty State -->
        <div
          v-else-if="commitLog.length === 0"
          class="flex flex-col items-center justify-center py-8 text-secondaryLight"
        >
          <IconGitCommit class="w-12 h-12 mb-2 opacity-50" />
          <span class="text-sm">{{ t("workspace.git_no_commits") }}</span>
        </div>

        <!-- Commit List -->
        <div v-else class="flex flex-col max-h-[500px] overflow-y-auto">
          <div
            v-for="commit in commitLog"
            :key="commit.hash"
            class="flex gap-3 p-3 border-b border-dividerLight last:border-b-0 hover:bg-primaryLight transition-colors cursor-pointer"
            @click="handleCommitClick(commit)"
          >
            <!-- Commit Icon -->
            <div class="flex flex-col items-center shrink-0">
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent"
              >
                <IconGitCommit class="w-4 h-4" />
              </div>
              <div
                v-if="commitLog.indexOf(commit) < commitLog.length - 1"
                class="w-0.5 flex-1 bg-dividerLight mt-2"
              />
            </div>

            <!-- Commit Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-medium text-primaryDark line-clamp-2">
                  {{ commit.message }}
                </p>
                <code
                  class="px-1.5 py-0.5 text-xs font-mono bg-primaryLight rounded shrink-0"
                >
                  {{ commit.shortHash }}
                </code>
              </div>
              <div
                class="flex items-center gap-3 mt-2 text-xs text-secondaryLight"
              >
                <span class="flex items-center gap-1">
                  <IconUser class="w-3 h-3" />
                  {{ commit.author }}
                </span>
                <span class="flex items-center gap-1">
                  <IconCalendar class="w-3 h-3" />
                  {{ formatDate(commit.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Load More Button -->
        <div
          v-if="commitLog.length > 0 && commitLog.length >= currentLimit"
          class="flex justify-center"
        >
          <AukButtonSecondary
            :label="t('workspace.git_load_more')"
            :loading="isLoadingCommits"
            @click="loadMore"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <AukButtonSecondary :label="t('action.close')" @click="emit('close')" />
      </div>
    </template>
  </AukSmartModal>

  <!-- Diff Modal -->
  <GitDiffModal
    :show="!!selectedCommit"
    :commit="selectedCommit"
    @close="selectedCommit = null"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitHistory } from "~/composables/useGitHistory"
import type { GitCommit } from "~/services/git/types"
import GitDiffModal from "./GitDiffModal.vue"
import IconLoader from "~icons/lucide/loader"
import IconGitCommit from "~icons/lucide/git-commit"
import IconUser from "~icons/lucide/user"
import IconCalendar from "~icons/lucide/calendar"

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()
const { commitLog, isLoadingCommits, loadCommitLog } = useGitHistory()

const currentLimit = ref(50)
const selectedCommit = ref<GitCommit | null>(null)

// Load commits when modal opens
watch(
  () => props.show,
  (show) => {
    if (show) {
      currentLimit.value = 50
      loadCommitLog(currentLimit.value)
    }
  }
)

onMounted(() => {
  if (props.show) {
    loadCommitLog(currentLimit.value)
  }
})

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  if (days === 1) {
    return t("workspace.git_yesterday")
  }
  if (days < 7) {
    return `${days} ${t("workspace.git_days_ago")}`
  }

  return date.toLocaleDateString()
}

function handleCommitClick(commit: GitCommit) {
  selectedCommit.value = commit
}

async function loadMore() {
  currentLimit.value += 50
  await loadCommitLog(currentLimit.value)
}
</script>
