<template>
  <div
    :class="{
      'rounded border border-divider': saveRequest,
      'bg-primaryDark':
        draggingToRoot && currentReorderingStatus.type !== 'request',
    }"
    class="flex-1"
    @drop.prevent="dropToRoot"
    @dragover.prevent="draggingToRoot = true"
    @dragend="draggingToRoot = false"
  >
    <div
      class="sticky z-10 flex flex-shrink-0 flex-col overflow-x-auto bg-primary border-b border-dividerLight"
      :class="{ 'rounded-t': saveRequest }"
      :style="
        saveRequest ? 'top: calc(-1 * var(--line-height-body))' : 'top: 0'
      "
    >
      <WorkspaceCurrent :section="t('tab.collections')" />
      <input
        v-model="filterTexts"
        type="search"
        autocomplete="off"
        class="flex w-full bg-transparent px-4 py-2 h-8"
        :placeholder="t('action.search')"
      />
    </div>
    <CollectionsMyCollections
      :collections-type="collectionsType"
      :filtered-collections="filteredCollections"
      :filter-text="filterTexts"
      :save-request="saveRequest"
      :picked="picked"
      @run-collection="
        runCollectionHandler({
          type: 'my-collections',
          collectionID: $event.collection._ref_id,
          collectionIndex: $event.collectionIndex,
        })
      "
      @add-folder="addFolder"
      @add-request="addRequest"
      @edit-request="editRequest"
      @edit-collection="editCollection"
      @edit-folder="editFolder"
      @edit-response="editResponse"
      @drop-request="dropRequest"
      @drop-collection="dropCollection"
      @display-modal-add="displayModalAdd(true)"
      @display-modal-import-export="
        displayModalImportExport(true, 'my-collections')
      "
      @duplicate-collection="duplicateCollection"
      @open-documentation="openDocumentation"
      @open-request-documentation="openRequestDocumentation"
      @duplicate-request="duplicateRequest"
      @duplicate-response="duplicateResponse"
      @edit-properties="editProperties"
      @export-data="exportData"
      @remove-collection="removeCollection"
      @remove-folder="removeFolder"
      @remove-request="removeRequest"
      @remove-response="removeResponse"
      @share-request="shareRequest"
      @add-example="addExample"
      @select="selectPicked"
      @select-response="selectResponse"
      @select-request="selectRequest"
      @sort-collections="sortCollections"
      @update-request-order="updateRequestOrder"
      @update-collection-order="updateCollectionOrder"
    />
    <div
      class="py-15 hidden flex-1 flex-col items-center justify-center bg-primaryDark px-4 text-secondaryLight"
      :class="{
        '!flex': draggingToRoot && currentReorderingStatus.type !== 'request',
      }"
    >
      <icon-lucide-list-end class="svg-icons !h-8 !w-8" />
    </div>
    <CollectionsAdd
      :show="showModalAdd"
      :loading-state="modalLoadingState"
      @submit="addNewRootCollection"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsAddRequest
      :show="showModalAddRequest"
      :loading-state="modalLoadingState"
      @add-request="onAddRequest"
      @hide-modal="displayModalAddRequest(false)"
    />
    <CollectionsAddFolder
      :show="showModalAddFolder"
      :loading-state="modalLoadingState"
      @add-folder="onAddFolder"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsEdit
      :show="showModalEditCollection"
      :editing-collection-name="editingCollectionName ?? ''"
      :loading-state="modalLoadingState"
      @hide-modal="displayModalEditCollection(false)"
      @submit="updateEditingCollection"
    />
    <CollectionsEditFolder
      :show="showModalEditFolder"
      :editing-folder-name="editingFolderName ?? ''"
      :loading-state="modalLoadingState"
      @submit="updateEditingFolder"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsEditRequest
      v-model="editingRequestName"
      :show="showModalEditRequest"
      :request-context="editingRequest"
      :loading-state="modalLoadingState"
      @submit="updateEditingRequest"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsEditResponse
      v-model="editingResponseName"
      :show="showModalEditResponse"
      :request-context="editingRequest"
      :loading-state="modalLoadingState"
      @submit="updateEditingResponse"
      @hide-modal="displayModalEditResponse(false)"
    />
    <AukSmartModal
      v-if="showAddExampleModal"
      dialog
      :title="t('action.add_example')"
      @close="displayModalAddExample(false)"
    >
      <template #body>
        <div class="flex gap-1">
          <AukSmartInput
            v-model="editingResponseName"
            class="flex-grow"
            placeholder=" "
            :label="t('action.label')"
            input-styles="floating-input !border-0"
            styles="border border-divider rounded"
            @submit="onAddExample"
          />
        </div>
      </template>
      <template #footer>
        <span class="flex space-x-2">
          <AukButtonPrimary
            :label="t('action.add')"
            :loading="modalLoadingState"
            outline
            @click="onAddExample"
          />
          <AukButtonSecondary
            :label="t('action.cancel')"
            outline
            filled
            @click="displayModalAddExample(false)"
          />
        </span>
      </template>
    </AukSmartModal>
    <AukSmartConfirmModal
      :show="showConfirmModal"
      :title="confirmModalTitle"
      :loading-state="modalLoadingState"
      @hide-modal="showConfirmModal = false"
      @resolve="resolveConfirmModal"
    />

    <CollectionsImportExport
      v-if="showModalImportExport"
      :collections-type="collectionsType"
      @hide-modal="displayModalImportExport(false)"
    />

    <CollectionsProperties
      v-model="collectionPropertiesModalActiveTab"
      :show="showModalEditProperties"
      :editing-properties="editingProperties"
      :show-details="false"
      source="REST"
      @hide-modal="displayModalEditProperties(false)"
      @set-collection-properties="setCollectionProperties"
    />
    <CollectionsDocumentation
      v-if="showModalDocumentation"
      :show="showModalDocumentation"
      :path-or-i-d="editingCollectionPath"
      :collection="editingCollection"
      :collection-i-d="undefined"
      :folder-path="editingFolderPath"
      :request-index="editingRequestIndex"
      :request-i-d="editingRequestID"
      :request="editingRequest"
      @hide-modal="displayModalDocumentation(false)"
    />

    <!-- `selectedCollectionID` is guaranteed to be a string when `showCollectionsRunnerModal` is `true` -->
    <HttpTestRunnerModal
      v-if="showCollectionsRunnerModal && collectionRunnerData"
      :collection-runner-data="collectionRunnerData"
      @hide-modal="showCollectionsRunnerModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  generateUniqueRefId,
  getDefaultRESTRequest,
  AukCollection,
  AukRESTRequest,
  AukRESTRequestResponse,
  makeCollection,
  makeAukRESTResponseOriginalRequest,
} from "@auk/data"
import { useService } from "dioc/vue"
import { MODULE_PREFIX_REGEX_JSON_SERIALIZED } from "~/helpers/scripting"

import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { flow } from "fp-ts/function"

