<template>
  <div>
    <div class="flex justify-between bg-primary">
      <div class="flex">
        <AukButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="EXPAND_NAVIGATION ? t('hide.sidebar') : t('show.sidebar')"
          :icon="IconSidebar"
          class="transform"
          :class="{ '-rotate-180': !EXPAND_NAVIGATION }"
          @click="EXPAND_NAVIGATION = !EXPAND_NAVIGATION"
        />
        <tippy interactive trigger="click" theme="popover">
          <AukButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('settings.interceptor')"
            :icon="IconShieldCheck"
          />
          <template #content>
            <AppKernelInterceptor />
          </template>
        </tippy>
        <AukButtonSecondary
          v-if="platform.platformFeatureFlags.cookiesEnabled ?? false"
          :label="t('app.cookies')"
          :icon="IconCookie"
          @click="showCookiesModal = true"
        />
      </div>
      <div class="flex">
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions!.focus()"
        >
          <AukButtonSecondary
            :icon="IconHelpCircle"
            class="!rounded-none"
            :label="`${t('app.help')}`"
          />
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.d="documentation!.$el.click()"
              @keyup.s="shortcuts!.$el.click()"
              @keyup.c="chat!.$el.click()"
              @keyup.escape="hide()"
            >
              <AukSmartItem
                ref="documentation"
                :icon="IconBook"
                :label="`${t('app.documentation')}`"
                to="https://auk.mamahuhu.dev"
                blank
                :shortcut="['D']"
                @click="hide()"
              />
              <AukSmartItem
                ref="shortcuts"
                :icon="IconZap"
                :label="`${t('app.keyboard_shortcuts')}`"
                :shortcut="['S']"
                @click="
                  () => {
                    invokeAction('flyouts.keybinds.toggle')
                    hide()
                  }
                "
              />
              <template
                v-for="footerItem in platform.ui?.additionalFooterMenuItems"
                :key="footerItem.id"
              >
                <AukSmartItem
                  v-if="footerItem.action.type === 'link'"
                  :icon="footerItem.icon"
                  :label="footerItem.text(t)"
                  :to="footerItem.action.href"
                  blank
                  @click="hide()"
                />
                <AukSmartItem
                  v-else
                  :icon="footerItem.icon"
                  :label="footerItem.text(t)"
                  blank
                  @click="
                    () => {
                      // @ts-expect-error TypeScript not understanding the type
                      footerItem.action.do()
                      hide()
                    }
                  "
                />
              </template>
              <hr />
              <AukSmartItem
                :icon="IconGithub"
                :label="`${t('app.github')}`"
                to="https://auk.mamahuhu.io/github"
                blank
                @click="hide()"
              />
              <AukSmartItem
                :icon="IconTwitter"
                :label="`${t('app.twitter')}`"
                to="https://auk.mamahuhu.io/twitter"
                blank
                @click="hide()"
              />
              <AukSmartItem
                :icon="IconUserPlus"
                :label="`${t('app.invite')}`"
                @click="
                  () => {
                    invokeAction('modals.share.toggle')
                    hide()
                  }
                "
              />
              <AukSmartItem
                :icon="IconLock"
                :label="`${t('app.terms_and_privacy')}`"
                to="https://auk.mamahuhu.dev/support/privacy"
                blank
                @click="hide()"
              />
              <div
                class="flex px-4 py-2 opacity-50"
                @dblclick="
                  () => {
                    showDeveloperOptionModal()
                    hide()
                  }
                "
              >
                {{ `${t("app.name")} v${appVersion}` }}
              </div>
            </div>
          </template>
        </tippy>
        <AukButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'app.shortcuts'
          )} <kbd>${getSpecialKey()}</kbd><kbd>/</kbd>`"
          :icon="IconZap"
          @click="invokeAction('flyouts.keybinds.toggle')"
        />
        <AukButtonSecondary
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconShare2"
          :title="t('request.share')"
          @click="nativeShare()"
        />
        <AukButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="COLUMN_LAYOUT ? t('layout.row') : t('layout.column')"
          :icon="IconColumns"
          class="transform"
          :class="{ 'rotate-90': !COLUMN_LAYOUT }"
          @click="COLUMN_LAYOUT = !COLUMN_LAYOUT"
        />
        <span
          class="transform transition"
          :class="{
            'rotate-180': SIDEBAR_ON_LEFT,
          }"
        >
          <AukButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="SIDEBAR ? t('hide.sidebar') : t('show.sidebar')"
            :icon="IconSidebarOpen"
            class="transform"
            :class="{ 'rotate-180': !SIDEBAR }"
            @click="SIDEBAR = !SIDEBAR"
          />
        </span>
      </div>
    </div>
    <AppDeveloperOptions
      :show="showDeveloperOptions"
      @hide-modal="showDeveloperOptions = false"
    />
    <CookiesAllModal
      :show="showCookiesModal"
      @hide-modal="showCookiesModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { appVersion } from "~/composables/appMeta"
import IconCookie from "~icons/lucide/cookie"
import IconSidebar from "~icons/lucide/sidebar"
import IconZap from "~icons/lucide/zap"
import IconShare2 from "~icons/lucide/share-2"
import IconColumns from "~icons/lucide/columns"
import IconSidebarOpen from "~icons/lucide/sidebar-open"
import IconShieldCheck from "~icons/lucide/shield-check"
import IconBook from "~icons/lucide/book"
import IconGithub from "~icons/lucide/github"
import IconTwitter from "~icons/lucide/twitter"
import IconUserPlus from "~icons/lucide/user-plus"
import IconLock from "~icons/lucide/lock"
import IconHelpCircle from "~icons/lucide/help-circle"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { platform } from "~/platform"
import { TippyComponent } from "vue-tippy"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { invokeAction } from "@helpers/actions"
import { AukSmartItem } from "@auk/ui"

const t = useI18n()

const showDeveloperOptions = ref(false)
const showCookiesModal = ref(false)

const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR = useSetting("SIDEBAR")
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const navigatorShare = !!navigator.share

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const isSharing = ref(false)

const nativeShare = async () => {
  if (isSharing.value) return

  if (navigator.share) {
    isSharing.value = true
    try {
      await navigator.share({
        title: "Auk",
        text: "Auk • Open source API development ecosystem - Helps you create requests faster, saving precious time on development.",
        url: "https://auk.mamahuhu.io",
      })
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error(err)
      }
    } finally {
      isSharing.value = false
    }
  } else {
    // fallback
  }
}

const showDeveloperOptionModal = () => {
  if (currentUser.value) {
    showDeveloperOptions.value = true
  }
}

// Template refs
const tippyActions = ref<TippyComponent | null>(null)
const documentation = ref<typeof AukSmartItem>()
const shortcuts = ref<typeof AukSmartItem>()
const chat = ref<typeof AukSmartItem>()
</script>
