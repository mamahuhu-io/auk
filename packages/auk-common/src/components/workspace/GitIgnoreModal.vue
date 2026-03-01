<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('workspace.git_ignore_title')"
    styles="sm:max-w-3xl"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <p class="text-xs text-secondaryLight">
          {{ t("workspace.git_ignore_description") }}
        </p>

        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <IconLoader class="w-6 h-6 animate-spin text-secondaryLight" />
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-if="isNewFile"
            class="text-xs text-amber-500 bg-amber-500/10 px-3 py-2 rounded"
          >
            {{ t("workspace.git_ignore_default_hint") }}
          </div>

          <textarea
            v-model="content"
            class="min-h-[320px] w-full rounded-lg bg-primaryDark border border-dividerDark p-3 text-xs font-mono text-secondaryLight focus:outline-none focus:ring-2 focus:ring-accent/40"
            spellcheck="false"
          ></textarea>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <AukButtonSecondary
          :label="t('workspace.git_ignore_reset')"
          :disabled="isLoading || isSaving"
          @click="resetToDefault"
        />
        <div class="flex items-center gap-2">
          <AukButtonSecondary
            :label="t('action.close')"
            :disabled="isSaving"
            @click="emit('close')"
          />
          <AukButtonPrimary
            :label="t('action.save')"
            :loading="isSaving"
            :disabled="isLoading || isSaving"
            @click="saveGitIgnore"
          />
        </div>
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { useWorkspaceStore } from "~/store/workspace"
import { getGitService } from "~/services/git/tauri-git"
import { getFileSystem } from "~/services/workspace-storage/filesystem"
import { joinPath } from "~/platform/capabilities"
import IconLoader from "~icons/lucide/loader"

const DEFAULT_GITIGNORE = `# Secrets
*.secret.json
secrets/

# Local state
.local/
*.local.json

# System files
.DS_Store
Thumbs.db`

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()
const toast = useToast()
const fs = getFileSystem()
const gitService = getGitService()
const { currentWorkspace } = useWorkspaceStore()

const content = ref("")
const isLoading = ref(false)
const isSaving = ref(false)
const isNewFile = ref(false)

const workspacePath = computed(() => currentWorkspace.value?.path)

async function loadGitIgnore() {
  if (!workspacePath.value) {
    toast.error(t("workspace.git_ignore_load_failed"))
    return
  }

  isLoading.value = true
  try {
    const path = await joinPath(workspacePath.value, ".gitignore")
    const exists = await fs.fileExists(path)
    if (exists) {
      content.value = await fs.readFile(path)
      isNewFile.value = false
    } else {
      content.value = DEFAULT_GITIGNORE
      isNewFile.value = true
    }
  } catch (error) {
    console.error("[GitIgnoreModal] Failed to load .gitignore:", error)
    toast.error(t("workspace.git_ignore_load_failed"))
  } finally {
    isLoading.value = false
  }
}

async function saveGitIgnore() {
  if (!workspacePath.value) {
    toast.error(t("workspace.git_ignore_save_failed"))
    return
  }

  isSaving.value = true
  try {
    const path = await joinPath(workspacePath.value, ".gitignore")
    await fs.writeFileAtomic(path, content.value)
    if (currentWorkspace.value?.git?.enabled) {
      try {
        const isRepo = await gitService.isRepo(workspacePath.value)
        if (isRepo) {
          await gitService.add(workspacePath.value, [".gitignore"])
        }
      } catch (error) {
        console.warn("[GitIgnoreModal] Failed to stage .gitignore:", error)
      }
    }
    isNewFile.value = false
    toast.success(t("workspace.git_ignore_saved"))
  } catch (error) {
    console.error("[GitIgnoreModal] Failed to save .gitignore:", error)
    toast.error(t("workspace.git_ignore_save_failed"))
  } finally {
    isSaving.value = false
  }
}

function resetToDefault() {
  content.value = DEFAULT_GITIGNORE
}

watch(
  () => [props.show, workspacePath.value],
  ([show]) => {
    if (show) loadGitIgnore()
  },
  { immediate: true }
)
</script>
