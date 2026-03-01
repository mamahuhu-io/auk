<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky z-10 flex items-center justify-between border-y border-dividerLight bg-primary pl-4"
      :class="[
        isCollectionProperty
          ? 'top-propertiesPrimaryStickyFold'
          : 'top-sidebarPrimaryStickyFold',
      ]"
    >
      <span class="flex items-center">
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("authorization.type") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions.focus()"
        >
          <AukSmartSelectWrapper>
            <AukButtonSecondary
              class="ml-2 rounded-none pr-8"
              :label="authName"
            />
          </AukSmartSelectWrapper>
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <AukSmartItem
                v-for="item in authTypes"
                :key="item.key"
                :label="item.label"
                :icon="item.key === authType ? IconCircleDot : IconCircle"
                :active="item.key === authType"
                @click="
                  () => {
                    item.handler
                      ? item.handler()
                      : (auth = { ...auth, authType: item.key } as AukGQLAuth)
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
      <div class="flex">
        <!-- <AukSmartCheckbox
          :on="!URLExcludes.auth"
          @change="setExclude('auth', !$event)"
        >
          {{ $t("authorization.include_in_url") }}
        </AukSmartCheckbox>-->
        <AukSmartCheckbox
          :on="authActive"
          class="px-2"
          @change="authActive = !authActive"
        >
          {{ t("state.enabled") }}
        </AukSmartCheckbox>
        <AukButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://auk.mamahuhu.dev/documentation/features/authorization"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <AukButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          :icon="IconTrash2"
          @click="clearContent"
        />
      </div>
    </div>
    <div
      v-if="auth.authType === 'none'"
      class="flex items-center justify-between px-4 py-3 text-secondaryLight"
    >
      <span>{{ t("empty.authorization") }}</span>
      <AukButtonSecondary
        outline
        :label="t('app.documentation')"
        to="https://auk.mamahuhu.dev/documentation/features/authorization"
        blank
        :icon="IconExternalLink"
        reverse
      />
    </div>
    <div v-else class="flex flex-1 border-b border-dividerLight">
      <div class="w-2/3 border-r border-dividerLight">
        <div v-if="auth.authType === 'basic'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.username"
              :environment-highlights="false"
              :placeholder="t('authorization.username')"
            />
          </div>
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.password"
              :environment-highlights="false"
              :placeholder="t('authorization.password')"
            />
          </div>
        </div>
        <div v-if="auth.authType === 'inherit'" class="p-4">
          <span v-if="inheritedProperties?.auth">
            {{
              t("authorization.inherited_from", {
                auth: getAuthName(
                  (inheritedProperties.auth.inheritedAuth as AukGQLAuth)
                    .authType
                ),
                collection: inheritedProperties?.auth.parentName,
              })
            }}
          </span>
          <span v-else>
            {{ t("authorization.save_to_inherit") }}
          </span>
        </div>
        <div v-if="auth.authType === 'bearer'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.token"
              :environment-highlights="false"
              placeholder="Token"
            />
          </div>
        </div>
        <div v-if="auth.authType === 'oauth-2'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.grantTypeInfo.token"
              :environment-highlights="false"
              placeholder="Token"
            />
          </div>
          <HttpAuthorizationOAuth2 v-model="auth" source="GraphQL" />
        </div>
        <div v-if="auth.authType === 'api-key'">
          <HttpAuthorizationApiKey v-model="auth" />
        </div>
        <div v-if="auth.authType === 'aws-signature'">
          <HttpAuthorizationAWSSign v-model="auth" />
        </div>
      </div>
      <div
        class="z-[9] sticky top-upperTertiaryStickyFold h-full min-w-[12rem] max-w-1/3 flex-shrink-0 overflow-auto overflow-x-auto bg-primary p-4"
      >
        <div class="pb-2 text-secondaryLight">
          {{ t("helpers.authorization") }}
        </div>
        <AukSmartAnchor
          class="link"
          :label="t('authorization.learn')"
          :icon="IconExternalLink"
          to="https://auk.mamahuhu.dev/documentation/features/authorization"
          blank
          reverse
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { pluckRef } from "@composables/ref"
import { AukGQLAuth, AukGQLAuthOAuth2, AukGQLAuthAWSSignature } from "@auk/data"
import { useVModel } from "@vueuse/core"
import { computed, onMounted, ref } from "vue"

import { AukInheritedProperty } from "~/helpers/types/AukInheritedProperties"

import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconExternalLink from "~icons/lucide/external-link"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"

import { getDefaultAuthCodeOauthFlowParams } from "~/services/oauth/flows/authCode"

type AuthType = {
  key: AukGQLAuth["authType"]
  label: string
  handler?: () => void
}

const t = useI18n()

const props = defineProps<{
  modelValue: AukGQLAuth
  isCollectionProperty?: boolean
  isRootCollection?: boolean
  inheritedProperties?: AukInheritedProperty
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: AukGQLAuth): void
}>()

