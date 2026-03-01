<template>
  <AukSmartModal :title="t('workspace.manage')" @close="emit('close')">
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Workspace List -->
        <div class="flex flex-col gap-2">
          <div
            v-for="workspace in workspaces"
            :key="workspace.id"
            class="flex items-center justify-between p-3 rounded-lg bg-primaryLight hover:bg-primaryDark transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <IconFolder class="w-5 h-5 text-secondaryLight flex-shrink-0" />
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium truncate">
                    {{ workspace.name }}
                  </span>
                  <span
                    v-if="workspace.id === currentWorkspace?.id"
                    class="px-1.5 py-0.5 text-xs rounded bg-accent/20 text-accent"
                  >
                    {{ t("workspace.current") }}
                  </span>
                  <span
                    v-if="workspace.git?.enabled"
                    class="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400"
                  >
                    Git
                  </span>
                </div>
                <span class="text-xs text-secondaryLight truncate">
                  {{ workspace.path }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1 flex-shrink-0">
              <AukButtonSecondary
                v-tippy="{ content: t('workspace.edit') }"
                :icon="IconEdit"
                @click="editWorkspace(workspace)"
              />
              <AukButtonSecondary
                v-tippy="{ content: t('workspace.delete') }"
                :icon="IconTrash"
                :disabled="workspaces.length <= 1"
                @click="confirmDelete(workspace)"
              />
            </div>
          </div>

          <div
            v-if="workspaces.length === 0"
            class="p-8 text-center text-secondaryLight"
          >
            {{ t("workspace.no_workspaces") }}
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <AukButtonSecondary :label="t('action.close')" @click="emit('close')" />
      </div>
    </template>
  </AukSmartModal>

  <!-- Edit Workspace Dialog -->
  <WorkspaceEditModal
    v-if="editingWorkspace"
    :workspace="editingWorkspace"
    @close="editingWorkspace = null"
    @updated="onWorkspaceUpdated"
  />

  <!-- Delete Confirmation Dialog -->
  <AukSmartConfirmModal
    :show="!!deletingWorkspace"
    :title="t('workspace.delete_confirm_title')"
    @hide-modal="deletingWorkspace = null"
    @resolve="handleDelete"
  >
    <template #body>
      <p class="text-secondaryLight">
        {{
          t("workspace.delete_confirm_message", {
            name: deletingWorkspace?.name,
          })
        }}
      </p>
      <p class="mt-2 text-sm text-secondaryDark">
        {{ t("workspace.delete_confirm_hint") }}
      </p>
    </template>
  </AukSmartConfirmModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useWorkspaceStore, type Workspace } from "~/store/workspace"
import { useToast } from "~/composables/toast"
import IconFolder from "~icons/lucide/folder"
import IconEdit from "~icons/lucide/edit"
import IconTrash from "~icons/lucide/trash-2"
import WorkspaceEditModal from "./WorkspaceEditModal.vue"

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()
const toast = useToast()
const { workspaces, currentWorkspace, deleteWorkspace } = useWorkspaceStore()

const editingWorkspace = ref<Workspace | null>(null)
const deletingWorkspace = ref<Workspace | null>(null)

function editWorkspace(workspace: Workspace) {
  editingWorkspace.value = workspace
}

function confirmDelete(workspace: Workspace) {
  deletingWorkspace.value = workspace
}

async function handleDelete() {
  if (!deletingWorkspace.value) return

  try {
    await deleteWorkspace(deletingWorkspace.value.id)
    toast.success(t("workspace.deleted"))
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : t("workspace.delete_error")
    )
  } finally {
    deletingWorkspace.value = null
  }
}

function onWorkspaceUpdated() {
  editingWorkspace.value = null
  toast.success(t("workspace.updated"))
}
</script>
