<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.git_setup_wizard_title')"
    styles="sm:max-w-2xl"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Step Indicator -->
        <div class="flex items-center gap-2 text-xs text-secondaryLight">
          <span :class="step === 0 ? 'text-accent' : ''">1</span>
          <span>{{ t("workspace.git_setup_step_service") }}</span>
          <span>·</span>
          <span :class="step === 1 ? 'text-accent' : ''">2</span>
          <span>{{ t("workspace.git_setup_step_auth") }}</span>
          <span>·</span>
          <span :class="step === 2 ? 'text-accent' : ''">3</span>
          <span>{{ t("workspace.git_setup_step_test") }}</span>
        </div>

        <!-- Step 1: Service -->
        <div v-if="step === 0" class="flex flex-col gap-3">
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium text-secondaryLight">
              {{ t("workspace.git_setup_provider") }}
            </span>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="item in providers"
                :key="item.id"
                class="p-2 rounded-lg border text-xs transition-colors"
                :class="
                  provider === item.id
                    ? 'border-accent bg-accent/10'
                    : 'border-dividerLight hover:border-accent/50'
                "
                @click="provider = item.id"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div v-if="provider !== 'custom'" class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="text-xs text-secondaryLight">{{
                t("workspace.git_setup_protocol")
              }}</span>
              <div class="flex items-center gap-2">
                <AukButtonSecondary
                  :label="t('workspace.git_setup_protocol_https')"
                  :disabled="protocol === 'https'"
                  @click="protocol = 'https'"
                />
                <AukButtonSecondary
                  :label="t('workspace.git_setup_protocol_ssh')"
                  :disabled="protocol === 'ssh'"
                  @click="protocol = 'ssh'"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <AukSmartInput
                v-model="owner"
                :placeholder="t('workspace.git_setup_owner_placeholder')"
              />
              <AukSmartInput
                v-model="repo"
                :placeholder="t('workspace.git_setup_repo_placeholder')"
              />
            </div>
          </div>

          <div v-else class="flex flex-col gap-2">
            <AukSmartInput
              v-model="customUrl"
              :placeholder="t('workspace.sync_remote_placeholder')"
            />
          </div>

          <div class="text-xs text-secondaryLight">
            {{ t("workspace.git_setup_remote_preview") }}:
            <span class="text-secondary">{{ remotePreview || "-" }}</span>
          </div>
        </div>

        <!-- Step 2: Auth -->
        <div v-else-if="step === 1" class="flex flex-col gap-3">
          <GitAuthMethodSelector
            :model-value="authMethod"
            :token="token"
            :oauth-account-id="oauthAccountId"
            @update:model-value="authMethod = $event"
            @update:token="token = $event"
            @update:oauth-account-id="oauthAccountId = $event"
            @open-o-auth-modal="showOAuthModal = true"
          />
          <p v-if="recommendedAuthLabel" class="text-xs text-secondaryDark">
            {{
              t("workspace.git_auth_recommended", {
                method: recommendedAuthLabel,
              })
            }}
          </p>
        </div>

        <!-- Step 3: Test -->
        <div v-else class="flex flex-col gap-3">
          <div class="text-sm text-secondaryLight">
            {{ t("workspace.git_setup_test_hint") }}
          </div>
          <div class="flex items-center gap-2">
            <AukButtonSecondary
              :label="t('workspace.sync_test_connection')"
              :loading="isTesting"
              :disabled="!remotePreview || isTesting"
              @click="handleTest"
            />
            <span
              v-if="testResult"
              class="text-xs"
              :class="testResult.success ? 'text-green-500' : 'text-red-500'"
            >
              {{
                testResult.success
                  ? t("workspace.sync_test_success")
                  : t("workspace.sync_test_failed")
              }}
            </span>
          </div>
          <p
            v-if="testResult && !testResult.success && testResult.error"
            class="text-xs text-secondaryDark"
          >
            {{ testResult.error }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <AukButtonSecondary
          :label="t('action.back')"
          :disabled="step === 0"
          @click="step = Math.max(0, step - 1)"
        />
        <div class="flex gap-2">
          <AukButtonSecondary
            v-if="step < 2"
            :label="t('action.next')"
            :disabled="step === 0 && !remotePreview"
            @click="step = Math.min(2, step + 1)"
          />
          <AukButtonPrimary
            v-else
            :label="t('action.apply')"
            :disabled="!remotePreview"
            @click="applyAndClose"
          />
        </div>
      </div>
    </template>
  </AukSmartModal>

  <GitOAuthModal :show="showOAuthModal" @close="showOAuthModal = false" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { getGitService } from "~/services/git/tauri-git"
import type { GitRemoteTestResult, GitCredentials } from "~/services/git/types"
import GitAuthMethodSelector from "./GitAuthMethodSelector.vue"
import GitOAuthModal from "./GitOAuthModal.vue"

const props = defineProps<{
  show: boolean
  initialRemote?: string
  initialAuthMethod?: "none" | "https" | "oauth" | "ssh"
  initialToken?: string
  initialOAuthAccountId?: string
}>()

const emit = defineEmits<{
  (e: "close"): void
  (
    e: "apply",
    data: {
      remote: string
      authMethod: "none" | "https" | "oauth" | "ssh"
      token?: string
      oauthAccountId?: string
    }
  ): void
}>()

const t = useI18n()
const gitService = getGitService()

const step = ref(0)
const provider = ref<"github" | "gitlab" | "gitee" | "bitbucket" | "custom">(
  "github"
)
const protocol = ref<"https" | "ssh">("https")
const owner = ref("")
const repo = ref("")
const customUrl = ref("")
const authMethod = ref<"none" | "https" | "oauth" | "ssh">("ssh")
const token = ref("")
const oauthAccountId = ref<string | undefined>(undefined)
const showOAuthModal = ref(false)
const isTesting = ref(false)
const testResult = ref<GitRemoteTestResult | null>(null)

const providers = [
  { id: "github", label: "GitHub", host: "github.com" },
  { id: "gitlab", label: "GitLab", host: "gitlab.com" },
  { id: "gitee", label: "Gitee", host: "gitee.com" },
  { id: "bitbucket", label: "Bitbucket", host: "bitbucket.org" },
  { id: "custom", label: t("workspace.git_setup_provider_custom"), host: "" },
]

const host = computed(() => {
  const p = providers.find((p) => p.id === provider.value)
  return p?.host ?? ""
})

const remotePreview = computed(() => {
  if (provider.value === "custom") {
    return customUrl.value.trim()
  }
  if (!owner.value.trim() || !repo.value.trim()) return ""
  if (protocol.value === "ssh") {
    return `git@${host.value}:${owner.value.trim()}/${repo.value.trim()}.git`
  }
  return `https://${host.value}/${owner.value.trim()}/${repo.value.trim()}.git`
})

const recommendedAuthLabel = computed(() => {
  if (protocol.value === "ssh") return "SSH"
  if (provider.value !== "custom") return "OAuth"
  return t("workspace.git_auth_token")
})

watch(
  () => props.show,
  (show) => {
    if (!show) return
    step.value = 0
    testResult.value = null
    provider.value = "github"
    protocol.value = "https"
    owner.value = ""
    repo.value = ""
    customUrl.value = ""
    if (props.initialRemote) {
      if (props.initialRemote.startsWith("git@")) {
        protocol.value = "ssh"
      } else {
        protocol.value = "https"
      }
      customUrl.value = props.initialRemote
      provider.value = "custom"
    }
    authMethod.value = props.initialAuthMethod ?? "ssh"
    token.value = props.initialToken ?? ""
    oauthAccountId.value = props.initialOAuthAccountId
  }
)

function getCredentials(): GitCredentials | undefined {
  if (authMethod.value === "https" && token.value.trim()) {
    return { type: "https", token: token.value.trim() }
  }
  if (authMethod.value === "oauth" && oauthAccountId.value) {
    return { type: "oauth", oauthAccountId: oauthAccountId.value }
  }
  return undefined
}

async function handleTest() {
  if (!remotePreview.value) return
  isTesting.value = true
  testResult.value = null
  try {
    testResult.value = await gitService.testRemote(
      remotePreview.value,
      getCredentials()
    )
  } finally {
    isTesting.value = false
  }
}

function applyAndClose() {
  if (!remotePreview.value) return
  emit("apply", {
    remote: remotePreview.value,
    authMethod: authMethod.value,
    token: token.value.trim() || undefined,
    oauthAccountId: oauthAccountId.value,
  })
  emit("close")
}
</script>
