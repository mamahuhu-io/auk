<!-- eslint-disable prettier/prettier -->
<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="`${t('collection.save_as')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <div class="flex gap-1">
          <AukSmartInput
            v-model="requestName"
            class="flex-grow"
            styles="relative flex"
            placeholder=" "
            :label="t('request.name')"
            input-styles="floating-input"
            @submit="saveRequestAs"
          />
          <AukButtonSecondary
            v-if="canDoRequestNameGeneration"
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconSparkle"
            :disabled="isGenerateRequestNamePending"
            class="rounded-md"
            :class="{
              'animate-pulse': isGenerateRequestNamePending,
            }"
            :title="t('ai_experiments.generate_request_name')"
            @click="
              async () => {
                await generateRequestName(requestContext)
                submittedFeedback = false
              }
            "
          />
        </div>

        <label class="p-4">
          {{ t("collection.select_location") }}
        </label>
        <CollectionsGraphql
          v-if="mode === 'graphql'"
          :picked="picked"
          :save-request="true"
          @select="onSelect"
        />
        <Collections
          v-else
          :picked="picked"
          :save-request="true"
          @select="onSelect"
          @update-collection-type="updateCollectionType"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div class="flex space-x-2">
          <AukButtonPrimary
            :label="`${t('action.save')}`"
            :loading="modalLoadingState"
            outline
            @click="saveRequestAs"
          />
          <AukButtonSecondary
            :label="`${t('action.cancel')}`"
            outline
            filled
            @click="hideModal"
          />
        </div>

        <div
          v-if="lastTraceID && !submittedFeedback"
          class="flex items-center gap-2"
        >
          <p>{{ t("ai_experiments.feedback_cta_request_name") }}</p>
          <template v-if="!isSubmitFeedbackPending">
            <AukButtonSecondary
              :icon="IconThumbsUp"
              outline
              @click="
                async () => {
                  if (lastTraceID) {
                    await submitFeedback('positive', lastTraceID)
                    submittedFeedback = true
                  }
                }
              "
            />
            <AukButtonSecondary
              :icon="IconThumbsDown"
              outline
              @click="
                async () => {
                  if (lastTraceID) {
                    await submitFeedback('negative', lastTraceID)
                    submittedFeedback = true
                  }
                }
              "
            />
          </template>
          <template v-else>
            <AukSmartSpinner />
          </template>
        </div>
        <div v-if="submittedFeedback">
          <p>{{ t("ai_experiments.feedback_thank_you") }}</p>
        </div>
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { AukGQLRequest, AukRESTRequest, isAukRESTRequest } from "@auk/data"
import { computedWithControl } from "@vueuse/core"
import { useService } from "dioc/vue"
import { cloneDeep } from "lodash-es"
import { computed, nextTick, reactive, ref, watch } from "vue"
import {
  useRequestNameGeneration,
  useSubmitFeedback,
} from "~/composables/ai-experiments"
import { Picked } from "~/helpers/types/AukPicked"
import {
  cascadeParentCollectionForProperties,
  editGraphqlRequest,
  editRESTRequest,
  saveGraphqlRequestAs,
  saveRESTRequestAs,
} from "~/store/collections"
import { platform } from "~/platform"
import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"
import IconSparkle from "~icons/lucide/sparkles"
import IconThumbsDown from "~icons/lucide/thumbs-down"
import IconThumbsUp from "~icons/lucide/thumbs-up"
import { handleTokenValidation } from "~/helpers/handleTokenValidation"

const t = useI18n()
const toast = useToast()

const RESTTabs = useService(RESTTabService)
const GQLTabs = useService(GQLTabService)

type CollectionType = { type: "my-collections" }

const props = withDefaults(
  defineProps<{
    show?: boolean
    mode?: "rest" | "graphql"
    request?: AukRESTRequest | AukGQLRequest | null
  }>(),
  {
    show: false,
    mode: "rest",
    request: null,
  }
)

const emit = defineEmits<{
  (
    event: "edit-request",
    payload: {
      folderPath: string
      requestIndex: string
      request: AukRESTRequest
    }
  ): void
  (e: "hide-modal"): void
}>()