import { cloneDeep, isEqual } from "lodash-es"
import { PropType, computed, nextTick, onMounted, ref } from "vue"
import { useReadonlyStream } from "~/composables/stream"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { handleTokenValidation } from "~/helpers/handleTokenValidation"
import {
  getFoldersByPath,
  resolveSaveContextOnCollectionReorder,
  updateInheritedPropertiesForAffectedRequests,
  updateSaveContextForAffectedRequests,
} from "~/helpers/collection/collection"
import {
  getRequestsByPath,
  resolveSaveContextOnRequestReorder,
} from "~/helpers/collection/request"
import { stripRefIdReplacer } from "~/helpers/import-export/export"
import { AukInheritedProperty } from "~/helpers/types/AukInheritedProperties"
import { Picked } from "~/helpers/types/AukPicked"
import {
  addRESTCollection,
  addRESTFolder,
  cascadeParentCollectionForProperties,
  duplicateRESTCollection,
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
  moveRESTFolder,
  moveRESTRequest,
  navigateToFolderWithIndexPath,
  removeRESTCollection,
  removeRESTFolder,
  removeRESTRequest,
  restCollectionStore,
  restCollections$,
  saveRESTRequestAs,
  updateRESTCollectionOrder,
  updateRESTRequestOrder,
  sortRESTCollection,
  sortRESTFolder,
} from "~/store/collections"

import { currentReorderingStatus$ } from "~/store/reordering"
import { platform } from "~/platform"
import { PersistedOAuthConfig } from "~/services/oauth/oauth.service"
import { PersistenceService } from "~/services/persistence"
import { RESTTabService } from "~/services/tab/rest"
import { RESTOptionTabs } from "../http/RequestOptions.vue"
import { Collection as NodeCollection } from "./MyCollections.vue"
import { EditingProperties } from "./Properties.vue"
import { CollectionRunnerData } from "../http/test/RunnerModal.vue"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { CurrentSortValuesService } from "~/services/current-sort.service"

const t = useI18n()
const toast = useToast()
const tabs = useService(RESTTabService)

const props = defineProps({
  saveRequest: {
    type: Boolean,
    default: false,
    required: false,
  },
  picked: {
    type: Object as PropType<Picked | null>,
    default: null,
    required: false,
  },
})

const emit = defineEmits<{
  (event: "select", payload: Picked | null): void
}>()

type CollectionType = { type: "my-collections" }

const collectionsType = ref<CollectionType>({
  type: "my-collections",
})

// Collection Data
const editingCollection = ref<AukCollection | null>(null)
const editingCollectionName = ref<string | null>(null)
const editingCollectionIndex = ref<number | null>(null)
const editingCollectionPath = ref<string | null>(null)

const editingFolder = ref<AukCollection | null>(null)
const editingFolderName = ref<string | null>(null)
const editingFolderPath = ref<string | null>(null)

const editingRequest = ref<AukRESTRequest | null>(null)
const editingRequestName = ref("")
const editingResponseName = ref("")
const editingResponseOldName = ref("")
const editingRequestIndex = ref<number | null>(null)
const editingRequestID = ref<string | null>(null)

const editingResponseID = ref<string | null>(null)
const showAddExampleModal = ref(false)

const editingProperties = ref<EditingProperties>({
  collection: null,
  isRootCollection: false,
  path: "",
  inheritedProperties: undefined,
})

const confirmModalTitle = ref<string | null>(null)

const filterTexts = ref("")

const myCollections = useReadonlyStream(restCollections$, [], "deep")

// Dragging
const draggingToRoot = ref(false)

//collection variables current value and secret value
const secretEnvironmentService = useService(SecretEnvironmentService)
const currentEnvironmentValueService = useService(CurrentValueService)

// Sorting service to get and set sort options for collections and folders
const currentSortValuesService = useService(CurrentSortValuesService)

const persistenceService = useService(PersistenceService)

const collectionPropertiesModalActiveTab = ref<RESTOptionTabs>("headers")

onMounted(async () => {
  const localOAuthTempConfig =
    await persistenceService.getLocalConfig("oauth_temp_config")

  if (!localOAuthTempConfig) {
    return
  }

  const { context, source, token, refresh_token }: PersistedOAuthConfig =
    JSON.parse(localOAuthTempConfig)

  if (source === "GraphQL") {
    return
  }

  if (context?.type === "collection-properties") {
    // load the unsaved editing properties
    const unsavedCollectionPropertiesString =
      await persistenceService.getLocalConfig("unsaved_collection_properties")

    if (unsavedCollectionPropertiesString) {
      const unsavedCollectionProperties: EditingProperties = JSON.parse(
        unsavedCollectionPropertiesString
      )

      const auth = unsavedCollectionProperties.collection?.auth

      if (auth?.authType === "oauth-2") {
        const grantTypeInfo = auth.grantTypeInfo

        grantTypeInfo && (grantTypeInfo.token = token ?? "")

        if (refresh_token && grantTypeInfo.grantType === "AUTHORIZATION_CODE") {
          grantTypeInfo.refreshToken = refresh_token
        }
      }

      editingProperties.value = unsavedCollectionProperties
    }

    await persistenceService.removeLocalConfig("oauth_temp_config")
    collectionPropertiesModalActiveTab.value = "authorization"
    showModalEditProperties.value = true
  }
})

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

const filteredCollections = computed(() => {
  const collections = myCollections.value

  if (filterTexts.value === "") return collections

  const filterText = filterTexts.value.toLowerCase()
  const filteredCollections = []

  const isMatch = (text: string) => text.toLowerCase().includes(filterText)

  const isRequestMatch = (request: AukRESTRequest) =>
    isMatch(request.name) || isMatch(request.endpoint)

  for (const collection of collections) {
    const filteredRequests = []
    const filteredFolders = []
    for (const request of collection.requests) {
      if (isRequestMatch(request as AukRESTRequest))
        filteredRequests.push(request)
    }
    for (const folder of collection.folders) {
      if (isMatch(folder.name)) filteredFolders.push(folder)
      const filteredFolderRequests = []
      for (const request of folder.requests) {
        if (isRequestMatch(request)) filteredFolderRequests.push(request)
      }
      if (filteredFolderRequests.length > 0) {
        const filteredFolder = Object.assign({}, folder)
        filteredFolder.requests = filteredFolderRequests
        filteredFolders.push(filteredFolder)
      }
    }

    if (
      filteredRequests.length + filteredFolders.length > 0 ||
      isMatch(collection.name)
    ) {
      const filteredCollection = Object.assign({}, collection)
      filteredCollection.requests = filteredRequests
      filteredCollection.folders = filteredFolders
      filteredCollections.push(filteredCollection)
    }
  }

  return filteredCollections
})

const isSelected = ({
  collectionIndex,
  folderPath,
  requestIndex,
}: {
  collectionIndex?: number | undefined
  folderPath?: string | undefined
  requestIndex?: number | undefined
}) => {
  if (collectionIndex !== undefined) {
    return (
      props.picked &&
      props.picked.pickedType === "my-collection" &&
      props.picked.collectionIndex === collectionIndex
    )
  } else if (requestIndex !== undefined && folderPath !== undefined) {
    return (
      props.picked &&
      props.picked.pickedType === "my-request" &&
      props.picked.folderPath === folderPath &&
      props.picked.requestIndex === requestIndex
    )
  } else if (folderPath !== undefined) {
    return (
      props.picked &&
      props.picked.pickedType === "my-folder" &&
      props.picked.folderPath === folderPath
    )
  }
}

