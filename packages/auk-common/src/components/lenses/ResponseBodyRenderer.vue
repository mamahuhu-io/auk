<template>
  <AukSmartTabs
    v-if="doc.response"
    v-model="selectedLensTab"
    styles="sticky overflow-x-auto flex-shrink-0 z-10 bg-primary top-lowerPrimaryStickyFold"
  >
    <AukSmartTab
      v-for="(lens, index) in validLenses"
      :id="lens.renderer"
      :key="`lens-${index}`"
      :label="t(lens.lensName)"
      class="flex h-full w-full flex-1 flex-col"
    >
      <component
        :is="lensRendererFor(lens.renderer)"
        v-model:response="doc.response"
        :is-savable="isSavable"
        :is-editable="isEditable"
        :tab-id="props.tabId"
        :is-test-runner="props.isTestRunner"
        @save-as-example="$emit('save-as-example')"
      />
    </AukSmartTab>
    <AukSmartTab
      v-if="maybeHeaders"
      id="headers"
      :label="t('response.headers')"
      :info="`${maybeHeaders.length}`"
      class="flex flex-1 flex-col"
    >
      <LensesHeadersRenderer v-model="maybeHeaders" :is-editable="false" />
    </AukSmartTab>
    <AukSmartTab
      v-if="doc.response?.type !== 'network_fail' && !isEditable"
      id="results"
      :label="t('test.results')"
      :indicator="showIndicator"
      class="flex flex-1 flex-col"
    >
      <HttpTestResult
        v-model="doc.testResults"
        :is-loading="doc.response?.type === 'loading'"
      />
    </AukSmartTab>
    <AukSmartTab
      v-if="requestHeaders"
      id="req-headers"
      :label="t('response.request_headers')"
      :info="`${requestHeaders?.length}`"
      class="flex flex-1 flex-col"
    >
      <LensesHeadersRenderer
        :model-value="requestHeaders"
        :is-editable="false"
      />
    </AukSmartTab>
    <AukSmartTab
      v-if="showConsoleTab"
      id="console"
      label="Console"
      class="flex flex-1 flex-col"
    >
      <ConsolePanel :messages="consoleEntries" />
    </AukSmartTab>
  </AukSmartTabs>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { useSetting } from "~/composables/settings"
import {
  getLensRenderers,
  getSuitableLenses,
  Lens,
} from "~/helpers/lenses/lenses"
import { AukRequestDocument } from "~/helpers/rest/document"
import { ConsoleEntry } from "../console/Panel.vue"

const props = defineProps<{
  document: AukRequestDocument
  isEditable: boolean
  tabId: string
  isTestRunner?: boolean
}>()

const emit = defineEmits<{
  (e: "update:document", document: AukRequestDocument): void
  (e: "save-as-example"): void
}>()

const doc = useVModel(props, "document", emit)
const t = useI18n()
const EXPERIMENTAL_SCRIPTING_SANDBOX = useSetting(
  "EXPERIMENTAL_SCRIPTING_SANDBOX"
)

const isSavable = computed(() => {
  return Boolean(
    doc.value.response?.type === "success" && doc.value.saveContext
  )
})

const showIndicator = computed(() => {
  if (!doc.value.testResults) return false

  const { expectResults, tests, envDiff } = doc.value.testResults
  return Boolean(
    expectResults.length ||
    tests.length ||
    envDiff.selected.additions.length ||
    envDiff.selected.updations.length ||
    envDiff.global.updations.length
  )
})

const allLensRenderers = getLensRenderers()

function lensRendererFor(name: string) {
  return allLensRenderers[name]
}

const selectedLensTab = ref("")

const maybeHeaders = computed(() => {
  if (
    !doc.value.response ||
    !(
      doc.value.response.type === "success" ||
      doc.value.response.type === "fail"
    )
  )
    return null
  return doc.value.response.headers
})

const requestHeaders = computed(() => {
  if (
    !props.isTestRunner ||
    !doc.value.response ||
    !(
      doc.value.response.type === "success" ||
      doc.value.response.type === "fail" ||
      doc.value.response.type === "network_fail"
    )
  )
    return null
  return doc.value.response?.req.headers || doc.value.request.headers
})

const validLenses = computed(() => {
  if (!doc.value.response) return []
  return getSuitableLenses(doc.value.response)
})

const showConsoleTab = computed(() => {
  if (!doc.value.testResults?.consoleEntries) {
    return false
  }

  return (
    doc.value.testResults?.consoleEntries.length > 0 &&
    EXPERIMENTAL_SCRIPTING_SANDBOX.value
  )
})

const consoleEntries = computed(() => {
  if (!doc.value.testResults?.consoleEntries) {
    return []
  }

  return doc.value.testResults?.consoleEntries.filter(({ type }) =>
    ["log", "warn", "debug", "error", "info"].includes(type)
  ) as ConsoleEntry[]
})

watch(
  validLenses,
  (newLenses: Lens[]) => {
    if (newLenses.length === 0) {
      selectedLensTab.value = "req-headers"
      return
    }

    const validRenderers = [
      ...newLenses.map((x) => x.renderer),
      "headers",
      "results",
    ]

    const { responseTabPreference } = doc.value

    if (
      responseTabPreference &&
      validRenderers.includes(responseTabPreference)
    ) {
      selectedLensTab.value = responseTabPreference
    } else {
      selectedLensTab.value = newLenses[0].renderer
    }
  },
  { immediate: true }
)

watch(selectedLensTab, (newLensID) => {
  if (props.isTestRunner) return
  doc.value.responseTabPreference = newLensID
})
</script>
