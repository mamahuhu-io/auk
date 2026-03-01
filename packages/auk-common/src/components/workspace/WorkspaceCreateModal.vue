<template>
  <AukSmartModal :title="t('workspace.create_new')" @close="emit('close')">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="text-xs text-secondaryLight">
          {{
            t("workspace.create_step_indicator", {
              current: currentStep,
              total: totalSteps,
            })
          }}
        </div>

        <div v-if="currentStep === 1" class="flex flex-col gap-4">
          <div class="text-sm font-medium text-secondary">
            {{ t("workspace.create_step_source_title") }}
          </div>
          <div class="flex flex-col gap-2">
            <button
              class="flex items-start gap-3 p-3 rounded-lg border transition-colors"
              :class="sourceCardClass('blank')"
              @click="selectedSource = 'blank'"
            >
              <IconSquarePlus class="w-5 h-5 mt-0.5 text-secondaryLight" />
              <div class="flex flex-col text-left">
                <span class="text-sm font-medium text-secondary">
                  {{ t("workspace.create_source_blank") }}
                </span>
                <span class="text-xs text-secondaryLight">
                  {{ t("workspace.create_source_blank_desc") }}
                </span>
              </div>
            </button>
            <button
              class="flex items-start gap-3 p-3 rounded-lg border transition-colors"
              :class="sourceCardClass('existing')"
              @click="selectedSource = 'existing'"
            >
              <IconFolderOpen class="w-5 h-5 mt-0.5 text-secondaryLight" />
              <div class="flex flex-col text-left">
                <span class="text-sm font-medium text-secondary">
                  {{ t("workspace.create_source_existing") }}
                </span>
                <span class="text-xs text-secondaryLight">
                  {{ t("workspace.create_source_existing_desc") }}
                </span>
              </div>
            </button>
            <button
              class="flex items-start gap-3 p-3 rounded-lg border transition-colors"
              :class="sourceCardClass('git')"
              @click="selectedSource = 'git'"
            >
              <IconCloud class="w-5 h-5 mt-0.5 text-secondaryLight" />
              <div class="flex flex-col text-left">
                <span class="text-sm font-medium text-secondary">
                  {{ t("workspace.create_source_git") }}
                </span>
                <span class="text-xs text-secondaryLight">
                  {{ t("workspace.create_source_git_desc") }}
                </span>
              </div>
            </button>
            <div
              v-if="selectedSource === 'git'"
              class="ml-8 flex flex-col gap-2"
            >
              <button
                class="flex flex-col items-start gap-1 p-2 rounded border transition-colors text-left"
                :class="gitModeCardClass('local')"
                @click="gitProjectMode = 'local'"
              >
                <span class="text-xs font-medium text-secondary">
                  {{ t("workspace.create_git_mode_local") }}
                </span>
                <span class="text-xs text-secondaryLight">
                  {{ t("workspace.create_git_mode_local_desc") }}
                </span>
              </button>
              <button
                class="flex flex-col items-start gap-1 p-2 rounded border transition-colors text-left"
                :class="gitModeCardClass('clone')"
                @click="gitProjectMode = 'clone'"
              >
                <span class="text-xs font-medium text-secondary">
                  {{ t("workspace.create_git_mode_clone") }}
                </span>
                <span class="text-xs text-secondaryLight">
                  {{ t("workspace.create_git_mode_clone_desc") }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 2" class="flex flex-col gap-4">
          <div class="text-sm font-medium text-secondary">
            {{ t("workspace.create_step_details_title") }}
          </div>

          <!-- Workspace Name -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-secondaryLight">
              {{ t("workspace.name") }}
            </label>
            <AukSmartInput
              v-model="workspaceName"
              :placeholder="t('workspace.name_placeholder')"
              :autofocus="true"
            />
          </div>

          <!-- Workspace Path -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-secondaryLight">
              {{ t("workspace.path") }}
            </label>
            <div class="flex gap-2">
              <AukSmartInput
                :model-value="workspacePath"
                readonly
                :placeholder="t('workspace.path_placeholder')"
                class="flex-1"
              />
              <AukButtonSecondary
                :label="t('workspace.select_folder')"
                @click="selectFolder"
              />
            </div>
            <p class="text-xs text-secondaryLight">
              {{ t("workspace.path_hint") }}
            </p>
            <p v-if="pathTaken" class="text-xs text-red-400">
              {{ t("workspace.path_in_use") }}
            </p>
            <div
              v-else-if="pathStatus.nonEmpty || pathStatus.hasGit"
              class="flex items-start gap-2 p-2 rounded bg-amber-500/10 text-amber-400 text-xs"
            >
              <IconAlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
              <div class="flex flex-col gap-1">
                <span v-if="pathStatus.nonEmpty">
                  {{ t("workspace.path_existing_warning") }}
                </span>
                <span v-if="pathStatus.hasGit">
                  {{ t("workspace.path_git_warning") }}
                </span>
              </div>
            </div>
            <div
              v-if="
                selectedSource === 'git' &&
                gitProjectMode === 'local' &&
                pathStatus.hasGit
              "
              class="flex flex-col gap-1 p-2 rounded bg-green-500/10 text-green-400 text-xs"
            >
              <span>{{ t("workspace.create_git_detected") }}</span>
              <span v-if="gitProbe.checking">
                {{ t("workspace.create_git_detecting") }}
              </span>
              <span v-if="!gitProbe.checking && gitProbe.remote">
                {{
                  t("workspace.create_git_remote_detected", {
                    remote: gitProbe.remote,
                  })
                }}
              </span>
              <span v-if="!gitProbe.checking && gitProbe.branch">
                {{
                  t("workspace.create_git_branch_detected", {
                    branch: gitProbe.branch,
                  })
                }}
              </span>
              <span v-if="gitProbe.error" class="text-amber-400">
                {{ t("workspace.create_git_probe_failed") }}
              </span>
            </div>
            <p
              v-if="
                selectedSource === 'git' &&
                gitProjectMode === 'clone' &&
                pathStatus.nonEmpty
              "
              class="text-xs text-red-400"
            >
              {{ t("workspace.create_git_clone_path_must_be_empty") }}
            </p>
          </div>

          <div
            v-if="selectedSource === 'git' && gitProjectMode === 'clone'"
            class="flex flex-col gap-2"
          >
            <label class="text-sm font-medium text-secondaryLight">
              {{ t("workspace.sync_remote") }}
            </label>
            <AukSmartInput
              v-model="gitCloneRemote"
              :placeholder="t('workspace.create_git_clone_remote_placeholder')"
            />
            <div class="flex items-center gap-2">
              <AukButtonSecondary
                :label="t('workspace.sync_test_connection')"
                :loading="isTestingCloneRemote"
                :disabled="!gitCloneRemote.trim() || isTestingCloneRemote"
                @click="handleTestCloneRemote"
              />
              <span
                v-if="testCloneRemoteResult"
                class="text-xs"
                :class="
                  testCloneRemoteResult.success
                    ? 'text-green-500'
                    : 'text-red-500'
                "
              >
                {{
                  testCloneRemoteResult.success
                    ? t("workspace.sync_test_success")
                    : t("workspace.sync_test_failed")
                }}
              </span>
            </div>
            <p
              v-if="
                testCloneRemoteResult &&
                !testCloneRemoteResult.success &&
                testCloneRemoteResult.error
              "
              class="text-xs text-secondaryDark"
            >
              {{ testCloneRemoteResult.error }}
            </p>
            <p class="text-xs text-secondaryLight">
              {{ t("workspace.create_git_clone_remote_hint") }}
            </p>
          </div>

          <!-- Description (Optional) -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-secondaryLight">
              {{ t("workspace.description") }}
              <span class="text-secondaryDark"
                >({{ t("state.optional") }})</span
              >
            </label>
            <AukSmartInput
              v-model="workspaceDescription"
              :placeholder="t('workspace.description_placeholder')"
            />
          </div>
        </div>

        <div v-else class="flex flex-col gap-4">
          <div class="text-sm font-medium text-secondary">
            {{ t("workspace.create_step_review_title") }}
          </div>
          <div class="flex flex-col gap-3 p-3 rounded-lg bg-primaryLight">
            <div class="flex items-center justify-between">
              <span class="text-xs text-secondaryLight">
                {{ t("workspace.create_source_label") }}
              </span>
              <span class="text-sm text-secondary">
                {{ selectedSourceLabel }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-secondaryLight">{{
                t("workspace.name")
              }}</span>
              <span class="text-sm text-secondary">{{ workspaceName }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-secondaryLight">{{
                t("workspace.path")
              }}</span>
              <span class="text-sm text-secondary truncate max-w-[240px]">{{
                workspacePath
              }}</span>
            </div>
            <div
              v-if="workspaceDescription"
              class="flex items-center justify-between"
            >
              <span class="text-xs text-secondaryLight">{{
                t("workspace.description")
              }}</span>
              <span class="text-sm text-secondary truncate max-w-[240px]">{{
                workspaceDescription
              }}</span>
            </div>
          </div>
          <p class="text-xs text-secondaryLight">
            {{ t("workspace.create_sync_setup_hint") }}
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          <p class="text-sm text-red-400">{{ errorMessage }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <AukButtonSecondary
          :label="currentStep === 1 ? t('action.cancel') : t('action.back')"
          @click="handleBack"
        />
        <AukButtonPrimary
          :label="
            currentStep === totalSteps
              ? t('workspace.create')
              : t('action.next')
          "
          :loading="isCreating"
          :disabled="!canProceed"
          @click="handleNext"
        />
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useWorkspaceStore } from "~/store/workspace"
import IconSquarePlus from "~icons/lucide/square-plus"
import IconFolderOpen from "~icons/lucide/folder-open"
import IconCloud from "~icons/lucide/cloud"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { useToast } from "~/composables/toast"
import { getFileSystem } from "~/services/workspace-storage/filesystem"
import { getGitService } from "~/services/git"
import { selectDirectory } from "~/platform/capabilities"

