<template>
  <AukSmartModal :title="t('workspace.edit')" @close="emit('close')">
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Workspace Name -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-secondaryLight">
            {{ t("workspace.name") }}
          </label>
          <AukSmartInput
            v-model="workspaceName"
            :placeholder="t('workspace.name_placeholder')"
          />
        </div>

        <!-- Workspace Path (Read-only) -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-secondaryLight">
            {{ t("workspace.path") }}
          </label>
          <div
            class="px-3 py-2 rounded-lg bg-primaryDark text-secondaryLight text-sm"
          >
            {{ workspace.path }}
          </div>
          <p class="text-xs text-secondaryDark">
            {{ t("workspace.path_readonly_hint") }}
          </p>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-secondaryLight">
            {{ t("workspace.description") }}
            <span class="text-secondaryDark">({{ t("state.optional") }})</span>
          </label>
          <AukSmartInput
            v-model="workspaceDescription"
            :placeholder="t('workspace.description_placeholder')"
          />
        </div>

        <!-- Git Configuration -->
        <div class="flex flex-col gap-3 p-3 rounded-lg bg-primaryLight">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <IconGitBranch class="w-4 h-4 text-secondaryLight" />
              <span class="text-sm font-medium text-secondary">
                {{ t("workspace.sync_label") }}
              </span>
            </div>
            <AukSmartToggle
              :on="gitEnabled"
              :disabled="isCheckingGit"
              @change="gitEnabled = !gitEnabled"
            />
          </div>
          <p class="text-xs text-secondaryLight">
            {{ t("workspace.sync_description") }}
          </p>

          <!-- Git Not Available Warning -->
          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div
              v-if="gitAvailability && !gitAvailability.available"
              class="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <IconAlertTriangle
                class="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
              />
              <div class="flex flex-col gap-1">
                <p class="text-sm font-medium text-amber-400">
                  {{ t("workspace.git_not_available") }}
                </p>
                <p class="text-xs text-amber-400/80">
                  {{ t("workspace.git_not_available_hint") }}
                </p>
              </div>
            </div>
          </transition>

          <!-- Git Version Info -->
          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <p
              v-if="gitAvailability?.available && gitAvailability.version"
              class="text-xs text-secondaryLight"
            >
              {{
                t("workspace.git_version", { version: gitAvailability.version })
              }}
            </p>
          </transition>

          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div v-if="gitEnabled" class="flex flex-col gap-3 mt-2">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-medium text-secondaryLight">
                  {{ t("workspace.sync_remote") }}
                </label>
                <AukButtonSecondary
                  :label="t('workspace.git_setup_wizard')"
                  class="self-start"
                  @click="showSetupWizard = true"
                />
                <AukSmartInput
                  v-model="gitRemote"
                  :placeholder="t('workspace.sync_remote_placeholder')"
                />
                <div class="flex items-center gap-2">
                  <AukButtonSecondary
                    :label="t('workspace.sync_test_connection')"
                    :loading="isTestingRemote"
                    :disabled="!gitRemote.trim() || isTestingRemote"
                    @click="handleTestRemote"
                  />
                  <span
                    v-if="testRemoteResult"
                    class="text-xs"
                    :class="
                      testRemoteResult.success
                        ? 'text-green-500'
                        : 'text-red-500'
                    "
                  >
                    {{
                      testRemoteResult.success
                        ? t("workspace.sync_test_success")
                        : t("workspace.sync_test_failed")
                    }}
                  </span>
                </div>
                <p
                  v-if="
                    testRemoteResult &&
                    !testRemoteResult.success &&
                    testRemoteResult.error
                  "
                  class="text-xs text-secondaryDark"
                >
                  {{ testRemoteResult.error }}
                </p>
              </div>

              <AukButtonSecondary
                :label="t('workspace.sync_advanced')"
                :icon="showAdvanced ? IconChevronDown : IconChevronRight"
                class="self-start"
                @click="showAdvanced = !showAdvanced"
              />

              <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="showAdvanced" class="flex flex-col gap-3 mt-1">
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-medium text-secondaryLight">
                      {{ t("workspace.sync_branch") }}
                    </label>
                    <AukSmartInput v-model="gitBranch" placeholder="main" />
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-xs text-secondaryLight">
                      {{ t("workspace.sync_auto") }}
                    </span>
                    <AukSmartToggle
                      :on="gitAutoSync"
                      @change="gitAutoSync = !gitAutoSync"
                    />
                  </div>

                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-medium text-secondaryLight">
                      {{ t("workspace.sync_interval") }}
                    </label>
                    <AukSmartInput
                      v-model.number="gitSyncInterval"
                      type="number"
                      :placeholder="'300'"
                    />
                    <p class="text-xs text-secondaryDark">
                      {{ t("workspace.sync_interval_hint") }}
                    </p>
                  </div>

                  <GitAuthMethodSelector
                    :model-value="gitAuthMethod"
                    :token="gitToken"
                    :oauth-account-id="gitOAuthAccountId"
                    @update:model-value="handleAuthMethodChange"
                    @update:token="gitToken = $event"
                    @update:oauth-account-id="gitOAuthAccountId = $event"
                    @open-o-auth-modal="showOAuthModal = true"
                  />
                  <p
                    v-if="recommendedAuthLabel"
                    class="text-xs text-secondaryDark"
                  >
                    {{
                      t("workspace.git_auth_recommended", {
                        method: recommendedAuthLabel,
                      })
                    }}
                  </p>
                </div>
              </transition>
            </div>
          </transition>
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
          :label="t('action.cancel')"
          @click="emit('close')"
        />
        <AukButtonPrimary
          :label="t('action.save')"
          :loading="isSaving"
          :disabled="!isValid"
          @click="handleSave"
        />
      </div>
    </template>
  </AukSmartModal>

  <GitOAuthModal :show="showOAuthModal" @close="showOAuthModal = false" />

  <GitSetupWizardModal
    :show="showSetupWizard"
    :initial-remote="gitRemote"
    :initial-auth-method="gitAuthMethod"
    :initial-token="gitToken"
    :initial-oauth-account-id="gitOAuthAccountId"
    @close="showSetupWizard = false"
    @apply="handleWizardApply"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useWorkspaceStore, type Workspace } from "~/store/workspace"
