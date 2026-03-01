<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      :class="[
        isCollectionProperty
          ? 'top-propertiesPrimaryStickyFold'
          : 'top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold',
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
                      : (auth = { ...auth, authType: item.key } as AukRESTAuth)
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
          <HttpAuthorizationBasic v-model="auth" :envs="envs" />
        </div>
        <div v-if="auth.authType === 'inherit'" class="p-4">
          <span v-if="inheritedProperties?.auth">
            {{
              t("authorization.inherited_from", {
                auth: getAuthName(
                  inheritedProperties.auth.inheritedAuth.authType
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
            <label
              class="flex items-center ml-4 text-secondaryLight min-w-[6rem]"
            >
              {{ t("authorization.token") }}
            </label>
            <SmartEnvInput
              v-model="auth.token"
              placeholder="Your Bearer Token (e.g. sk_live_abc123xyz789)"
              :auto-complete-env="true"
              :envs="envs"
              class="px-4"
            />
          </div>
        </div>
        <div v-if="auth.authType === 'oauth-2'" class="w-full">
          <div class="flex flex-1 border-b border-dividerLight">
            <label
              class="flex items-center ml-4 text-secondaryLight min-w-[6rem]"
            >
              {{ t("authorization.token") }}
            </label>
            <!-- Ensure a new object is assigned here to avoid reactivity issues -->
            <SmartEnvInput
              :model-value="auth.grantTypeInfo.token"
              placeholder="Your OAuth 2.0 Token (e.g. sk_live_abc123xyz789)"
              :envs="envs"
              @update:model-value="
                auth.grantTypeInfo = { ...auth.grantTypeInfo, token: $event }
              "
            />
          </div>
          <HttpAuthorizationOAuth2
            v-model="auth"
            :is-collection-property="isCollectionProperty"
            :envs="envs"
            :source="source"
          />
        </div>
        <div v-if="auth.authType === 'api-key'">
          <HttpAuthorizationApiKey v-model="auth" :envs="envs" />
        </div>
        <div v-if="auth.authType === 'aws-signature'">
          <HttpAuthorizationAWSSign v-model="auth" :envs="envs" />
        </div>
        <div v-if="auth.authType === 'hawk'">
          <HttpAuthorizationHAWK v-model="auth" :envs="envs" />
        </div>
        <div v-if="auth.authType === 'digest'">
          <HttpAuthorizationDigest v-model="auth" :envs="envs" />
        </div>
        <div v-if="auth.authType === 'jwt'">
          <HttpAuthorizationJWT v-model="auth" :envs="envs" />
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
import { useVModel } from "@vueuse/core"
import { computed, onMounted, ref } from "vue"
import { AukInheritedProperty } from "~/helpers/types/AukInheritedProperties"
import { AggregateEnvironment } from "~/store/environments"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconExternalLink from "~icons/lucide/external-link"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"

import { getDefaultAuthCodeOauthFlowParams } from "~/services/oauth/flows/authCode"
import {
  AukRESTAuth,
  AukRESTAuthAWSSignature,
  AukRESTAuthDigest,
  AukRESTAuthHAWK,
  AukRESTAuthOAuth2,
  AukRESTAuthJWT,
} from "@auk/data"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue: AukRESTAuth
    isCollectionProperty?: boolean
    isRootCollection?: boolean
    inheritedProperties?: AukInheritedProperty
    envs?: AggregateEnvironment[]
    source?: "REST" | "GraphQL"
  }>(),
  {
    source: "REST",
    envs: undefined,
    inheritedProperties: undefined,
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: AukRESTAuth): void
}>()

const auth = useVModel(props, "modelValue", emit)

onMounted(() => {
  if (props.isRootCollection && auth.value.authType === "inherit") {
    auth.value = {
      authType: "none",
      authActive: true,
    }
  }
})

type AuthType = {
  key: AukRESTAuth["authType"]
  label: string
  handler?: () => void
}

const selectAPIKeyAuthType = () => {
  auth.value = {
    ...auth.value,
    authType: "api-key",
    addTo: "HEADERS",
  } as AukRESTAuth
}

const selectAWSSignatureAuthType = () => {
  const {
    accessKey = "",
    secretKey = "",
    region = "",
    serviceName = "",
    addTo = "HEADERS",
  } = auth.value as AukRESTAuthAWSSignature

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

const selectHAWKAuthType = () => {
  const { algorithm = "sha256" } = auth.value as AukRESTAuthHAWK
  auth.value = {
    ...auth.value,
    authType: "hawk",
    algorithm,
  } as AukRESTAuth
}

const selectDigestAuthType = () => {
  const {
    username = "",
    password = "",
    algorithm = "MD5",
  } = auth.value as AukRESTAuthDigest

  auth.value = {
    ...auth.value,
    authType: "digest",
    username,
    password,
    algorithm,
  } as AukRESTAuth
}

const selectJWTAuthType = () => {
  auth.value = {
    ...auth.value,
    authType: "jwt",
    secret: "",
    algorithm: "HS256",
    payload: "{}",
    addTo: "HEADERS",
    isSecretBase64Encoded: false,
    headerPrefix: "Bearer ",
    paramName: "token",
    jwtHeaders: "{}",
  } as AukRESTAuthJWT
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
    key: "digest",
    label: "Digest Auth",
    handler: selectDigestAuthType,
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
  {
    key: "hawk",
    label: "HAWK",
    handler: selectHAWKAuthType,
  },
  {
    key: "jwt",
    label: "JWT",
    handler: selectJWTAuthType,
  },
]

const authType = pluckRef(auth, "authType")
const getAuthName = (type: AukRESTAuth["authType"] | undefined) => {
  if (!type) return "None"
  return authTypes.find((a) => a.key === type)?.label || "None"
}
const authName = computed(() => getAuthName(authType.value))

function selectOAuth2AuthType() {
  const defaultGrantTypeInfo: AukRESTAuthOAuth2["grantTypeInfo"] = {
    ...getDefaultAuthCodeOauthFlowParams(),
    grantType: "AUTHORIZATION_CODE",
    token: "",
  }

  // @ts-expect-error - the existing grantTypeInfo might be in the auth object, typescript doesnt know that
  const existingGrantTypeInfo = auth.value.grantTypeInfo as
    | AukRESTAuthOAuth2["grantTypeInfo"]
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