const emit = defineEmits<{
  (e: "close"): void
  (e: "created", payload: { openSyncCenter: boolean }): void
}>()

const t = useI18n()
const { createWorkspace, workspaces } = useWorkspaceStore()
const toast = useToast()
const fs = getFileSystem()

// Form state
const workspaceName = ref("")
const workspacePath = ref("")
const workspaceDescription = ref("")
const selectedSource = ref<"blank" | "existing" | "git">("blank")
const gitProjectMode = ref<"local" | "clone">("local")
const gitCloneRemote = ref("")
const pathStatus = ref({
  checking: false,
  exists: false,
  nonEmpty: false,
  hasGit: false,
  error: "",
})

// Wizard state
const currentStep = ref(1)
const totalSteps = 3

// UI state
const isCreating = ref(false)
const errorMessage = ref("")
const pathCheckSeq = ref(0)
const gitProbeSeq = ref(0)
const autoGitSourcePath = ref("")
const isTestingCloneRemote = ref(false)
const testCloneRemoteResult = ref<{
  success: boolean
  error?: string
} | null>(null)
const gitProbe = ref({
  checking: false,
  remote: "",
  branch: "",
  error: "",
})

// Validation
const canProceed = computed(() => {
  if (currentStep.value === 1) return !!selectedSource.value
  if (currentStep.value === 2) {
    const isCloneMode =
      selectedSource.value === "git" && gitProjectMode.value === "clone"
    return (
      workspaceName.value.trim().length > 0 &&
      workspacePath.value.trim().length > 0 &&
      !pathTaken.value &&
      (!isCloneMode || gitCloneRemote.value.trim().length > 0) &&
      (!isCloneMode || !pathStatus.value.nonEmpty)
    )
  }
  return true
})

