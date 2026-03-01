<template>
  <AukSmartTabs
    v-model="selectedNavigationTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
  >
    <AukSmartTab
      :id="'collections'"
      :icon="IconFolder"
      :label="`${t('tab.collections')}`"
    >
      <Collections />
    </AukSmartTab>
    <AukSmartTab
      :id="'env'"
      :icon="IconLayers"
      :label="`${t('tab.environments')}`"
    >
      <Environments />
    </AukSmartTab>
    <AukSmartTab
      :id="'history'"
      :icon="IconClock"
      :label="`${t('tab.history')}`"
    >
      <History :page="'rest'" :selected-tab="selectedNavigationTab" />
    </AukSmartTab>
    <AukSmartTab
      :id="'codegen'"
      :icon="IconCode"
      :label="`${t('tab.codegen')}`"
    >
      <div
        class="flex items-center overflow-x-auto whitespace-nowrap border-b border-dividerLight px-4 py-2 text-tiny text-secondaryLight"
      >
        <span class="truncate"> {{ t("request.title") }} </span>
        <icon-lucide-chevron-right class="mx-2" />
        {{ t("tab.code_snippet") }}
      </div>
      <HttpCodegen
        v-if="selectedNavigationTab === 'codegen'"
        :hide-label="true"
        class="px-4 mt-4"
      />
    </AukSmartTab>
    <!-- Mock servers removed in local-only mode -->
  </AukSmartTabs>
</template>

<script setup lang="ts">
import IconClock from "~icons/lucide/clock"
import IconLayers from "~icons/lucide/layers"
import IconFolder from "~icons/lucide/folder"
import IconCode from "~icons/lucide/code"
import { ref } from "vue"
import { useI18n } from "@composables/i18n"

const t = useI18n()

type RequestOptionTabs = "history" | "collections" | "env" | "codegen"

const selectedNavigationTab = ref<RequestOptionTabs>("collections")
</script>
