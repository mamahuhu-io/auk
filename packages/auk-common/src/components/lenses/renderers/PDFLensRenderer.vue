<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-lowerSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div v-if="response.body" class="flex">
        <AukButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'action.download_file'
          )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
          :icon="downloadIcon"
          @click="downloadResponse"
        />
        <tippy
          v-if="!isEditable"
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => responseMoreActionsTippy?.focus()"
        >
          <AukButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.more')"
            :icon="IconMore"
          />
          <template #content="{ hide }">
            <div
              ref="responseMoreActionsTippy"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <AukSmartItem
                v-if="!isTestRunner"
                :label="t('action.clear_response')"
                :icon="IconEraser"
                :shortcut="[getSpecialKey(), 'Delete']"
                @click="eraseResponse"
              />
            </div>
          </template>
        </tippy>
      </div>
    </div>
    <vue-pdf-embed
      :source="pdfsrc"
      class="flex flex-1 overflow-auto border-b border-dividerLight"
      type="application/pdf"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import VuePdfEmbed from "vue-pdf-embed"
import { useI18n } from "@composables/i18n"
import { useDownloadResponse } from "@composables/lens-actions"
import { AukRESTResponse } from "~/helpers/types/AukRESTResponse"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { AukRESTRequestResponse } from "@auk/data"
import IconEraser from "~icons/lucide/eraser"
import IconMore from "~icons/lucide/more-horizontal"

const t = useI18n()
const responseMoreActionsTippy = ref<HTMLElement | null>(null)

const props = defineProps<{
  response: AukRESTResponse & {
    type: "success" | "fail"
  }
  isEditable: boolean
  isTestRunner?: boolean
}>()

const emit = defineEmits<{
  (e: "update:response", val: AukRESTRequestResponse | AukRESTResponse): void
}>()

const pdfsrc = computed(() =>
  URL.createObjectURL(
    new Blob([props.response.body], {
      type: "application/pdf",
    })
  )
)

const filename = t("filename.lens", {
  request_name: props.response.req.name,
})

const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/pdf",
  computed(() => props.response.body),
  `${filename}.pdf`
)

/**
 * Erases the response body.
 * Do not erase if the tab is a saved example or test runner.
 *
 */
const eraseResponse = () => {
  if (!props.isEditable && !props.isTestRunner) emit("update:response", null)
}

defineActionHandler("response.file.download", () => downloadResponse())
defineActionHandler("response.erase", () => eraseResponse())
</script>