import {
  getGitService,
  type GitAvailability,
  type GitCredentials,
  type GitRemoteTestResult,
} from "~/services/git"
import IconGitBranch from "~icons/lucide/git-branch"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconChevronRight from "~icons/lucide/chevron-right"
import GitAuthMethodSelector from "./GitAuthMethodSelector.vue"
import GitOAuthModal from "./GitOAuthModal.vue"
import GitSetupWizardModal from "./GitSetupWizardModal.vue"

const props = defineProps<{
  workspace: Workspace
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "updated"): void
}>()

const t = useI18n()
const { updateWorkspace } = useWorkspaceStore()

// Form state
const workspaceName = ref("")
const workspaceDescription = ref("")
const gitEnabled = ref(false)
const gitRemote = ref("")
const gitBranch = ref("main")
const gitAutoSync = ref(true)
const gitSyncInterval = ref(300)
const gitAuthMethod = ref<"none" | "https" | "oauth" | "ssh">("ssh")
const gitToken = ref("")
const gitOAuthAccountId = ref<string | undefined>(undefined)
const showOAuthModal = ref(false)
const showAdvanced = ref(false)
const showSetupWizard = ref(false)
const isAuthTouched = ref(false)
const hasInitializedRemote = ref(false)
const isTestingRemote = ref(false)
const testRemoteResult = ref<GitRemoteTestResult | null>(null)

// UI state
const isSaving = ref(false)
const errorMessage = ref("")

// Git availability state
const gitAvailability = ref<GitAvailability | null>(null)
const isCheckingGit = ref(false)

// Check Git availability when user tries to enable Git
watch(gitEnabled, async (enabled) => {
  if (enabled && gitAvailability.value === null) {
    await checkGitAvailability()
  }
})

watch(gitRemote, (remote) => {
  if (!hasInitializedRemote.value) {
    hasInitializedRemote.value = true
    return
  }
  if (isAuthTouched.value) return
  const recommended = getRecommendedAuthMethod(remote)
  if (
    recommended &&
    recommended !== "oauth" &&
    recommended !== gitAuthMethod.value
  ) {
    gitAuthMethod.value = recommended
  }
})

async function checkGitAvailability() {
  isCheckingGit.value = true
  try {
    const gitService = getGitService()
    gitAvailability.value = await gitService.isAvailable()

    // If Git is not available, disable the toggle and show warning
    if (!gitAvailability.value.available) {
      gitEnabled.value = false
    }
  } catch (error) {
    gitAvailability.value = {
      available: false,
      error: error instanceof Error ? error.message : "Failed to check Git",
    }
    gitEnabled.value = false
  } finally {
    isCheckingGit.value = false
  }
}

