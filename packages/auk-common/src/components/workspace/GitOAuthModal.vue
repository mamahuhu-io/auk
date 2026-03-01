<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.git_oauth_accounts')"
    styles="sm:max-w-lg"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Provider Tabs -->
        <div class="flex border-b border-dividerLight">
          <button
            v-for="provider in providers"
            :key="provider.id"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="
              activeProvider === provider.id
                ? 'border-accent text-accent'
                : 'border-transparent text-secondaryLight hover:text-primaryDark'
            "
            @click.stop="activeProvider = provider.id"
          >
            <component :is="provider.icon" class="w-4 h-4" />
            {{ provider.name }}
            <span
              v-if="getProviderAccountCount(provider.id) > 0"
              class="px-1.5 py-0.5 text-xs rounded-full bg-accent/20"
            >
              {{ getProviderAccountCount(provider.id) }}
            </span>
          </button>
        </div>

        <!-- Account List -->
        <div class="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
          <div
            v-for="account in activeAccounts"
            :key="account.id"
            class="flex items-center gap-3 p-3 rounded-lg bg-primaryLight"
          >
            <!-- Avatar -->
            <img
              v-if="account.user.avatarUrl"
              :src="account.user.avatarUrl"
              :alt="account.user.username"
              class="w-10 h-10 rounded-full"
            />
            <div
              v-else
              class="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20 text-accent"
            >
              <IconUser class="w-5 h-5" />
            </div>

            <!-- User Info -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-primaryDark truncate">
                {{ account.user.name || account.user.username }}
              </div>
              <div class="text-xs text-secondaryLight truncate">
                @{{ account.user.username }}
                <span v-if="account.user.email">
                  · {{ account.user.email }}</span
                >
              </div>
            </div>

            <!-- Status & Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <span
                v-if="isExpired(account)"
                class="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500"
              >
                {{ t("workspace.git_oauth_expired") }}
              </span>
              <span
                v-else
                class="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-500"
              >
                {{ t("workspace.git_oauth_connected") }}
              </span>
              <AukButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.remove')"
                :icon="IconTrash"
                class="!text-red-500"
                @click="handleDisconnect(account.id)"
              />
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="!isHydrated"
            class="flex flex-col items-center justify-center py-8 text-secondaryLight"
          >
            <component
              :is="activeProviderConfig?.icon"
              class="w-12 h-12 mb-2 opacity-50 animate-pulse"
            />
            <span class="text-sm">
              {{ t("state.loading") }}
            </span>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="activeAccounts.length === 0"
            class="flex flex-col items-center justify-center py-8 text-secondaryLight"
          >
            <component
              :is="activeProviderConfig?.icon"
              class="w-12 h-12 mb-2 opacity-50"
            />
            <span class="text-sm">
              {{
                t("workspace.git_oauth_no_accounts", {
                  provider: activeProviderConfig?.name,
                })
              }}
            </span>
          </div>
        </div>

        <!-- Not Configured Warning -->
        <div
          v-if="!isProviderConfigured(activeProvider)"
          class="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-400"
        >
          <IconAlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
          <div class="text-sm">
            {{
              t("workspace.git_oauth_provider_not_configured", {
                provider: activeProviderConfig?.name,
              })
            }}
          </div>
        </div>

        <!-- Connect Button -->
        <div
          v-if="isProviderConfigured(activeProvider)"
          class="pt-3 border-t border-dividerLight flex flex-col gap-2"
        >
          <AukButtonPrimary
            :label="
              t('workspace.git_oauth_connect', {
                provider: activeProviderConfig?.name,
              })
            "
            :icon="activeProviderConfig?.icon"
            :loading="isAuthenticating && authProvider === activeProvider"
            class="w-full"
            @click="handleConnect"
          />
          <AukButtonSecondary
            v-if="isAuthenticating && authProvider === activeProvider"
            :label="t('action.cancel')"
            class="w-full"
            @click="cancelAuthentication"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <AukButtonSecondary :label="t('action.close')" @click="emit('close')" />
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, markRaw } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitOAuth } from "~/composables/useGitOAuth"
import type { GitOAuthProvider } from "~/services/git/types"
import IconGithub from "~icons/lucide/github"
import IconUser from "~icons/lucide/user"
import IconTrash from "~icons/lucide/trash-2"
import IconAlertTriangle from "~icons/lucide/alert-triangle"

// GitLab icon component
const IconGitlab = markRaw({
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m23.6 9.593-.033-.086L20.3.98a.851.851 0 0 0-.336-.405.879.879 0 0 0-1.002.07.866.866 0 0 0-.288.44l-2.204 6.748H7.53L5.326 1.085a.857.857 0 0 0-.287-.44.879.879 0 0 0-1.002-.07.851.851 0 0 0-.336.405L.433 9.502l-.032.086a6.066 6.066 0 0 0 2.012 7.01l.01.009.027.02 4.987 3.737 2.467 1.87 1.502 1.136a1.013 1.013 0 0 0 1.224 0l1.502-1.136 2.467-1.87 5.015-3.754.012-.01a6.068 6.068 0 0 0 2.009-7.007z"/></svg>`,
})

// Gitee icon component
const IconGitee = markRaw({
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.328 0 .593-.266.593-.593v-1.482a.594.594 0 0 0-.593-.592h-3.259a.297.297 0 0 1-.296-.296v-1.482c0-.164.133-.296.296-.296h5.926c.327 0 .593.265.593.592v5.037a2.37 2.37 0 0 1-2.37 2.37H8c-1.31 0-2.37-1.06-2.37-2.37V8.593A3.555 3.555 0 0 1 9.185 5.04l.2-.003h8.69z"/></svg>`,
})

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "accountSelected", accountId: string): void
}>()

const t = useI18n()

const {
  accounts,
  isHydrated,
  githubAccounts,
  gitlabAccounts,
  giteeAccounts,
  isAuthenticating,
  authProvider,
  authenticate,
  cancelAuthentication,
  disconnect,
  isExpired,
  isProviderConfigured,
} = useGitOAuth()

// Available providers
const providers = [
  { id: "github" as const, name: "GitHub", icon: IconGithub },
  { id: "gitlab" as const, name: "GitLab", icon: IconGitlab },
  { id: "gitee" as const, name: "Gitee", icon: IconGitee },
]

const activeProvider = ref<GitOAuthProvider>("github")

const activeProviderConfig = computed(() =>
  providers.find((p) => p.id === activeProvider.value)
)

const activeAccounts = computed(() => {
  switch (activeProvider.value) {
    case "github":
      return githubAccounts.value
    case "gitlab":
      return gitlabAccounts.value
    case "gitee":
      return giteeAccounts.value
    default:
      return []
  }
})

function getProviderAccountCount(provider: GitOAuthProvider): number {
  return accounts.value.filter((acc) => acc.provider === provider).length
}

function handleConnect() {
  authenticate(activeProvider.value)
}

function handleDisconnect(accountId: string) {
  disconnect(accountId)
}
</script>