const selectedSourceLabel = computed(() => {
  if (selectedSource.value === "existing")
    return t("workspace.create_source_existing")
  if (selectedSource.value === "git") {
    return gitProjectMode.value === "local"
      ? t("workspace.create_git_mode_local")
      : t("workspace.create_git_mode_clone")
  }
  return t("workspace.create_source_blank")
})

const normalizedPath = computed(() => normalizePath(workspacePath.value))

const pathTaken = computed(() => {
  if (!normalizedPath.value) return false
  return workspaces.value.some(
    (workspace) => normalizePath(workspace.path) === normalizedPath.value
  )
})

// Select folder - desktop file system
async function selectFolder() {
  try {
    const selected = await selectDirectory(t("workspace.select_path"))
    if (selected) {
      workspacePath.value = selected
    }
    return
  } catch (e) {
    console.error("Failed to resolve desktop path:", e)
  }
}

watch(workspacePath, async (value) => {
  if (!value.trim()) {
    pathStatus.value = {
      checking: false,
      exists: false,
      nonEmpty: false,
      hasGit: false,
      error: "",
    }
    gitProbe.value = {
      checking: false,
      remote: "",
      branch: "",
      error: "",
    }
    autoGitSourcePath.value = ""
    return
  }

  const seq = ++pathCheckSeq.value
  pathStatus.value = {
    checking: true,
    exists: false,
    nonEmpty: false,
    hasGit: false,
    error: "",
  }

  try {
    const exists = await fs.dirExists(value)
    let nonEmpty = false
    let hasGit = false

    if (exists) {
      const entries = await fs.readDir(value)
      nonEmpty = entries.length > 0
      hasGit =
        (await fs.dirExists(fs.joinPath(value, ".git"))) ||
        (await fs.fileExists(fs.joinPath(value, ".git")))
    }

    if (seq === pathCheckSeq.value) {
      pathStatus.value = {
        checking: false,
        exists,
        nonEmpty,
        hasGit,
        error: "",
      }

      if (hasGit && normalizePath(value) !== autoGitSourcePath.value) {
        if (selectedSource.value === "existing") {
          selectedSource.value = "git"
          gitProjectMode.value = "local"
        }
        autoGitSourcePath.value = normalizePath(value)
      }

      if (hasGit) {
        await probeGitRepo(value, seq)
      } else {
        gitProbe.value = {
          checking: false,
          remote: "",
          branch: "",
          error: "",
        }
      }
    }
  } catch (error) {
    if (seq === pathCheckSeq.value) {
      pathStatus.value = {
        checking: false,
        exists: false,
        nonEmpty: false,
        hasGit: false,
        error: error instanceof Error ? error.message : "Path check failed",
      }
    }
  }
})

