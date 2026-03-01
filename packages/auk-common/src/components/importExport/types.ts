import { AukCollection } from "@auk/data"
import { Component, Ref } from "vue"
import { defineStep } from "~/composables/step-components"

export type SupportedImportFormat =
  | "auk"
  | "postman"
  | "insomnia"
  | "openapi"
  | "har"

// TODO: move the metadata except disabled and isLoading to importers.ts
export type ImporterOrExporter = {
  metadata: {
    id: string
    name: string
    icon: any
    title: string
    disabled: boolean
    applicableTo: Array<"personal-workspace" | "url-import">
    isLoading?: Ref<boolean>
    format?: SupportedImportFormat
  }
  supported_sources?: {
    id: string
    name: string
    icon: Component
    step: ReturnType<typeof defineStep>
  }[]
  importSummary?: Ref<{
    showImportSummary: boolean
    importedCollections: AukCollection[] | null
  }>
  component?: ReturnType<typeof defineStep>
  action?: (...args: any[]) => any
  onSelect?: () => boolean
}
