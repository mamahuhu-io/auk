<template>
  <div
    v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
    :title="tab.document.request.name"
    class="flex items-center truncate px-2"
    @dblclick="emit('open-rename-modal')"
    @contextmenu.prevent="options?.tippy?.show()"
    @click.middle="emit('close-tab')"
  >
    <tippy
      ref="options"
      trigger="manual"
      interactive
      theme="popover"
      :on-shown="() => tippyActions!.focus()"
    >
      <span class="truncate">
        {{ tab.document.request.name }}
      </span>
      <template #content="{ hide }">
        <div
          ref="tippyActions"
          class="flex flex-col focus:outline-none"
          tabindex="0"
          @keyup.r="renameAction?.$el.click()"
          @keyup.d="duplicateAction?.$el.click()"
          @keyup.w="closeAction?.$el.click()"
          @keyup.x="closeOthersAction?.$el.click()"
          @keyup.escape="hide()"
        >
          <AukSmartItem
            ref="renameAction"
            :icon="IconFileEdit"
            :label="t('request.rename')"
            :shortcut="['R']"
            @click="
              () => {
                emit('open-rename-modal')
                hide()
              }
            "
          />
          <AukSmartItem
            ref="duplicateAction"
            :icon="IconCopy"
            :label="t('tab.duplicate')"
            :shortcut="['D']"
            @click="
              () => {
                emit('duplicate-tab')
                hide()
              }
            "
          />
          <AukSmartItem
            v-if="isRemovable"
            ref="closeAction"
            :icon="IconXCircle"
            :label="t('tab.close')"
            :shortcut="['W']"
            @click="
              () => {
                emit('close-tab')
                hide()
              }
            "
          />
          <AukSmartItem
            v-if="isRemovable"
            ref="closeOthersAction"
            :icon="IconXSquare"
            :label="t('tab.close_others')"
            :shortcut="['X']"
            @click="
              () => {
                emit('close-other-tabs')
                hide()
              }
            "
          />
        </div>
      </template>
    </tippy>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "~/composables/i18n"
import IconXCircle from "~icons/lucide/x-circle"
import IconXSquare from "~icons/lucide/x-square"
import IconFileEdit from "~icons/lucide/file-edit"
import IconCopy from "~icons/lucide/copy"
import { AukTab } from "~/services/tab"
import { AukGQLDocument } from "~/helpers/graphql/document"

const t = useI18n()

defineProps<{
  tab: AukTab<AukGQLDocument>
  isRemovable: boolean
}>()

const emit = defineEmits<{
  (event: "open-rename-modal"): void
  (event: "close-tab"): void
  (event: "close-other-tabs"): void
  (event: "duplicate-tab"): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)

const renameAction = ref<HTMLButtonElement | null>(null)
const closeAction = ref<HTMLButtonElement | null>(null)
const closeOthersAction = ref<HTMLButtonElement | null>(null)
const duplicateAction = ref<HTMLButtonElement | null>(null)
</script>