const modalLoadingState = ref(false)
const showModalAdd = ref(false)
const showModalAddRequest = ref(false)
const showModalAddFolder = ref(false)
const showModalEditCollection = ref(false)
const showModalEditFolder = ref(false)
const showModalEditRequest = ref(false)
const showModalEditResponse = ref(false)
const showModalImportExport = ref(false)
const showModalEditProperties = ref(false)
const showModalDocumentation = ref(false)
const showConfirmModal = ref(false)

const showCollectionsRunnerModal = ref(false)
const collectionRunnerData = ref<CollectionRunnerData | null>(null)

const displayModalAdd = (show: boolean) => {
  showModalAdd.value = show

  if (!show) resetSelectedData()
}

const displayModalAddRequest = (show: boolean) => {
  showModalAddRequest.value = show

  if (!show) resetSelectedData()
}

const displayModalAddFolder = (show: boolean) => {
  showModalAddFolder.value = show

  if (!show) resetSelectedData()
}

const displayModalEditCollection = (show: boolean) => {
  showModalEditCollection.value = show

  if (!show) resetSelectedData()
}

const displayModalEditFolder = (show: boolean) => {
  showModalEditFolder.value = show

  if (!show) resetSelectedData()
}

const displayModalEditRequest = (show: boolean) => {
  showModalEditRequest.value = show

  if (!show) resetSelectedData()
}

const displayModalEditResponse = (show: boolean) => {
  showModalEditResponse.value = show

  if (!show) resetSelectedData()
}

const displayModalImportExport = async (
  show: boolean,
  collectionType?: string
) => {
  if (collectionType === "my-collections") {
    const isValidToken = await handleTokenValidation()
    if (!isValidToken) return
  }
  showModalImportExport.value = show

  if (!show) resetSelectedData()
}

const displayModalEditProperties = (show: boolean) => {
  showModalEditProperties.value = show

  if (!show) resetSelectedData()
}

const displayConfirmModal = (show: boolean) => {
  showConfirmModal.value = show

  if (!show) resetSelectedData()
}

const displayModalDocumentation = (show: boolean) => {
  showModalDocumentation.value = show

  if (!show) resetSelectedData()
}

const displayModalAddExample = (show: boolean) => {
  showAddExampleModal.value = show

  if (!show) resetSelectedData()
}

const addNewRootCollection = async (name: string) => {
  modalLoadingState.value = true
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) {
    modalLoadingState.value = false
    return
  }
  addRESTCollection(
    makeCollection({
      name,
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "none",
        authActive: true,
      },
      variables: [],
      description: "",
    })
  )

  platform.analytics?.logEvent({
    type: "AUK_CREATE_COLLECTION",
    platform: "rest",
    workspaceType: "personal",
    isRootCollection: true,
  })

  modalLoadingState.value = false
  displayModalAdd(false)
}

const addRequest = (payload: { path: string; folder: AukCollection }) => {
  const { path, folder } = payload
  editingFolder.value = folder
  editingFolderPath.value = path
  displayModalAddRequest(true)
}

const onAddRequest = async (requestName: string) => {
  const newRequest = {
    ...getDefaultRESTRequest(),
    name: requestName,
  }

  const path = editingFolderPath.value
  if (!path) return

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return

  const insertionIndex = saveRESTRequestAs(path, newRequest)

  tabs.createNewTab({
    type: "request",
    request: newRequest,
    isDirty: false,
    saveContext: {
      originLocation: "user-collection",
      folderPath: path,
      requestIndex: insertionIndex,
      requestRefID: newRequest._ref_id,
    },
    inheritedProperties: cascadeParentCollectionForProperties(path, "rest"),
  })

  platform.analytics?.logEvent({
    type: "AUK_SAVE_REQUEST",
    workspaceType: "personal",
    createdNow: true,
    platform: "rest",
  })

  displayModalAddRequest(false)
}

const addFolder = (payload: { path: string; folder: AukCollection }) => {
  const { path, folder } = payload
  editingFolder.value = folder
  editingFolderPath.value = path
  displayModalAddFolder(true)
}

const onAddFolder = async (folderName: string) => {
  const path = editingFolderPath.value

  if (!path) return
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  addRESTFolder(folderName, path)

  platform.analytics?.logEvent({
    type: "AUK_CREATE_COLLECTION",
    workspaceType: "personal",
    isRootCollection: false,
    platform: "rest",
  })

  displayModalAddFolder(false)
}

const editCollection = (payload: {
  collectionIndex: string
  collection: AukCollection
}) => {
  const { collectionIndex, collection } = payload
  editingCollection.value = collection
  editingCollectionIndex.value = parseInt(collectionIndex)
  editingCollectionName.value = collection.name

  displayModalEditCollection(true)
}

const updateEditingCollection = async (newName: string) => {
  if (!editingCollection.value) return

  if (!newName) {
    toast.error(t("collection.invalid_name"))
    return
  }

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  const collectionIndex = editingCollectionIndex.value
  if (collectionIndex === null) return

  const collectionUpdated = {
    ...editingCollection.value,
    name: newName,
  }

  editRESTCollection(
    collectionIndex,
    collectionUpdated as NodeCollection["data"]["data"]
  )
  displayModalEditCollection(false)
}

const editFolder = (payload: {
  folderPath: string | undefined
  folder: AukCollection
}) => {
  const { folderPath, folder } = payload
  editingFolder.value = folder
  if (folderPath) {
    editingFolderPath.value = folderPath
    editingFolderName.value = folder.name
  }
  displayModalEditFolder(true)
}

const updateEditingFolder = async (newName: string) => {
  if (!editingFolder.value) return

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  if (!editingFolderPath.value) return

  editRESTFolder(editingFolderPath.value, {
    ...(editingFolder.value as AukCollection),
    name: newName,
  })
  displayModalEditFolder(false)
}

const duplicateCollection = async ({
  pathOrID,
  collectionSyncID,
}: {
  pathOrID: string
  collectionSyncID?: string
}) => {
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  duplicateRESTCollection(pathOrID, collectionSyncID)
}

const editRequest = (payload: {
  folderPath: string | undefined
  requestIndex: string
  request: AukRESTRequest
}) => {
  const { folderPath, requestIndex, request } = payload
  editingRequest.value = request
  editingRequestName.value = request.name ?? ""
  if (folderPath) {
    editingFolderPath.value = folderPath
    editingRequestIndex.value = parseInt(requestIndex)
  }
  displayModalEditRequest(true)
}

const updateEditingRequest = async (newName: string) => {
  const request = editingRequest.value
  if (!request) return

  const requestUpdated = {
    ...request,
    name: newName || request.name,
  }

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return

  const folderPath = editingFolderPath.value
  const requestIndex = editingRequestIndex.value

  if (folderPath === null || requestIndex === null) return

  const possibleActiveTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex,
    folderPath,
  })

  editRESTRequest(folderPath, requestIndex, requestUpdated)

  if (
    possibleActiveTab &&
    possibleActiveTab.value.document.type === "request"
  ) {
    possibleActiveTab.value.document.request.name = requestUpdated.name
    nextTick(() => {
      possibleActiveTab.value.document.isDirty = false
    })
  }

  displayModalEditRequest(false)
}

