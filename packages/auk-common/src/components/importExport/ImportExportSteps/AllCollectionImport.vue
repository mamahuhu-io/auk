<template>
  <div class="select-wrapper flex flex-col gap-2">
    <div>
      <p class="flex items-center">
        <span
          class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
        >
          <icon-lucide-check-circle class="svg-icons" />
        </span>
        <span>
          {{ t(`action.choose_collection`) }}
        </span>
      </p>
      <div class="pl-10">
        <select
          v-model="selectedCollectionID"
          autocomplete="off"
          class="select mt-2"
          autofocus
        >
          <option :key="undefined" :value="undefined" disabled selected>
            {{ t("collection.select") }}
          </option>
          <option
            v-for="collection in selectableCollections"
            :key="collection.id"
            :value="collection.id"
            class="bg-primary"
          >
            {{ collection.title }}
          </option>
        </select>
      </div>
    </div>
  </div>

  <div class="my-4">
    <AukButtonPrimary
      class="w-full"
      :label="t('import.title')"
      :loading="loading"
      :disabled="!hasSelectedCollectionID || loading"
      @click="getCollectionDetailsAndImport"
    />
  </div>
</template>

<script setup lang="ts">
import { AukCollection } from "@auk/data"
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { getRESTCollection, restCollections$ } from "~/store/collections"

const t = useI18n()

defineProps<{
  loading: boolean
}>()

const selectedCollectionID = ref<string | undefined>(undefined)

const hasSelectedCollectionID = computed(() => {
  return selectedCollectionID.value !== undefined
})

const personalCollections = useReadonlyStream(restCollections$, [])

const selectableCollections = computed(() => {
  return personalCollections.value.map((collection, collectionIndex) => ({
    id: `${collectionIndex}`,
    title: collection.name,
  }))
})

const emit = defineEmits<{
  (e: "importCollection", content: AukCollection): void
}>()

const getCollectionDetailsAndImport = async () => {
  if (!selectedCollectionID.value) {
    return
  }

  const collectionToImport = getRESTCollection(
    parseInt(selectedCollectionID.value)
  )

  emit("importCollection", collectionToImport)
}
</script>