watch(gitCloneRemote, () => {
  testCloneRemoteResult.value = null
})

function handleBack() {
  if (currentStep.value === 1) {
    emit("close")
    return
  }
  currentStep.value = Math.max(1, currentStep.value - 1)
}

async function handleNext() {
  if (!canProceed.value) return
  if (currentStep.value < totalSteps) {
    currentStep.value += 1
    return
  }
  await handleCreate()
}

function sourceCardClass(value: "blank" | "existing" | "git") {
  return selectedSource.value === value
    ? "border-accent bg-accentLight/30"
    : "border-dividerLight bg-primaryLight hover:bg-primaryDark"
}

function gitModeCardClass(value: "local" | "clone") {
  return gitProjectMode.value === value
    ? "border-accent bg-accentLight/30"
    : "border-dividerLight bg-primaryLight hover:bg-primaryDark"
}

function normalizePath(value: string) {
  return value.trim().replace(/[\\/]+$/, "")
}

async function probeGitRepo(path: string, pathSeq: number) {
  const probeSeq = ++gitProbeSeq.value
  gitProbe.value = {
    checking: true,
    remote: "",
    branch: "",
    error: "",
  }

  try {
    const gitService = getGitService()
    const availability = await gitService.isAvailable()
    if (!availability.available) {
      if (pathSeq === pathCheckSeq.value && probeSeq === gitProbeSeq.value) {
        gitProbe.value = {
          checking: false,
          remote: "",
          branch: "",
          error: "GIT_UNAVAILABLE",
        }
      }
      return
    }

    const isRepo = await gitService.isRepo(path)
    if (!isRepo) {
      if (pathSeq === pathCheckSeq.value && probeSeq === gitProbeSeq.value) {
        gitProbe.value = {
          checking: false,
          remote: "",
          branch: "",
          error: "",
        }
      }
      return
    }

    const [remote, branch] = await Promise.all([
      gitService.getRemote(path, "origin"),
      gitService.getCurrentBranch(path),
    ])

    if (pathSeq === pathCheckSeq.value && probeSeq === gitProbeSeq.value) {
      gitProbe.value = {
        checking: false,
        remote: remote || "",
        branch: branch || "",
        error: "",
      }
    }
  } catch (error) {
    if (pathSeq === pathCheckSeq.value && probeSeq === gitProbeSeq.value) {
      gitProbe.value = {
        checking: false,
        remote: "",
        branch: "",
        error: error instanceof Error ? error.message : "GIT_PROBE_FAILED",
      }
    }
  }
}

