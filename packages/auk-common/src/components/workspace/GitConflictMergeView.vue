<template>
  <div class="flex flex-col h-full">
    <!-- Error State -->
    <div
      v-if="error && !conflictContent"
      class="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 shrink-0 mb-4"
    >
      <IconAlertCircle class="w-5 h-5 shrink-0" />
      <span class="text-sm">{{ error }}</span>
    </div>

    <!-- Merge View -->
    <div v-else-if="conflictContent" class="flex flex-col flex-1 min-h-0">
      <div
        class="grid grid-cols-2 gap-3 text-xs font-semibold text-secondaryDark mb-2 px-2 shrink-0"
      >
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>
            {{ t("workspace.git_remote_version") }}
            <span class="font-normal text-secondaryLight ml-1">(Incoming)</span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-green-500"></div>
          <span>
            {{ t("workspace.git_local_version") }}
            <span class="font-normal text-secondaryLight ml-1">(Current)</span>
          </span>
        </div>
      </div>

      <div
        class="relative flex-1 min-h-0 overflow-hidden border border-dividerLight rounded bg-primaryDark"
      >
        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center bg-primaryDark/70 z-10"
        >
          <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
        </div>
        <div ref="mergeContainer" class="h-full w-full overflow-hidden"></div>
      </div>
    </div>

    <!-- No Content State -->
    <div
      v-else
      class="flex flex-col items-center justify-center flex-1 text-secondaryLight"
    >
      <IconFileDiff class="w-12 h-12 mb-2 opacity-50" />
      <span class="text-sm">{{ t("workspace.git_select_conflict") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue"
import { MergeView } from "@codemirror/merge"
import { EditorState } from "@codemirror/state"
import { basicSetup, baseTheme } from "@helpers/editor/themes/baseTheme"
import type { ConflictContent } from "~/services/git/types"
import { useI18n } from "~/composables/i18n"
import IconLoader from "~icons/lucide/loader"
import IconAlertCircle from "~icons/lucide/alert-circle"
import IconFileDiff from "~icons/lucide/file-diff"

const props = defineProps<{
  file: string
  conflictContent: ConflictContent | null
  isLoading: boolean
  error: string | null
  isSaving: boolean
}>()

const t = useI18n()
const mergeContainer = ref<Element | null>(null)
let mergeView: MergeView | null = null

const updateEditorDoc = (doc: string) => {
  if (!mergeView) return
  mergeView.b.dispatch({
    changes: { from: 0, to: mergeView.b.state.doc.length, insert: doc },
  })
}

const updateLeftDoc = (doc: string) => {
  if (!mergeView) return
  mergeView.a.dispatch({
    changes: { from: 0, to: mergeView.a.state.doc.length, insert: doc },
  })
}

const initMergeView = () => {
  if (!mergeContainer.value || mergeView) return

  mergeView = new MergeView({
    a: {
      doc: props.conflictContent?.theirs ?? "",
      extensions: [basicSetup, baseTheme, EditorState.readOnly.of(true)],
    },
    b: {
      doc: props.conflictContent?.ours ?? "",
      extensions: [basicSetup, baseTheme],
    },
    parent: mergeContainer.value,
    highlightChanges: true,
    revertControls: "a-to-b",
    gutter: true,
  })
}

const setEditorContent = (content: string) => {
  updateEditorDoc(content)
}

watch(mergeContainer, () => {
  initMergeView()
})

watch(
  () => props.conflictContent,
  (content) => {
    if (!content) {
      if (mergeView) {
        mergeView.destroy()
        mergeView = null
      }
      return
    }

    // If view doesn't exist, init it
    if (!mergeView) {
      initMergeView()
      return
    }

    // Update content
    // We only update if the file matches, but here we assume the parent controls the content flow
    updateLeftDoc(content.theirs ?? "")
    updateEditorDoc(content.ours ?? "")
  }
)

onUnmounted(() => {
  if (mergeView) {
    mergeView.destroy()
    mergeView = null
  }
})

const getContent = (): string => {
  if (!mergeView) return ""
  return mergeView.b.state.doc.toString()
}

defineExpose({
  setEditorContent,
  getContent,
})
</script>

<style scoped>
:deep(.cm-mergeView) {
  height: 100%;
}
:deep(.cm-editor) {
  height: 100%;
}
:deep(.cm-scroller) {
  overflow: auto;
  height: 100%;
}
</style>