// Initialize form with workspace data
onMounted(async () => {
  workspaceName.value = props.workspace.name
  workspaceDescription.value = props.workspace.description || ""
  gitEnabled.value = props.workspace.git?.enabled || false
  gitRemote.value = props.workspace.git?.remote || ""
  gitBranch.value = props.workspace.git?.branch || "main"
  gitAutoSync.value = props.workspace.git?.autoSync ?? true
  gitSyncInterval.value = props.workspace.git?.syncInterval || 300
  gitAuthMethod.value = props.workspace.git?.authMethod ?? "ssh"
  gitToken.value = props.workspace.git?.token || ""
  gitOAuthAccountId.value = props.workspace.git?.oauthAccountId

  // If Git is already enabled, check availability
  if (gitEnabled.value) {
    await checkGitAvailability()
  }
})

// Validation
const isValid = computed(() => {
  return workspaceName.value.trim().length > 0
})

const recommendedAuthLabel = computed(() => {
  const recommended = getRecommendedAuthMethod(gitRemote.value)
  if (!recommended) return null
  if (recommended === "https") return t("workspace.git_auth_token")
  if (recommended === "oauth") return "OAuth"
  return "SSH"
})

function getRecommendedAuthMethod(
  remote: string
): "ssh" | "https" | "oauth" | null {
  const value = remote.trim()
  if (!value) return null
  if (
    value.startsWith("https://") &&
    /(github\.com|gitlab\.com|gitee\.com|bitbucket\.org)/.test(value)
  ) {
    return "oauth"
  }
  if (value.startsWith("git@") || value.startsWith("ssh://")) return "ssh"
  if (value.startsWith("http://") || value.startsWith("https://"))
    return "https"
  return null
}

function handleAuthMethodChange(method: "none" | "https" | "oauth" | "ssh") {
  isAuthTouched.value = true
  gitAuthMethod.value = method
}

function handleWizardApply(data: {
  remote: string
  authMethod: "none" | "https" | "oauth" | "ssh"
  token?: string
  oauthAccountId?: string
}) {
  isAuthTouched.value = true
  gitRemote.value = data.remote
  gitAuthMethod.value = data.authMethod
  gitToken.value = data.token ?? ""
  gitOAuthAccountId.value = data.oauthAccountId
}

function getCredentialsFromForm(): GitCredentials | undefined {
  if (gitAuthMethod.value === "https" && gitToken.value.trim()) {
    return { type: "https", token: gitToken.value.trim() }
  }
  if (gitAuthMethod.value === "oauth" && gitOAuthAccountId.value) {
    return { type: "oauth", oauthAccountId: gitOAuthAccountId.value }
  }
  return undefined
}

async function handleTestRemote() {
  const remote = gitRemote.value.trim()
  if (!remote) return
  isTestingRemote.value = true
  testRemoteResult.value = null
  try {
    const gitService = getGitService()
    testRemoteResult.value = await gitService.testRemote(
      remote,
      getCredentialsFromForm()
    )
  } catch (error) {
    testRemoteResult.value = {
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    }
  } finally {
    isTestingRemote.value = false
  }
}

// Save workspace
async function handleSave() {
  if (!isValid.value) return

  isSaving.value = true
  errorMessage.value = ""

  try {
    await updateWorkspace(props.workspace.id, {
      name: workspaceName.value.trim(),
      description: workspaceDescription.value.trim() || undefined,
      git: gitEnabled.value
        ? {
            enabled: true,
            remote: gitRemote.value.trim() || undefined,
            branch: gitBranch.value.trim() || "main",
            autoSync: gitAutoSync.value,
            syncInterval: gitSyncInterval.value,
            authMethod: gitAuthMethod.value,
            token:
              gitAuthMethod.value === "https"
                ? gitToken.value.trim() || undefined
                : undefined,
            oauthAccountId:
              gitAuthMethod.value === "oauth"
                ? gitOAuthAccountId.value
                : undefined,
          }
        : {
            enabled: false,
            branch: "main",
            autoSync: false,
            syncInterval: 300,
            authMethod: "none",
          },
    })

    emit("updated")
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("workspace.update_error")
  } finally {
    isSaving.value = false
  }
}
</script>