type ResponseConfigPayload = {
  folderPath: string | undefined
  requestIndex: string
  request: AukRESTRequest
  responseName: string
  responseID: string
}

const editResponse = (payload: ResponseConfigPayload) => {
  const { folderPath, requestIndex, request, responseID, responseName } =
    payload

  editingRequest.value = request
  editingRequestName.value = request.name ?? ""
  editingResponseID.value = responseID
  editingResponseName.value = responseName

  //need to store the old name for updating the response key
  editingResponseOldName.value = responseName
  if (folderPath) {
    editingFolderPath.value = folderPath
    editingRequestIndex.value = parseInt(requestIndex)
  }
  displayModalEditResponse(true)
}

const updateEditingResponse = (newName: string) => {
  const request = cloneDeep(editingRequest.value)
  if (!request) return

  const responseOldName = editingResponseOldName.value

  if (!responseOldName) return

  if (responseOldName !== newName) {
    // Convert object to entries array (preserving order)
    const entries = Object.entries(request.responses)

    // Replace the old key with the new key in the array
    const updatedEntries = entries.map(([key, value]) =>
      key === responseOldName
        ? [newName, { ...value, name: newName }]
        : [key, value]
    )

    // Convert the array back into an object
    request.responses = Object.fromEntries(updatedEntries)
  }

  const folderPath = editingFolderPath.value
  const requestIndex = editingRequestIndex.value

  if (folderPath === null || requestIndex === null) return

  const possibleExampleActiveTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex,
    folderPath,
    exampleID: editingResponseID.value ?? undefined,
  })

  const possibleRequestActiveTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex,
    folderPath,
  })

  editRESTRequest(folderPath, requestIndex, request)

  if (
    possibleExampleActiveTab &&
    possibleExampleActiveTab.value.document.type === "example-response"
  ) {
    possibleExampleActiveTab.value.document.response.name = newName

    nextTick(() => {
      if (possibleExampleActiveTab.value.document.type === "test-runner") return

      possibleExampleActiveTab.value.document.isDirty = false
      possibleExampleActiveTab.value.document.saveContext = {
        originLocation: "user-collection",
        folderPath: folderPath,
        requestIndex: requestIndex,
        exampleID: editingResponseID.value!,
      }
    })
  }

  // update the request tab responses if it's open
  if (
    possibleRequestActiveTab &&
    possibleRequestActiveTab.value.document.type === "request"
  ) {
    possibleRequestActiveTab.value.document.request.responses =
      request.responses
  }

  displayModalEditResponse(false)

  toast.success(t("response.renamed"))
}

const duplicateRequest = async (payload: {
  folderPath: string
  request: AukRESTRequest
}) => {
  const { folderPath, request } = payload
  if (!folderPath) return

  const { id: _, ...requestWithoutID } = request
  const newRequest = {
    ...cloneDeep(requestWithoutID),
    _ref_id: generateUniqueRefId("req"),
    name: `${request.name} - ${t("action.duplicate")}`,
  }

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  saveRESTRequestAs(folderPath, newRequest)
  toast.success(t("request.duplicated"))
}

const duplicateResponse = async (payload: ResponseConfigPayload) => {
  const { folderPath, requestIndex, request, responseName } = payload

  const response = request.responses[responseName]

  if (!response || !folderPath || !requestIndex) return

  const newName = `${responseName} - ${t("action.duplicate")}`

  // if the new name is already taken, show a toast and return
  if (Object.keys(request.responses).includes(newName)) {
    toast.error(t("response.duplicate_name_error"))
    return
  }

  const newResponse = {
    ...cloneDeep(response),
    name: newName,
  }

  const updatedRequest = {
    ...request,
    responses: {
      ...request.responses,
      [newResponse.name]: newResponse,
    },
  }

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  editRESTRequest(folderPath, parseInt(requestIndex), updatedRequest)
  toast.success(t("response.duplicated"))

  const possibleRequestActiveTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex: parseInt(requestIndex),
    folderPath,
  })

  // update the request tab responses if it's open
  if (
    possibleRequestActiveTab &&
    possibleRequestActiveTab.value.document.type === "request"
  ) {
    possibleRequestActiveTab.value.document.request.responses =
      updatedRequest.responses
  }
}

const addExample = (payload: {
  folderPath: string
  request: AukRESTRequest
  requestIndex: string | number
}) => {
  const { folderPath, request, requestIndex } = payload

  // Defensive check to ensure request is valid
  if (!request || typeof request !== "object") {
    console.error("Invalid request object:", request)
    toast.error(t("error.invalid_request"))
    return
  }

  // Additional validation for required request properties
  if (!request.name && !request.endpoint) {
    console.error("Request missing required properties:", request)
    toast.error(t("error.invalid_request"))
    return
  }

  editingRequest.value = request
  editingRequestName.value = request.name ?? ""
  editingResponseName.value = ""
  editingResponseOldName.value = ""

  if (folderPath) {
    editingFolderPath.value = folderPath
    editingRequestIndex.value = parseInt(requestIndex.toString())
  }
  displayModalAddExample(true)
}

const onAddExample = async () => {
  const exampleName = editingResponseName.value.trim()

  if (!exampleName) {
    toast.error(t("response.invalid_name"))
    return
  }

  const request = editingRequest.value
  if (!request || !request.name) {
    toast.error(t("error.invalid_request"))
    return
  }

  // Check if example name already exists
  if (request.responses && request.responses[exampleName]) {
    toast.error(t("response.duplicate_name_error"))
    return
  }

  // Create the original request from the parent request
  const originalRequest = makeAukRESTResponseOriginalRequest({
    name: request.name,
    method: request.method,
    endpoint: request.endpoint,
    headers: request.headers,
    params: request.params,
    body: request.body,
    auth: request.auth,
    requestVariables: request.requestVariables,
  })

  // Create a new example response with default values and original request
  const newExample: AukRESTRequestResponse = {
    name: exampleName,
    code: 200,
    status: "OK",
    headers: [],
    body: "",
    originalRequest,
  }

  // Calculate the new example's index (will be used as exampleID)
  const existingResponsesCount = request.responses
    ? Object.keys(request.responses).length
    : 0
  const newExampleID = existingResponsesCount.toString()

  const updatedRequest = {
    ...request,
    responses: {
      ...request.responses,
      [exampleName]: newExample,
    },
  }

  const folderPath = editingFolderPath.value
  const requestIndex = editingRequestIndex.value

  if (folderPath === null || requestIndex === null) return

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return

  editRESTRequest(folderPath, requestIndex, updatedRequest)
  toast.success(t("response.saved"))

  const possibleRequestActiveTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex,
    folderPath,
  })

  // Update request tab responses if it's open
  if (
    possibleRequestActiveTab &&
    possibleRequestActiveTab.value.document.type === "request"
  ) {
    possibleRequestActiveTab.value.document.request.responses =
      updatedRequest.responses
  }

  // Close the modal first
  displayModalAddExample(false)

  // Open the new example in a new tab
  tabs.createNewTab({
    response: {
      ...cloneDeep(newExample),
      name: exampleName,
    },
    isDirty: false,
    type: "example-response",
    saveContext: {
      originLocation: "user-collection",
      folderPath: folderPath,
      requestIndex: requestIndex,
      exampleID: newExampleID,
    },
    inheritedProperties: cascadeParentCollectionForProperties(
      folderPath,
      "rest"
    ),
  })
}

