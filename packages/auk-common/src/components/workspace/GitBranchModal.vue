<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.git_branches')"
    styles="sm:max-w-xl"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Tabs -->
        <div class="flex border-b border-dividerLight">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-secondaryLight hover:text-primaryDark'
            "
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span
              class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primaryLight"
            >
              {{ tab.count }}
            </span>
          </button>
        </div>

        <!-- Branch List -->
        <GitBranchList
          :branches="activeBranches"
          :is-loading="isLoading"
          :current-branch="currentBranch"
          @checkout="handleCheckout"
          @delete="handleDelete"
          @merge="handleMerge"
        />

        <!-- Create Branch -->
        <div
          v-if="activeTab === 'local'"
          class="pt-3 border-t border-dividerLight"
        >
          <GitBranchCreate :is-creating="isOperating" @create="handleCreate" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <AukButtonSecondary
          :icon="IconRefreshCw"
          :label="t('action.refresh')"
          :loading="isLoading"
          @click="refresh"
        />
        <AukButtonSecondary :label="t('action.close')" @click="emit('close')" />
      </div>
    </template>
  </AukSmartModal>

  <!-- Merge Confirmation Modal -->
  <GitMergeModal
    v-if="mergeBranchName"
    :show="!!mergeBranchName"
    :branch="mergeBranchName"
    :is-merging="isOperating"
    @close="mergeBranchName = null"
    @confirm="confirmMerge"
  />

  <AukSmartModal
    v-if="showCheckoutConfirm"
    dialog
    :title="t('workspace.git_checkout_with_changes')"
    @close="closeCheckoutConfirm"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <div
          class="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-400"
        >
          <IconAlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
          <div class="text-sm">
            {{ t("workspace.git_checkout_changes_warning") }}
          </div>
        </div>
        <div class="text-sm text-secondaryLight">
          {{
            t("workspace.git_checkout_changes_summary", {
              count: pendingChangesCount,
            })
          }}
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <AukButtonSecondary
          :label="t('action.cancel')"
          :disabled="isOperating"
          @click="closeCheckoutConfirm"
        />
        <AukButtonSecondary
          :label="t('workspace.git_checkout_stash')"
          :disabled="isOperating"
          @click="handleCheckoutWithStash"
        />
        <AukButtonPrimary
          :label="t('workspace.git_checkout_discard')"
          :disabled="isOperating"
          @click="handleCheckoutWithDiscard"
        />
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitBranch } from "~/composables/useGitBranch"
import { useToast } from "~/composables/toast"
import GitBranchList from "./GitBranchList.vue"
import GitBranchCreate from "./GitBranchCreate.vue"
import GitMergeModal from "./GitMergeModal.vue"
import IconRefreshCw from "~icons/lucide/refresh-cw"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import type { GitStatus } from "~/services/git/types"

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()
const toast = useToast()
const {
  localBranches,
  remoteBranches,
  currentBranch,
  isLoading,
  isOperating,
  getWorkingStatus,
  loadBranches,
  checkout,
  stashChanges,
  discardChanges,
  createBranch,
  deleteBranch,
  mergeBranch,
  refresh,
} = useGitBranch()

const activeTab = ref<"local" | "remote">("local")
const mergeBranchName = ref<string | null>(null)
const showCheckoutConfirm = ref(false)
const pendingCheckoutBranch = ref<string | null>(null)
const pendingStatus = ref<GitStatus | null>(null)

const tabs = computed(() => [
  {
    id: "local" as const,
    label: t("workspace.git_local_branches"),
    count: localBranches.value.length,
  },
  {
    id: "remote" as const,
    label: t("workspace.git_remote_branches"),
    count: remoteBranches.value.length,
  },
])

const activeBranches = computed(() => {
  return activeTab.value === "local"
    ? localBranches.value
    : remoteBranches.value
})

// Load branches when modal opens
watch(
  () => props.show,
  (show) => {
    if (show) {
      loadBranches()
    }
  }
)

onMounted(() => {
  if (props.show) {
    loadBranches()
  }
})

async function handleCheckout(branch: string) {
  const status = await getWorkingStatus()
  const hasChanges =
    (status?.modified.length ?? 0) +
      (status?.untracked.length ?? 0) +
      (status?.staged.length ?? 0) >
    0

  if (hasChanges) {
    pendingCheckoutBranch.value = branch
    pendingStatus.value = status
    showCheckoutConfirm.value = true
    return
  }

  await runCheckout(branch)
}

async function handleCreate(name: string) {
  const result = await createBranch(name)
  if (result.success) {
    toast.success(t("workspace.git_branch_created", { branch: name }))
  } else {
    toast.error(result.error || t("workspace.git_branch_create_failed"))
  }
}

async function handleDelete(branch: string) {
  const result = await deleteBranch(branch)
  if (result.success) {
    toast.success(t("workspace.git_branch_deleted", { branch }))
  } else {
    toast.error(result.error || t("workspace.git_branch_delete_failed"))
  }
}

function handleMerge(branch: string) {
  mergeBranchName.value = branch
}

async function confirmMerge() {
  if (!mergeBranchName.value) return

  const branch = mergeBranchName.value
  mergeBranchName.value = null

  const result = await mergeBranch(branch)
  if (result.success) {
    toast.success(t("workspace.git_merge_success", { branch }))
  } else if (result.conflicts.length > 0) {
    toast.error(
      t("workspace.git_merge_conflicts", { count: result.conflicts.length })
    )
  } else {
    toast.error(result.error || t("workspace.git_merge_failed"))
  }
}

const pendingChangesCount = computed(() => {
  if (!pendingStatus.value) return 0
  return (
    pendingStatus.value.modified.length +
    pendingStatus.value.untracked.length +
    pendingStatus.value.staged.length
  )
})

function closeCheckoutConfirm() {
  showCheckoutConfirm.value = false
  pendingCheckoutBranch.value = null
  pendingStatus.value = null
}

async function runCheckout(branch: string) {
  const result = await checkout(branch)
  if (result.success) {
    toast.success(
      t("workspace.git_checkout_success", { branch: result.branch })
    )
  } else {
    toast.error(result.error || t("workspace.git_checkout_failed"))
  }
}

async function handleCheckoutWithStash() {
  if (!pendingCheckoutBranch.value) return
  const branch = pendingCheckoutBranch.value
  const stashResult = await stashChanges(
    `Auto-stash before switching to ${branch}`
  )
  if (!stashResult.success) {
    toast.error(stashResult.error || t("workspace.git_checkout_failed"))
    return
  }
  closeCheckoutConfirm()
  await runCheckout(branch)
}

async function handleCheckoutWithDiscard() {
  if (!pendingCheckoutBranch.value) return
  const branch = pendingCheckoutBranch.value
  const discardResult = await discardChanges()
  if (!discardResult.success) {
    toast.error(discardResult.error || t("workspace.git_checkout_failed"))
    return
  }
  closeCheckoutConfirm()
  await runCheckout(branch)
}
</script>
