<template>
  <AukSmartTabs
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
        :is-savable="false"
        :is-editable="true"
        @save-as-example="$emit('save-as-example')"
      />
    </AukSmartTab>
    <AukSmartTab
      v-if="doc.response.headers"
      id="headers"
      :label="t('response.headers')"
      :info="`${doc.response.headers.length}`"
      class="flex flex-1 flex-col"
    >
      <LensesHeadersRenderer
        v-model="doc.response.headers"
        :is-editable="true"
      />
    </AukSmartTab>
  </AukSmartTabs>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import {
  getSuitableLenses,
  getLensRenderers,
  Lens,
} from "~/helpers/lenses/lenses"
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import {
  AukRequestDocument,
  AukSavedExampleDocument,
} from "~/helpers/rest/document"

const props = defineProps<{
  document: AukSavedExampleDocument
}>()

const emit = defineEmits<{
  (e: "update:document", document: AukRequestDocument): void
  (e: "save-as-example"): void
}>()

const doc = useVModel(props, "document", emit)

const allLensRenderers = getLensRenderers()

function lensRendererFor(name: string) {
  return allLensRenderers[name]
}

const t = useI18n()

const selectedLensTab = ref("")

const validLenses = computed(() => {
  if (!doc.value.response) return []
  return getSuitableLenses(doc.value.response)
})

watch(
  validLenses,
  (newLenses: Lens[]) => {
    if (newLenses.length === 0 || selectedLensTab.value) return

    selectedLensTab.value = newLenses[0].renderer
  },
  { immediate: true }
)
</script>