const removeCollection = (id: string) => {
  editingCollectionIndex.value = parseInt(id)

  confirmModalTitle.value = `${t("confirm.remove_collection")}`
  displayConfirmModal(true)
}

/**
 * Used to delete collections
 */
const onRemoveCollection = async () => {
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  const collectionIndex = editingCollectionIndex.value

  const collectionToRemove =
    collectionIndex || collectionIndex === 0
      ? navigateToFolderWithIndexPath(restCollectionStore.value.state, [
          collectionIndex,
        ])
      : undefined

  if (collectionIndex === null) return

  if (
    isSelected({
      collectionIndex,
    })
  ) {
    emit("select", null)
  }

  removeRESTCollection(
    collectionIndex,
    collectionToRemove ? collectionToRemove.id : undefined
  )

  resolveSaveContextOnCollectionReorder({
    lastIndex: collectionIndex,
    newIndex: -1,
    folderPath: "", // root folder
    length: myCollections.value.length,
  })

  toast.success(t("state.deleted"))
  displayConfirmModal(false)

  // delete the secret collection variables
  // and current collection variables value if the collection is removed
  if (collectionToRemove) {
    secretEnvironmentService.deleteSecretEnvironment(
      collectionToRemove._ref_id ?? `${collectionIndex}`
    )
    currentEnvironmentValueService.deleteEnvironment(
      collectionToRemove._ref_id ?? `${collectionIndex}`
    )
  }
}

const removeFolder = (id: string) => {
  editingFolderPath.value = id

  confirmModalTitle.value = `${t("confirm.remove_folder")}`
  displayConfirmModal(true)
}

const onRemoveFolder = async () => {
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  const folderPath = editingFolderPath.value

  if (!folderPath) return

  if (
    isSelected({
      folderPath,
    })
  ) {
    emit("select", null)
  }

  const folderIndex = pathToLastIndex(folderPath)

  const folderToRemove = folderPath
    ? navigateToFolderWithIndexPath(
        restCollectionStore.value.state,
        folderPath.split("/").map((i) => parseInt(i))
      )
    : undefined

  removeRESTFolder(folderPath, folderToRemove ? folderToRemove.id : undefined)

  const parentFolder = folderPath.split("/").slice(0, -1).join("/") // remove last folder to get parent folder
  resolveSaveContextOnCollectionReorder({
    lastIndex: pathToLastIndex(folderPath),
    newIndex: -1,
    folderPath: parentFolder,
    length: getFoldersByPath(myCollections.value, parentFolder).length,
  })

  toast.success(t("state.deleted"))
  displayConfirmModal(false)

  // delete the secret collection variables
  // and current collection variables value if the collection is removed
  if (folderToRemove) {
    secretEnvironmentService.deleteSecretEnvironment(
      folderToRemove.id ?? `${folderIndex}`
    )
    currentEnvironmentValueService.deleteEnvironment(
      folderToRemove.id ?? `${folderIndex}`
    )
  }
}

const removeRequest = (payload: {
  folderPath: string | null
  requestIndex: string
}) => {
  const { folderPath, requestIndex } = payload
  if (folderPath) {
    editingFolderPath.value = folderPath
    editingRequestIndex.value = parseInt(requestIndex)
  }
  confirmModalTitle.value = `${t("confirm.remove_request")}`
  displayConfirmModal(true)
}

const onRemoveRequest = async () => {
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  const folderPath = editingFolderPath.value
  const requestIndex = editingRequestIndex.value

  if (folderPath === null || requestIndex === null) return

  if (
    isSelected({
      folderPath,
      requestIndex,
    })
  ) {
    emit("select", null)
  }

  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    folderPath,
    requestIndex,
  })

  // If there is a tab attached to this request, dissociate its state and mark it dirty
  if (possibleTab && possibleTab.value.document.type === "request") {
    possibleTab.value.document.saveContext = null
    possibleTab.value.document.isDirty = true

    // since the request is deleted, we need to remove the saved responses as well
    possibleTab.value.document.request.responses = {}

    // remove inherited properties
    possibleTab.value.document.inheritedProperties = undefined
  }

  const requestToRemove = navigateToFolderWithIndexPath(
    restCollectionStore.value.state,
    folderPath.split("/").map((i) => parseInt(i))
  )?.requests[requestIndex]

  removeRESTRequest(folderPath, requestIndex, requestToRemove?.id)

  // the same function is used to reorder requests since after removing, it's basically doing reorder
  resolveSaveContextOnRequestReorder({
    lastIndex: requestIndex,
    newIndex: -1,
    folderPath,
    length: getRequestsByPath(myCollections.value, folderPath).length,
  })

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const removeResponse = (payload: ResponseConfigPayload) => {
  const { folderPath, requestIndex, request, responseID, responseName } =
    payload
  if (folderPath) {
    editingFolderPath.value = folderPath
    editingRequestIndex.value = parseInt(requestIndex)
    editingResponseID.value = responseID
    editingRequest.value = request
    editingResponseName.value = responseName
  }
  confirmModalTitle.value = `${t("confirm.remove_response")}`
  displayConfirmModal(true)
}

const onRemoveResponse = async () => {
  const request = cloneDeep(editingRequest.value)

  if (!request) return

  const responseName = editingResponseName.value
  const responseID = editingResponseID.value

  delete request.responses[responseName]

  const requestUpdated: AukRESTRequest = {
    ...request,
  }

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  const folderPath = editingFolderPath.value
  const requestIndex = editingRequestIndex.value

  if (folderPath === null || requestIndex === null) return

  editRESTRequest(folderPath, requestIndex, requestUpdated)

  const possibleActiveResponseTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    folderPath,
    requestIndex,
    exampleID: responseID ?? undefined,
  })

  const possibleRequestActiveTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex,
    folderPath,
  })

  // If there is a tab attached to this request, close it and set the active tab to the first one
  if (
    possibleActiveResponseTab &&
    possibleActiveResponseTab.value.document.type === "example-response"
  ) {
    const activeTabs = tabs.getActiveTabs()

    // if the last tab is the one we are closing, we need to create a new tab
    if (
      activeTabs.value.length === 1 &&
      activeTabs.value[0].id === possibleActiveResponseTab.value.id
    ) {
      tabs.createNewTab({
        request: getDefaultRESTRequest(),
        isDirty: false,
        type: "request",
        saveContext: undefined,
      })
      tabs.closeTab(possibleActiveResponseTab.value.id)
    } else {
      tabs.closeTab(possibleActiveResponseTab.value.id)
      tabs.setActiveTab(activeTabs.value[0].id)
    }
  }

  // update the request tab responses if it's open
  if (
    possibleRequestActiveTab &&
    possibleRequestActiveTab.value.document.type === "request"
  ) {
    possibleRequestActiveTab.value.document.request.responses =
      requestUpdated.responses
  }

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

