<template>
  <div class="flex flex-col">
    <div class="flex flex-col space-y-2">
      <AukSmartItem
        v-for="importer in importers"
        :key="importer.id"
        :icon="importer.icon"
        :label="t(`${importer.name}`)"
        @click="emit('importer-selected', importer.id)"
      />
    </div>
    <hr />
    <div class="flex flex-col space-y-2">
      <template v-for="exporter in exporters">
        <!-- adding the title to a span if the item is visible, otherwise the title won't be shown -->

        <span
          v-if="exporter.disabled && exporter.title"
          :key="`span-${exporter.id}`"
          v-tippy="{ theme: 'tooltip' }"
          :title="t(`${exporter.title}`)"
          class="flex"
        >
          <AukSmartItem
            v-tippy="{ theme: 'tooltip' }"
            :icon="exporter.icon"
            :label="t(`${exporter.name}`)"
            :disabled="exporter.disabled"
            :loading="exporter.loading"
            @click="emit('exporter-selected', exporter.id)"
          />
        </span>

        <AukSmartItem
          v-else
          :key="exporter.id"
          v-tippy="{ theme: 'tooltip' }"
          :icon="exporter.icon"
          :title="t(`${exporter.title}`)"
          :label="t(`${exporter.name}`)"
          :loading="exporter.loading"
          :disabled="exporter.disabled"
          @click="emit('exporter-selected', exporter.id)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { Component } from "vue"

const t = useI18n()

type ImportExportEntryMeta = {
  id: string
  name: string
  icon: Component
  disabled: boolean
  title?: string
  loading?: boolean
  isVisible?: boolean
}

defineProps<{
  importers: ImportExportEntryMeta[]
  exporters: ImportExportEntryMeta[]
}>()

const emit = defineEmits<{
  (e: "importer-selected", importerID: string): void
  (e: "exporter-selected", exporterID: string): void
}>()
</script>