function resolveAuthMethod(remote: string) {
  const trimmedRemote = remote.trim()
  if (!trimmedRemote) return "none" as const
  if (trimmedRemote.startsWith("git@") || trimmedRemote.startsWith("ssh://")) {
    return "ssh" as const
  }
  return "none" as const
}

async function handleTestCloneRemote() {
  const remoteUrl = gitCloneRemote.value.trim()
  if (!remoteUrl) return

  isTestingCloneRemote.value = true
  testCloneRemoteResult.value = null

  try {
    const gitService = getGitService()
    testCloneRemoteResult.value = await gitService.testRemote(remoteUrl)
  } catch (error) {
    testCloneRemoteResult.value = {
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    }
  } finally {
    isTestingCloneRemote.value = false
  }
}

// Create workspace
async function handleCreate() {
  if (!canProceed.value) return

  isCreating.value = true
  errorMessage.value = ""

  try {
    let gitOptions:
      | {
          enabled: true
          remote?: string
          branch: string
          autoSync: true
          syncInterval: number
          authMethod: "none" | "ssh"
        }
      | undefined

    if (selectedSource.value === "git") {
      if (gitProjectMode.value === "clone") {
        const remoteUrl = gitCloneRemote.value.trim()
        const gitService = getGitService()
        const availability = await gitService.isAvailable()
        if (!availability.available) {
          throw new Error(t("workspace.git_not_available"))
        }

        await gitService.clone(remoteUrl, workspacePath.value.trim())

        const [detectedRemote, detectedBranch] = await Promise.all([
          gitService.getRemote(workspacePath.value.trim(), "origin"),
          gitService.getCurrentBranch(workspacePath.value.trim()),
        ])

        const remote = detectedRemote || remoteUrl
        gitOptions = {
          enabled: true,
          remote,
          branch: detectedBranch || "main",
          autoSync: true,
          syncInterval: 300,
          authMethod: resolveAuthMethod(remote),
        }
      } else {
        gitOptions = {
          enabled: true,
          remote: gitProbe.value.remote || undefined,
          branch: gitProbe.value.branch || "main",
          autoSync: true,
          syncInterval: 300,
          authMethod: resolveAuthMethod(gitProbe.value.remote),
        }
      }
    }

    await createWorkspace(
      workspaceName.value.trim(),
      workspacePath.value.trim(),
      {
        description: workspaceDescription.value.trim() || undefined,
        git: gitOptions,
      }
    )

    emit("created", { openSyncCenter: selectedSource.value === "git" })
    toast.success(t("workspace.created_sync_hint"))
  } catch (error) {
    if (
      selectedSource.value === "git" &&
      gitProjectMode.value === "clone" &&
      error instanceof Error &&
      error.message !== "WORKSPACE_PATH_IN_USE"
    ) {
      errorMessage.value = t("workspace.create_git_clone_failed")
      return
    }
    if (error instanceof Error && error.message === "WORKSPACE_PATH_IN_USE") {
      errorMessage.value = t("workspace.path_in_use")
    } else {
      errorMessage.value =
        error instanceof Error ? error.message : t("workspace.create_error")
    }
  } finally {
    isCreating.value = false
  }
}
</script>