const gqlRequestName = computedWithControl(
  () => GQLTabs.currentActiveTab.value,
  () => GQLTabs.currentActiveTab.value.document.request.name
)

const restRequestName = computedWithControl(
  () => RESTTabs.currentActiveTab.value,
  () =>
    RESTTabs.currentActiveTab.value.document.type === "request"
      ? RESTTabs.currentActiveTab.value.document.request.name
      : ""
)

const reqName = computed(() => {
  if (props.request) {
    return props.request.name
  } else if (props.mode === "rest") {
    return restRequestName.value
  }
  return gqlRequestName.value
})

const requestContext = computed(() => {
  if (props.request) {
    return props.request
  }

  if (
    props.mode === "rest" &&
    RESTTabs.currentActiveTab.value.document.type === "request"
  ) {
    return RESTTabs.currentActiveTab.value.document.request
  }

  return GQLTabs.currentActiveTab.value.document.request
})

const requestName = ref(reqName.value)

const {
  canDoRequestNameGeneration,
  generateRequestName,
  isGenerateRequestNamePending,
  lastTraceID,
} = useRequestNameGeneration(requestName)

watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      submittedFeedback.value = false
      lastTraceID.value = null
    }
  }
)

const submittedFeedback = ref(false)
const { submitFeedback, isSubmitFeedbackPending } = useSubmitFeedback()

watch(
  () => [RESTTabs.currentActiveTab.value, GQLTabs.currentActiveTab.value],
  () => {
    if (
      props.mode === "rest" &&
      RESTTabs.currentActiveTab.value.document.type === "request"
    ) {
      requestName.value =
        RESTTabs.currentActiveTab.value?.document.request.name ?? ""
    } else {
      requestName.value =
        GQLTabs.currentActiveTab.value?.document.request.name ?? ""
    }
  }
)

const requestData = reactive({
  name: requestName,
  collectionIndex: undefined as number | undefined,
  folderName: undefined as number | undefined,
  requestIndex: undefined as number | undefined,
})

const collectionsType = ref<CollectionType>({
  type: "my-collections",
})

const picked = ref<Picked | null>(null)

const modalLoadingState = ref(false)

// Resets
watch(
  () => requestData.collectionIndex,
  () => {
    requestData.folderName = undefined
    requestData.requestIndex = undefined
  }
)
watch(
  () => requestData.folderName,
  () => {
    requestData.requestIndex = undefined
  }
)

const updateCollectionType = (type: CollectionType["type"]) => {
  collectionsType.value.type = type
}

const onSelect = (pickedVal: Picked | null) => {
  picked.value = pickedVal
}

