<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.sync_center_history_versions')"
    styles="sm:max-w-xl"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div
          v-if="isLoadingCommits"
          class="flex items-center justify-center py-8"
        >
          <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
        </div>

        <div
          v-else-if="commitLog.length === 0"
          class="flex flex-col items-center justify-center py-8 text-secondaryLight"
        >
          <IconHistory class="w-12 h-12 mb-2 opacity-50" />
          <span class="text-sm">{{
            t("workspace.sync_center_versions_empty")
          }}</span>
        </div>

        <div v-else class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-secondaryLight">
              {{ t("workspace.git_commit_summary") }}
            </span>
            <AukButtonSecondary
              :label="
                showSummaries
                  ? t('workspace.git_hide_summaries')
                  : t('workspace.git_show_summaries')
              "
              :loading="isLoadingSummaries"
              class="!text-xs"
              @click="toggleSummaries"
            />
          </div>

          <div class="flex flex-col max-h-[520px] overflow-y-auto">
            <div
              v-for="commit in commitLog"
              :key="commit.hash"
              class="flex items-start gap-3 p-3 border-b border-dividerLight last:border-b-0 hover:bg-primaryLight transition-colors"
            >
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent shrink-0"
              >
                <IconHistory class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium line-clamp-2">
                  {{ commit.message }}
                </p>
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
              <div class="flex flex-col items-end gap-2 shrink-0">
                <code
                  class="px-1.5 py-0.5 text-xs font-mono bg-primaryLight rounded"
                >
                  {{ commit.shortHash }}
                </code>
                <div
                  v-if="showSummaries && commitSummaries[commit.hash]"
                  class="text-xs text-secondaryLight"
                >
                  {{ commitSummaries[commit.hash].files }}
                  {{ t("workspace.git_files_changed") }},
                  <span class="text-green-500"
                    >+{{ commitSummaries[commit.hash].additions }}</span
                  >
                  <span class="text-red-500 ml-1"
                    >-{{ commitSummaries[commit.hash].deletions }}</span
                  >
                </div>
                <AukButtonSecondary
                  :label="t('workspace.sync_center_view_changes')"
                  class="!text-xs"
                  @click="handleCommitClick(commit)"
                />
              </div>
            </div>
          </div>
        </div>

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
import { useWorkspaceStore } from "~/store/workspace"
import type { GitCommit } from "~/services/git/types"
import { getGitService } from "~/services/git/tauri-git"
import GitDiffModal from "./GitDiffModal.vue"
import IconLoader from "~icons/lucide/loader"
import IconHistory from "~icons/lucide/history"
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
const gitService = getGitService()
const { currentWorkspace } = useWorkspaceStore()

const currentLimit = ref(50)
const selectedCommit = ref<GitCommit | null>(null)
const showSummaries = ref(false)
const isLoadingSummaries = ref(false)
const commitSummaries = ref<
  Record<string, { files: number; additions: number; deletions: number }>
>({})

watch(
  () => props.show,
  (show) => {
    if (show) {
      currentLimit.value = 50
      loadCommitLog(currentLimit.value)
      if (showSummaries.value) {
        loadSummaries()
      }
    } else {
      showSummaries.value = false
      commitSummaries.value = {}
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
  if (showSummaries.value) {
    await loadSummaries()
  }
}

async function toggleSummaries() {
  showSummaries.value = !showSummaries.value
  if (showSummaries.value) {
    await loadSummaries()
  }
}

async function loadSummaries() {
  if (isLoadingSummaries.value) return
  if (!currentWorkspace.value?.path) return
  isLoadingSummaries.value = true
  try {
    for (const commit of commitLog.value) {
      if (commitSummaries.value[commit.hash]) continue
      try {
        const diff = await gitService.getDiff(
          currentWorkspace.value.path,
          commit.hash
        )
        commitSummaries.value[commit.hash] = {
          files: diff.stats.filesChanged,
          additions: diff.stats.additions,
          deletions: diff.stats.deletions,
        }
      } catch {
        commitSummaries.value[commit.hash] = {
          files: 0,
          additions: 0,
          deletions: 0,
        }
      }
    }
  } finally {
    isLoadingSummaries.value = false
  }
}
</script>
