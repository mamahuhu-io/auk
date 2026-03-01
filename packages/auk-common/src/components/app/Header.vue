<template>
  <div>
    <header
      ref="headerRef"
      data-tauri-drag-region
      class="grid grid-cols-5 grid-rows-1 gap-2 overflow-x-auto overflow-y-hidden p-2"
    >
      <div
        data-tauri-drag-region
        class="col-span-2 flex items-center justify-between space-x-2"
        :style="{
          paddingTop: platform.ui?.appHeader?.paddingTop?.value,
          paddingLeft: platform.ui?.appHeader?.paddingLeft?.value,
        }"
      >
        <div class="flex items-center gap-2">
          <AukButtonSecondary
            class="!font-bold uppercase tracking-wide !text-secondaryDark hover:bg-primaryDark focus-visible:bg-primaryDark"
            :label="t('app.name')"
            to="/"
          />
        </div>
      </div>
      <div
        data-tauri-drag-region
        class="col-span-1 flex items-center justify-between space-x-2"
      >
        <AppSpotlightSearch />
      </div>
      <div
        data-tauri-drag-region
        class="col-span-2 flex items-center justify-between space-x-2"
      >
        <div class="flex">
          <tippy
            v-if="
              kernelMode === 'web' &&
              downloadableLinks &&
              downloadableLinks.length > 0
            "
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => downloadableLinksRef.focus()"
          >
            <AukButtonSecondary
              :icon="IconDownload"
              class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
            />
            <template #content="{ hide }">
              <div
                ref="downloadableLinksRef"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <template v-for="link in downloadableLinks" :key="link.id">
                  <AukButtonSecondary
                    v-if="link.show ?? true"
                    :icon="link.icon"
                    :label="link.text(t)"
                    :blank="true"
                    class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark justify-between"
                    :to="
                      link.action.type === 'link' ? link.action.href : undefined
                    "
                    @click="
                      link.action.type === 'custom' ? link.action.do() : null
                    "
                  />
                </template>
              </div>
            </template>
          </tippy>

          <AukButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${
              mdAndLarger ? t('support.title') : t('app.options')
            } <kbd>?</kbd>`"
            :icon="IconLifeBuoy"
            class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
            @click="invokeAction('modals.support.toggle')"
          />
        </div>
        <div class="flex">
          <div class="inline-flex items-center space-x-2">
            <LocalWorkspaceSelector />
            <span class="px-2">
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => tippyActions.focus()"
              >
                <div class="relative">
                  <AukButtonSecondary
                    v-tippy="{
                      theme: 'tooltip',
                    }"
                    :icon="IconUser"
                    :title="currentWorkspaceName"
                    class="!rounded-full"
                  />
                  <span
                    class="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full"
                    :class="network.isOnline ? 'bg-green-500' : 'bg-red-500'"
                  />
                </div>
                <template #content="{ hide }">
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.?="shortcuts.$el.click()"
                    @keyup.s="settings.$el.click()"
                    @keyup.escape="hide()"
                  >
                    <div class="flex flex-col px-2 pt-1">
                      <span class="inline-flex truncate font-semibold">
                        {{ currentWorkspaceName }}
                      </span>
                      <span
                        class="inline-flex truncate text-secondaryLight text-tiny"
                        >{{ t("app.local_mode") }}</span
                      >
                    </div>
                    <hr />
                    <div
                      class="flex items-center px-2 py-2 text-secondaryLight"
                    >
                      <component
                        :is="network.isOnline ? IconWifi : IconWifiOff"
                        class="mr-2 h-4 w-4"
                        :class="
                          network.isOnline ? 'text-green-500' : 'text-red-500'
                        "
                      />
                      <span
                        :class="
                          network.isOnline ? 'text-green-500' : 'text-red-500'
                        "
                      >
                        {{
                          network.isOnline
                            ? t("app.network_online")
                            : t("app.network_offline")
                        }}
                      </span>
                    </div>
                    <hr />
                    <AukSmartItem
                      ref="shortcuts"
                      :icon="IconZap"
                      :label="t('app.keyboard_shortcuts')"
                      :shortcut="['?']"
                      @click="
                        () => {
                          invokeAction('flyouts.keybinds.toggle')
                          hide()
                        }
                      "
                    />
                    <AukSmartItem
                      ref="settings"
                      to="/settings"
                      :icon="IconSettings"
                      :label="t('navigation.settings')"
                      :shortcut="['S']"
                      @click="hide()"
                    />
                    <hr />
                    <div class="flex flex-col px-2 py-2 text-secondaryLight">
                      <div class="flex items-center">
                        <IconInfo class="mr-2 h-4 w-4" />
                        <span>{{ t("app.about") }}</span>
                      </div>
                      <span class="ml-6 text-tiny">
                        {{ `${t("app.name")} v${appVersion}` }}
                      </span>
                    </div>
                  </div>
                </template>
              </tippy>
            </span>
          </div>
        </div>
      </div>
    </header>
    <AppBanner
      v-if="bannerContent"
      :banner="bannerContent"
      @dismiss="dismissBanner"
    />
  </div>
</template>

<script setup lang="ts">
import { getKernelMode } from "@auk/kernel"

import { useI18n } from "@composables/i18n"
import { invokeAction } from "@helpers/actions"
import { breakpointsTailwind, useBreakpoints, useNetwork } from "@vueuse/core"
import { useService } from "dioc/vue"
import { computed, reactive, ref, watch } from "vue"
import { platform } from "~/platform"
import { AdditionalLinksService } from "~/services/additionalLinks.service"
import {
  BANNER_PRIORITY_LOW,
  BannerContent,
  BannerService,
} from "~/services/banner.service"
import LocalWorkspaceSelector from "~/components/workspace/WorkspaceSelector.vue"
import { useWorkspaceStore } from "~/store/workspace"
import IconDownload from "~icons/lucide/download"
import IconLifeBuoy from "~icons/lucide/life-buoy"
import IconSettings from "~icons/lucide/settings"
import IconUser from "~icons/lucide/user"
import IconWifi from "~icons/lucide/wifi"
import IconWifiOff from "~icons/lucide/wifi-off"
import IconZap from "~icons/lucide/zap"
import IconInfo from "~icons/lucide/info"
import { appVersion } from "~/composables/appMeta"

const t = useI18n()
const { currentWorkspace } = useWorkspaceStore()
const currentWorkspaceName = computed(
  () => currentWorkspace.value?.name || t("workspace.select")
)
const kernelMode = getKernelMode()

const downloadableLinksRef =
  kernelMode === "web" ? ref<any | null>(null) : ref(null)

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const banner = useService(BannerService)
const bannerContent = computed(() => banner.content.value?.content)
let offlineBannerID: number | null = null

const offlineBanner: BannerContent = {
  type: "warning",
  text: (t) => t("helpers.offline"),
  alternateText: (t) => t("helpers.offline_short"),
  score: BANNER_PRIORITY_LOW,
  dismissible: true,
}

const additionalLinks = useService(AdditionalLinksService)

platform.additionalLinks?.forEach((linkSet) => {
  useService(linkSet)
})

const downloadableLinks = computed(() => {
  if (kernelMode !== "web") return null

  const headerDownloadableLink = additionalLinks?.getLinkSet(
    "HEADER_DOWNLOADABLE_LINKS"
  )

  if (!headerDownloadableLink) return null

  return headerDownloadableLink.getLinks().value
})

// Show the offline banner if the app is offline
const network = reactive(useNetwork())
const isOnline = computed(() => network.isOnline)

watch(isOnline, () => {
  if (!isOnline.value) {
    offlineBannerID = banner.showBanner(offlineBanner)
    return
  }
  if (banner.content && offlineBannerID) {
    banner.removeBanner(offlineBannerID)
  }
})

const dismissBanner = () => {
  if (banner.content.value) {
    banner.removeBanner(banner.content.value.id)
  } else if (offlineBannerID) {
    banner.removeBanner(offlineBannerID)
    offlineBannerID = null
  }
}

// Template refs
const tippyActions = ref<any | null>(null)
const settings = ref<any | null>(null)
const shortcuts = ref<any | null>(null)
</script>
