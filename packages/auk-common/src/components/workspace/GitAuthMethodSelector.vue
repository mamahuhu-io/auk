<template>
  <div class="flex flex-col gap-3">
    <label class="text-sm font-medium text-secondaryLight">
      {{ t("workspace.git_auth_method") }}
    </label>

    <!-- Auth Method Buttons -->
    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="method in authMethods"
        :key="method.id"
        class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors"
        :class="
          modelValue === method.id
            ? 'border-accent bg-accent/10'
            : 'border-dividerLight hover:border-accent/50'
        "
        @click="emit('update:modelValue', method.id)"
      >
        <component
          :is="method.icon"
          class="w-6 h-6"
          :class="
            modelValue === method.id ? 'text-accent' : 'text-secondaryLight'
          "
        />
        <span
          class="text-xs font-medium text-center"
          :class="
            modelValue === method.id ? 'text-accent' : 'text-secondaryLight'
          "
        >
          {{ method.label }}
        </span>
      </button>
    </div>

    <!-- HTTPS Token Input -->
    <div v-if="modelValue === 'https'" class="flex flex-col gap-2 mt-2">
      <label class="text-xs text-secondaryLight">
        {{ t("workspace.git_token") }}
      </label>
      <AukSmartInput
        :model-value="token"
        type="password"
        :placeholder="t('workspace.git_token_placeholder')"
        @update:model-value="emit('update:token', $event)"
      />
      <p class="text-xs text-secondaryDark">
        {{ t("workspace.git_token_hint") }}
      </p>
    </div>

    <!-- OAuth Account Selector -->
    <div v-if="modelValue === 'oauth'" class="flex flex-col gap-2 mt-2">
      <!-- Has accounts -->
      <div v-if="availableAccounts.length > 0" class="flex flex-col gap-2">
        <label class="text-xs text-secondaryLight">
          {{ t("workspace.git_select_account") }}
        </label>

        <!-- Account List -->
        <div class="flex flex-col gap-2">
          <div
            v-for="account in availableAccounts"
            :key="account.id"
            class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
            :class="
              oauthAccountId === account.id
                ? 'bg-accent/20 border border-accent'
                : 'bg-primaryLight hover:bg-primaryDark border border-transparent'
            "
            @click="emit('update:oauthAccountId', account.id)"
          >
            <img
              v-if="account.user.avatarUrl"
              :src="account.user.avatarUrl"
              :alt="account.user.username"
              class="w-8 h-8 rounded-full"
            />
            <div
              v-else
              class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent"
            >
              <IconUser class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ account.user.username }}
              </div>
              <div class="text-xs text-secondaryLight">
                {{ getProviderDisplayName(account.provider) }}
              </div>
            </div>
            <IconCheck
              v-if="oauthAccountId === account.id"
              class="w-5 h-5 text-accent shrink-0"
            />
          </div>
        </div>

        <!-- Manage Accounts Link -->
        <AukButtonSecondary
          :label="t('workspace.git_oauth_manage')"
          :icon="IconSettings"
          class="mt-1"
          @click="emit('openOAuthModal')"
        />
      </div>

      <!-- Loading -->
      <div
        v-else-if="!isHydrated"
        class="flex flex-col items-center gap-3 p-4 rounded-lg bg-primaryLight"
      >
        <IconShield
          class="w-8 h-8 text-secondaryLight opacity-50 animate-pulse"
        />
        <span class="text-sm text-secondaryLight text-center">
          {{ t("state.loading") }}
        </span>
      </div>

      <!-- No accounts -->
      <div
        v-else
        class="flex flex-col items-center gap-3 p-4 rounded-lg bg-primaryLight"
      >
        <IconShield class="w-8 h-8 text-secondaryLight opacity-50" />
        <span class="text-sm text-secondaryLight text-center">
          {{ t("workspace.git_no_oauth_accounts") }}
        </span>
        <AukButtonPrimary
          :label="t('workspace.git_oauth_connect_account')"
          :icon="IconPlus"
          @click="emit('openOAuthModal')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useGitOAuth } from "~/composables/useGitOAuth"
import IconKey from "~icons/lucide/key"
import IconLock from "~icons/lucide/lock"
import IconShield from "~icons/lucide/shield"
import IconUser from "~icons/lucide/user"
import IconCheck from "~icons/lucide/check"
import IconSettings from "~icons/lucide/settings"
import IconPlus from "~icons/lucide/plus"
import IconTerminal from "~icons/lucide/terminal"

type AuthMethod = "none" | "https" | "oauth" | "ssh"

defineProps<{
  modelValue: AuthMethod
  token?: string
  oauthAccountId?: string
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: AuthMethod): void
  (e: "update:token", value: string): void
  (e: "update:oauthAccountId", value: string): void
  (e: "openOAuthModal"): void
}>()

const t = useI18n()
const { accounts, isHydrated, getProviderDisplayName, hasValidToken } =
  useGitOAuth()

const authMethods = computed(() => [
  {
    id: "ssh" as const,
    label: "SSH",
    icon: IconTerminal,
  },
  {
    id: "none" as const,
    label: t("workspace.git_auth_public"),
    icon: IconKey,
  },
  {
    id: "https" as const,
    label: t("workspace.git_auth_token"),
    icon: IconLock,
  },
  {
    id: "oauth" as const,
    label: "OAuth",
    icon: IconShield,
  },
])

// Get accounts with valid tokens
const availableAccounts = computed(() =>
  accounts.value.filter((acc) => hasValidToken(acc))
)
</script>