onMounted(() => {
  if (props.isRootCollection && auth.value.authType === "inherit") {
    auth.value = {
      authType: "none",
      authActive: true,
    }
  }
})

const auth = useVModel(props, "modelValue", emit)

const selectOAuth2AuthType = () => {
  const defaultGrantTypeInfo: AukGQLAuthOAuth2["grantTypeInfo"] = {
    ...getDefaultAuthCodeOauthFlowParams(),
    grantType: "AUTHORIZATION_CODE",
    token: "",
  }

  // @ts-expect-error - the existing grantTypeInfo might be in the auth object, typescript doesnt know that
  const existingGrantTypeInfo = auth.value.grantTypeInfo as
    | AukGQLAuthOAuth2["grantTypeInfo"]
    | undefined

  const grantTypeInfo = existingGrantTypeInfo
    ? existingGrantTypeInfo
    : defaultGrantTypeInfo

  auth.value = {
    ...auth.value,
    authType: "oauth-2",
    addTo: "HEADERS",
    grantTypeInfo: grantTypeInfo,
  }
}

const selectAPIKeyAuthType = () => {
  auth.value = {
    ...auth.value,
    authType: "api-key",
    addTo: "HEADERS",
  } as AukGQLAuth
}

const selectAWSSignatureAuthType = () => {
  const {
    accessKey = "",
    secretKey = "",
    region = "",
    serviceName = "",
    addTo = "HEADERS",
  } = auth.value as AukGQLAuthAWSSignature

  auth.value = {
    ...auth.value,
    authType: "aws-signature",
    addTo,
    accessKey,
    secretKey,
    region,
    serviceName,
  }
}

const authTypes: AuthType[] = [
  {
    key: "inherit",
    label: "Inherit",
  },
  {
    key: "none",
    label: "None",
  },
  {
    key: "basic",
    label: "Basic Auth",
  },
  {
    key: "bearer",
    label: "Bearer",
  },
  {
    key: "oauth-2",
    label: "OAuth 2.0",
    handler: selectOAuth2AuthType,
  },
  {
    key: "api-key",
    label: "API Key",
    handler: selectAPIKeyAuthType,
  },
  {
    key: "aws-signature",
    label: "AWS Signature",
    handler: selectAWSSignatureAuthType,
  },
]

const AUTH_KEY_NAME: Record<AukGQLAuth["authType"], string> = {
  basic: "Basic Auth",
  bearer: "Bearer",
  "oauth-2": "OAuth 2.0",
  "api-key": "API key",
  none: "None",
  inherit: "Inherit",
  "aws-signature": "AWS Signature",
}

const authType = pluckRef(auth, "authType")

const authName = computed(() =>
  AUTH_KEY_NAME[authType.value] ? AUTH_KEY_NAME[authType.value] : "None"
)

const getAuthName = (type: AukGQLAuth["authType"] | undefined) => {
  if (!type) return "None"
  return AUTH_KEY_NAME[type] ? AUTH_KEY_NAME[type] : "None"
}

const authActive = pluckRef(auth, "authActive")

const clearContent = () => {
  auth.value = {
    authType: "inherit",
    authActive: true,
  }
}

// Template refs
const tippyActions = ref<any | null>(null)
</script>