// The request is picked in the save request as modal
const selectPicked = (payload: Picked | null) => {
  emit("select", payload)
}

/**
 * This function is called when the user clicks on a request
 * @param selectedRequest The request that the user clicked on emitted from the collection tree
 */
const selectRequest = (selectedRequest: {
  request: AukRESTRequest
  folderPath: string
  requestIndex: string
  isActive: boolean
}) => {
  const { request, folderPath, requestIndex } = selectedRequest
  // If there is a request with this save context, switch into it
  let possibleTab = null

  possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    folderPath,
    requestIndex: parseInt(requestIndex),
  })

  if (possibleTab && possibleTab.value.document.type === "request") {
    tabs.setActiveTab(possibleTab.value.id)
  } else {
    tabs.createNewTab({
      type: "request",
      request: cloneDeep(request),
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath,
        requestIndex: parseInt(requestIndex),
        requestRefID: request._ref_id,
      },
      inheritedProperties: cascadeParentCollectionForProperties(
        folderPath,
        "rest"
      ),
    })
  }
}

const selectResponse = (payload: {
  folderPath: string
  requestIndex: string
  responseName: string
  request: AukRESTRequest
  responseID: string
}) => {
  const { folderPath, requestIndex, responseName, request, responseID } =
    payload

  const response = request.responses[responseName]

  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex: parseInt(requestIndex),
    folderPath: folderPath!,
    exampleID: responseID,
  })

  if (possibleTab) {
    tabs.setActiveTab(possibleTab.value.id)
  } else {
    tabs.createNewTab({
      response: {
        ...cloneDeep(response),
        name: responseName,
      },
      isDirty: false,
      type: "example-response",
      saveContext: {
        originLocation: "user-collection",
        folderPath: folderPath!,
        requestIndex: parseInt(requestIndex),
        exampleID: responseID,
      },
      inheritedProperties: cascadeParentCollectionForProperties(
        folderPath,
        "rest"
      ),
    })
  }
}

/**
 * Used to get the index of the request from the path
 * @param path The path of the request
 * @returns The index of the request
 */
const pathToLastIndex = (path: string) => {
  const pathArr = path.split("/")
  return parseInt(pathArr[pathArr.length - 1])
}

/**
 * This function is called when the user drops the request inside a collection
 * @param payload Object that contains the folder path, request index and the destination collection index
 */
const dropRequest = async (payload: {
  folderPath?: string | undefined
  requestIndex: string
  destinationCollectionIndex: string
  requestRefID?: string
}) => {
  const { folderPath, requestIndex, destinationCollectionIndex, requestRefID } =
    payload

  if (!requestIndex || !destinationCollectionIndex || !folderPath) return

  let possibleTab = null

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    folderPath,
    requestIndex: pathToLastIndex(requestIndex),
    requestRefID,
  })

  // If there is a tab attached to this request, change save its save context
  if (possibleTab && possibleTab.value.document.type === "request") {
    possibleTab.value.document.saveContext = {
      originLocation: "user-collection",
      folderPath: destinationCollectionIndex,
      requestIndex: getRequestsByPath(
        myCollections.value,
        destinationCollectionIndex
      ).length,
      requestRefID: possibleTab.value.document.request._ref_id,
    }

    possibleTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(destinationCollectionIndex, "rest")
  }

  // When it's drop it's basically getting deleted from last folder. reordering last folder accordingly
  resolveSaveContextOnRequestReorder({
    lastIndex: pathToLastIndex(requestIndex),
    newIndex: -1, // being deleted from last folder
    folderPath,
    length: getRequestsByPath(myCollections.value, folderPath).length,
  })
  moveRESTRequest(
    folderPath,
    pathToLastIndex(requestIndex),
    destinationCollectionIndex
  )

  toast.success(`${t("request.moved")}`)
  draggingToRoot.value = false
}

/**
 * @param path The path of the collection or request
 * @returns The index of the collection or request
 */
const pathToIndex = (path: string) => {
  const pathArr = path.split("/")
  return pathArr
}

/**
 * Used to check if the collection exist as the parent of the childrens
 * @param collectionIndexDragged The index of the collection dragged
 * @param destinationCollectionIndex The index of the destination collection
 * @returns True if the collection exist as the parent of the childrens
 */
const checkIfCollectionIsAParentOfTheChildren = (
  collectionIndexDragged: string,
  destinationCollectionIndex: string
) => {
  const collectionDraggedPath = pathToIndex(collectionIndexDragged)
  const destinationCollectionPath = pathToIndex(destinationCollectionIndex)

  if (collectionDraggedPath.length < destinationCollectionPath.length) {
    const slicedDestinationCollectionPath = destinationCollectionPath.slice(
      0,
      collectionDraggedPath.length
    )
    if (isEqual(slicedDestinationCollectionPath, collectionDraggedPath)) {
      return true
    }
    return false
  }

  return false
}

const isMoveToSameLocation = (
  draggedItemPath: string,
  destinationPath: string
) => {
  const draggedItemPathArr = pathToIndex(draggedItemPath)
  const destinationPathArr = pathToIndex(destinationPath)

  if (draggedItemPathArr.length > 0) {
    const draggedItemParentPathArr = draggedItemPathArr.slice(
      0,
      draggedItemPathArr.length - 1
    )

    if (isEqual(draggedItemParentPathArr, destinationPathArr)) {
      return true
    }
    return false
  }
}

/**
 * This function is called when the user moves the collection
 * to a different collection or folder
 * @param payload - object containing the collection index dragged and the destination collection index
 */
const dropCollection = async (payload: {
  collectionIndexDragged: string
  destinationCollectionIndex: string
  currentParentIndex?: string
}) => {
  const { collectionIndexDragged, destinationCollectionIndex } = payload
  if (!collectionIndexDragged || !destinationCollectionIndex) return
  if (collectionIndexDragged === destinationCollectionIndex) return

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  if (
    checkIfCollectionIsAParentOfTheChildren(
      collectionIndexDragged,
      destinationCollectionIndex
    )
  ) {
    toast.error(`${t("collection.parent_coll_move")}`)
    return
  }

  //check if the collection is being moved to its own parent
  if (
    isMoveToSameLocation(collectionIndexDragged, destinationCollectionIndex)
  ) {
    return
  }

  const parentFolder = collectionIndexDragged.split("/").slice(0, -1).join("/") // remove last folder to get parent folder
  const totalFoldersOfDestinationCollection =
    getFoldersByPath(myCollections.value, destinationCollectionIndex).length -
    (parentFolder === destinationCollectionIndex ? 1 : 0)

  moveRESTFolder(collectionIndexDragged, destinationCollectionIndex)

  resolveSaveContextOnCollectionReorder(
    {
      lastIndex: pathToLastIndex(collectionIndexDragged),
      newIndex: -1,
      folderPath: parentFolder,
      length: getFoldersByPath(myCollections.value, parentFolder).length,
    },
    "drop"
  )

  const newCollectionPath = `${destinationCollectionIndex}/${totalFoldersOfDestinationCollection}`

  updateSaveContextForAffectedRequests(
    collectionIndexDragged,
    newCollectionPath
  )

  updateInheritedPropertiesForAffectedRequests(newCollectionPath, "rest")

  draggingToRoot.value = false
  toast.success(`${t("collection.moved")}`)
}