const saveRequestAs = async () => {
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return

  if (!requestName.value) {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }
  if (picked.value === null) {
    toast.error(`${t("collection.select")}`)
    return
  }

  const requestUpdated =
    props.mode === "rest"
      ? cloneDeep(
          RESTTabs.currentActiveTab.value.document.type === "request"
            ? RESTTabs.currentActiveTab.value.document.request
            : null
        )
      : cloneDeep(GQLTabs.currentActiveTab.value.document.request)

  if (!requestUpdated) return

  requestUpdated.name = requestName.value

  if (picked.value.pickedType === "my-collection") {
    if (!isAukRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    const insertionIndex = saveRESTRequestAs(
      `${picked.value.collectionIndex}`,
      requestUpdated
    )

    if (RESTTabs.currentActiveTab.value.document.type !== "request") return

    RESTTabs.currentActiveTab.value.document = {
      request: requestUpdated,
      isDirty: false,
      type: "request",
      saveContext: {
        originLocation: "user-collection",
        folderPath: `${picked.value.collectionIndex}`,
        requestIndex: insertionIndex,
        exampleID: undefined,
      },
    }

    RESTTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(
        `${picked.value.collectionIndex}`,
        "rest"
      )

    platform.analytics?.logEvent({
      type: "AUK_SAVE_REQUEST",
      createdNow: true,
      platform: "rest",
      workspaceType: "personal",
    })

    requestSaved()
  } else if (picked.value.pickedType === "my-folder") {
    if (!isAukRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    const insertionIndex = saveRESTRequestAs(
      picked.value.folderPath,
      requestUpdated
    )

    RESTTabs.currentActiveTab.value.document = {
      request: requestUpdated,
      isDirty: false,
      type: "request",
      saveContext: {
        originLocation: "user-collection",
        folderPath: picked.value.folderPath,
        requestIndex: insertionIndex,
      },
    }

    RESTTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(picked.value.folderPath, "rest")

    platform.analytics?.logEvent({
      type: "AUK_SAVE_REQUEST",
      createdNow: true,
      platform: "rest",
      workspaceType: "personal",
    })

    requestSaved()
  } else if (picked.value.pickedType === "my-request") {
    if (!isAukRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    editRESTRequest(
      picked.value.folderPath,
      picked.value.requestIndex,
      requestUpdated
    )

    RESTTabs.currentActiveTab.value.document = {
      request: requestUpdated,
      isDirty: false,
      type: "request",
      saveContext: {
        originLocation: "user-collection",
        folderPath: picked.value.folderPath,
        requestIndex: picked.value.requestIndex,
      },
    }

    RESTTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(picked.value.folderPath, "rest")

    platform.analytics?.logEvent({
      type: "AUK_SAVE_REQUEST",
      createdNow: false,
      platform: "rest",
      workspaceType: "personal",
    })

    requestSaved()
  } else if (picked.value.pickedType === "gql-my-request") {
    // TODO: Check for GQL request ?
    editGraphqlRequest(
      picked.value.folderPath,
      picked.value.requestIndex,
      requestUpdated as AukGQLRequest
    )

    GQLTabs.currentActiveTab.value.document = {
      request: requestUpdated as AukGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath: picked.value.folderPath,
        requestIndex: picked.value.requestIndex,
      },
    }

    platform.analytics?.logEvent({
      type: "AUK_SAVE_REQUEST",
      createdNow: false,
      platform: "gql",
      workspaceType: "personal",
    })

    GQLTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(picked.value.folderPath, "graphql")

    requestSaved("GQL")
  } else if (picked.value.pickedType === "gql-my-folder") {
    // TODO: Check for GQL request ?
    const insertionIndex = saveGraphqlRequestAs(
      picked.value.folderPath,
      requestUpdated as AukGQLRequest
    )

    GQLTabs.currentActiveTab.value.document = {
      request: requestUpdated as AukGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath: picked.value.folderPath,
        requestIndex: insertionIndex,
      },
    }

    platform.analytics?.logEvent({
      type: "AUK_SAVE_REQUEST",
      createdNow: true,
      platform: "gql",
      workspaceType: "personal",
    })

    GQLTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(picked.value.folderPath, "graphql")

    requestSaved("GQL")
  } else if (picked.value.pickedType === "gql-my-collection") {
    // TODO: Check for GQL request ?
    const insertionIndex = saveGraphqlRequestAs(
      `${picked.value.collectionIndex}`,
      requestUpdated as AukGQLRequest
    )

    GQLTabs.currentActiveTab.value.document = {
      request: requestUpdated as AukGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath: `${picked.value.collectionIndex}`,
        requestIndex: insertionIndex,
      },
    }

    platform.analytics?.logEvent({
      type: "AUK_SAVE_REQUEST",
      createdNow: true,
      platform: "gql",
      workspaceType: "personal",
    })

    GQLTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(
        `${picked.value.collectionIndex}`,
        "graphql"
      )

    requestSaved("GQL")
  }
}

const requestSaved = (tab: "REST" | "GQL" = "REST") => {
  toast.success(`${t("request.added")}`)
  nextTick(() => {
    if (tab === "REST") {
      RESTTabs.currentActiveTab.value.document.isDirty = false
    } else {
      GQLTabs.currentActiveTab.value.document.isDirty = false
    }
  })
  hideModal()
}

const hideModal = () => {
  picked.value = null
  emit("hide-modal")
}
</script>