/**
 * Checks if the collection is already in the root
 * @param id - path of the collection, null if it's in the root
 * @returns boolean - true if the collection is already in the root
 */
const isAlreadyInRoot = (id: string | null) => {
  // If there is no id, it means the collection is in the root
  if (!id) return true

  const indexPath = pathToIndex(id)
  return indexPath.length === 1
}

/**
 * This function is called when the user drops the collection
 * to the root
 * @param payload - object containing the collection index dragged
 */
const dropToRoot = async ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    const collectionIndexDragged = dataTransfer.getData("collectionIndex")
    if (!collectionIndexDragged) return
    const isValidToken = await handleTokenValidation()
    if (!isValidToken) return
    // check if the collection is already in the root
    if (isAlreadyInRoot(collectionIndexDragged)) {
      toast.error(`${t("collection.invalid_root_move")}`)
    } else {
      moveRESTFolder(collectionIndexDragged, null)
      toast.success(`${t("collection.moved")}`)

      const rootLength = myCollections.value.length

      updateSaveContextForAffectedRequests(
        collectionIndexDragged,
        `${rootLength - 1}`
      )

      updateInheritedPropertiesForAffectedRequests(`${rootLength - 1}`, "rest")
    }

    draggingToRoot.value = false
  }
}

/**
 * Used to check if the request/collection is being moved to the same parent since reorder is only allowed within the same parent
 * @param draggedItem - path index of the dragged request
 * @param destinationItem - path index of the destination request
 * @param destinationCollectionIndex -  index of the destination collection
 * @returns boolean - true if the request is being moved to the same parent
 */
const isSameSameParent = (
  draggedItemPath: string,
  destinationItemPath: string | null,
  destinationCollectionIndex: string | null
) => {
  const draggedItemIndex = pathToIndex(draggedItemPath)

  // if the destinationItemPath and destinationCollectionIndex is null, it means the request is being moved to the root
  if (destinationItemPath === null && destinationCollectionIndex === null) {
    return draggedItemIndex.length === 1
  } else if (
    destinationItemPath === null &&
    destinationCollectionIndex !== null &&
    draggedItemIndex.length === 1
  ) {
    return draggedItemIndex[0] === destinationCollectionIndex
  } else if (
    destinationItemPath === null &&
    draggedItemIndex.length !== 1 &&
    destinationCollectionIndex !== null
  ) {
    const dragedItemParent = draggedItemIndex.slice(0, -1)

    return dragedItemParent.join("/") === destinationCollectionIndex
  }
  if (destinationItemPath === null) return false
  const destinationItemIndex = pathToIndex(destinationItemPath)

  // length of 1 means the request is in the root
  if (draggedItemIndex.length === 1 && destinationItemIndex.length === 1) {
    return true
  } else if (draggedItemIndex.length === destinationItemIndex.length) {
    const dragedItemParent = draggedItemIndex.slice(0, -1)
    const destinationItemParent = destinationItemIndex.slice(0, -1)
    if (isEqual(dragedItemParent, destinationItemParent)) {
      return true
    }
    return false
  }
  return false
}

/**
 * This function is called when the user updates the request order in a collection
 * @param payload - object containing the request index dragged and the destination request index
 *  with the destination collection index
 */
const updateRequestOrder = async (payload: {
  dragedRequestIndex: string
  destinationRequestIndex: string | null
  destinationCollectionIndex: string
}) => {
  const {
    dragedRequestIndex,
    destinationRequestIndex,
    destinationCollectionIndex,
  } = payload

  if (!dragedRequestIndex || !destinationCollectionIndex) return

  if (dragedRequestIndex === destinationRequestIndex) return

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  if (
    !isSameSameParent(
      dragedRequestIndex,
      destinationRequestIndex,
      destinationCollectionIndex
    )
  ) {
    toast.error(`${t("collection.different_parent")}`)
  } else {
    updateRESTRequestOrder(
      pathToLastIndex(dragedRequestIndex),
      destinationRequestIndex ? pathToLastIndex(destinationRequestIndex) : null,
      destinationCollectionIndex
    )

    toast.success(`${t("request.order_changed")}`)
  }
}

/**
 * This function is called when the user updates the collection or folder order
 * @param payload - object containing the collection index dragged and the destination collection index
 */
const updateCollectionOrder = async (payload: {
  dragedCollectionIndex: string
  destinationCollection: {
    destinationCollectionIndex: string | null
    destinationCollectionParentIndex: string | null
  }
}) => {
  const { dragedCollectionIndex, destinationCollection } = payload
  const { destinationCollectionIndex, destinationCollectionParentIndex } =
    destinationCollection
  if (!dragedCollectionIndex) return
  if (dragedCollectionIndex === destinationCollectionIndex) return

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  if (
    !isSameSameParent(
      dragedCollectionIndex,
      destinationCollectionIndex,
      destinationCollectionParentIndex
    )
  ) {
    toast.error(`${t("collection.different_parent")}`)
  } else {
    updateRESTCollectionOrder(dragedCollectionIndex, destinationCollectionIndex)
    resolveSaveContextOnCollectionReorder({
      lastIndex: pathToLastIndex(dragedCollectionIndex),
      newIndex: pathToLastIndex(
        destinationCollectionIndex ? destinationCollectionIndex : ""
      ),
      folderPath: dragedCollectionIndex.split("/").slice(0, -1).join("/"),
    })
    toast.success(`${t("collection.order_changed")}`)
  }
}
// Import - Export Collection functions

/**
 * Create a downloadable file from a collection and prompts the user to download it.
 * @param collectionJSON - JSON string of the collection
 * @param name - Name of the collection set as the file name
 */
const initializeDownloadCollection = async (
  collectionJSON: string,
  name: string | null
) => {
  const result = await platform.kernelIO.saveFileWithDialog({
    data: collectionJSON,
    contentType: "application/json",
    suggestedFilename: `${name ?? "collection"}.json`,
    filters: [
      {
        name: "Auk Collection JSON file",
        extensions: ["json"],
      },
    ],
  })

  if (result.type === "unknown" || result.type === "saved") {
    toast.success(t("state.download_started").toString())
  }
}

/**
 * Export a specific collection or folder
 * Triggered by the export button in the tippy menu
 * @param collection - Collection or folder to be exported
 */
const exportData = async (collection: AukCollection) => {
  const collectionJSON = JSON.stringify(collection, stripRefIdReplacer, 2)

  // Strip `export {};\n` from `testScript` and `preRequestScript` fields
  const cleanedCollectionJSON = collectionJSON.replace(
    MODULE_PREFIX_REGEX_JSON_SERIALIZED,
    ""
  )

  const name = collection.name

  initializeDownloadCollection(cleanedCollectionJSON, name)
}

const shareRequest = ({ request }: { request: AukRESTRequest }) => {
  invokeAction("share.request", {
    request,
  })
}

/**
 * Used to get the current value of a variable
 * It checks if the variable is a secret or not and returns the value accordingly.
 * @param isSecret If the variable is a secret
 * @param varIndex The index of the variable in the collection
 * @param collectionID The ID of the collection
 * @returns The current value of the variable, either from the secret environment or the current environment service
 */
const getCurrentValue = (
  isSecret: boolean,
  varIndex: number,
  collectionID: string
) => {
  if (isSecret) {
    return secretEnvironmentService.getSecretEnvironmentVariable(
      collectionID,
      varIndex
    )?.value
  }
  return currentEnvironmentValueService.getEnvironmentVariable(
    collectionID,
    varIndex
  )?.currentValue
}

const editProperties = async (payload: {
  collectionIndex: string
  collection: AukCollection
}) => {
  const { collection, collectionIndex } = payload

  const collectionId = collection.id ?? collectionIndex.split("/").pop()

  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return
  const parentIndex = collectionIndex.split("/").slice(0, -1).join("/") // remove last folder to get parent folder

  let inheritedProperties: AukInheritedProperty = {
    auth: {
      parentID: "",
      parentName: "",
      inheritedAuth: {
        authType: "inherit",
        authActive: true,
      },
    },
    headers: [],
    variables: [],
  }

  if (parentIndex) {
    inheritedProperties = cascadeParentCollectionForProperties(
      parentIndex,
      "rest"
    )
  }

  const collectionVariables = pipe(
    (collection as AukCollection).variables ?? [],
    A.mapWithIndex((index, e) => {
      return {
        ...e,
        currentValue:
          getCurrentValue(
            e.secret,
            index,
            (collection as AukCollection)._ref_id ?? collectionId!
          ) ?? e.currentValue,
      }
    })
  )

  editingProperties.value = {
    collection: {
      ...collection,
      variables: collectionVariables,
    } as Partial<AukCollection>,
    isRootCollection: isAlreadyInRoot(collectionIndex),
    path: collectionIndex,
    inheritedProperties,
  }

  displayModalEditProperties(true)
}

const setCollectionProperties = (newCollection: {
  collection: Partial<AukCollection> | null
  isRootCollection: boolean
  path: string
}) => {
  const { collection, path, isRootCollection } = newCollection

  if (!collection) return

  // We default to using collection.id but during the callback to our application, collection.id is not being preserved.
  // Since path is being preserved, we extract the collectionId from path instead
  const collectionId = collection.id ?? path.split("/").pop()

  //setting current value and secret values to of collection variables
  if (collection.variables) {
    const filteredVariables = pipe(
      collection.variables,
      A.filterMap(
        flow(
          O.fromPredicate((e) => e.key !== ""),
          O.map((e) => e)
        )
      )
    )

    const secretVariables = pipe(
      filteredVariables,
      A.filterMapWithIndex((i, e) =>
        e.secret
          ? O.some({
              key: e.key,
              value: e.currentValue,
              varIndex: i,
            })
          : O.none
      )
    )

    const nonSecretVariables = pipe(
      filteredVariables,
      A.filterMapWithIndex((i, e) =>
        !e.secret
          ? O.some({
              key: e.key,
              currentValue: e.currentValue,
              varIndex: i,
              isSecret: e.secret ?? false,
            })
          : O.none
      )
    )

    secretEnvironmentService.addSecretEnvironment(
      collection._ref_id ?? collectionId!,
      secretVariables
    )

    currentEnvironmentValueService.addEnvironment(
      collection._ref_id ?? collectionId!,
      nonSecretVariables
    )

    //set current value and secret values to empty string
    collection.variables = pipe(
      filteredVariables,
      A.map((e) => ({
        ...e,
        currentValue: "",
      }))
    )
  }

  if (isRootCollection) {
    editRESTCollection(parseInt(path), collection)
  } else {
    editRESTFolder(path, collection)
  }

  nextTick(() => {
    updateInheritedPropertiesForAffectedRequests(path, "rest")
  })
  toast.success(t("collection.properties_updated"))

  displayModalEditProperties(false)
}

const runCollectionHandler = (
  payload: CollectionRunnerData & {
    path?: string
  }
) => {
  collectionRunnerData.value = {
    type: "my-collections",
    collectionID: payload.collectionID,
  }
  showCollectionsRunnerModal.value = true
}

const sortCollections = (payload: {
  collectionID: string | null
  sortOrder: "asc" | "desc"
  collectionRefID: string
}) => {
  const { collectionID, sortOrder, collectionRefID } = payload

  const collectionIndex = collectionID ? parseInt(collectionID) : null

  if (isAlreadyInRoot(collectionID)) {
    sortRESTCollection(collectionIndex, sortOrder)
    toast.success(t("collection.sorted"))
  } else {
    if (!collectionID) return

    sortRESTFolder(collectionID, sortOrder)
    toast.success(t("folder.sorted"))
  }

  // Set the sort option in the service to persist the sort option
  // when the user navigates away and comes back
  currentSortValuesService.setSortOption(collectionRefID, {
    sortBy: "name",
    sortOrder,
  })
}

const openDocumentation = ({
  pathOrID,
  collection,
}: {
  pathOrID: string
  collection: AukCollection
}) => {
  editingCollectionPath.value = pathOrID
  editingCollection.value = collection

  displayModalDocumentation(true)
}

const openRequestDocumentation = ({
  folderPath,
  requestIndex,
  request,
}: {
  folderPath: string
  requestIndex: string
  request: AukRESTRequest
}) => {
  editingRequest.value = request
  editingFolderPath.value = folderPath
  editingRequestIndex.value = parseInt(requestIndex)
  editingRequestID.value = requestIndex

  displayModalDocumentation(true)
}

const resolveConfirmModal = (title: string | null) => {
  if (title === `${t("confirm.remove_collection")}`) onRemoveCollection()
  else if (title === `${t("confirm.remove_request")}`) onRemoveRequest()
  else if (title === `${t("confirm.remove_folder")}`) onRemoveFolder()
  else if (title === `${t("confirm.remove_response")}`) onRemoveResponse()
  else {
    console.error(
      `Confirm modal title ${title} is not handled by the component`
    )
    toast.error(t("error.something_went_wrong"))
    displayConfirmModal(false)
  }
}

const resetSelectedData = () => {
  editingCollection.value = null
  editingCollectionIndex.value = null
  editingFolder.value = null
  editingFolderPath.value = null
  editingRequest.value = null
  editingRequestIndex.value = null
  editingRequestID.value = null
  confirmModalTitle.value = null
}

defineActionHandler("collection.new", () => {
  displayModalAdd(true)
})
defineActionHandler("modals.collection.import", () => {
  displayModalImportExport(true)
})
</script>
