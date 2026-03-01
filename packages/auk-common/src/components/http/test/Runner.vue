<template>
  <AppPaneLayout layout-id="test-runner-primary">
    <template #primary>
      <div
        class="flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary sticky top-0 z-20"
      >
        <div class="inline-flex flex-1 gap-8">
          <HttpTestRunnerMeta
            :heading="t('collection.title')"
            :text="collectionName"
          />

          <template v-if="showResult">
            <HttpTestRunnerMeta :heading="t('environment.heading')">
              <HttpTestEnv />
            </HttpTestRunnerMeta>
            <!-- <HttpTestRunnerMeta :heading="t('test.iterations')" :text="'1'" /> -->
            <HttpTestRunnerMeta
              :heading="t('test.duration')"
              :text="duration ? msToHumanReadable(duration) : '...'"
            />
            <HttpTestRunnerMeta
              :heading="t('test.avg_resp')"
              :text="
                avgResponseTime ? msToHumanReadable(avgResponseTime) : '...'
              "
            />
          </template>
        </div>
        <div class="flex items-center gap-2">
          <AukButtonPrimary
            v-if="showResult && tab.document.status === 'running'"
            :label="t('test.stop')"
            @click="stopTests()"
          />
          <AukButtonPrimary
            v-else
            :label="t('test.run_again')"
            @click="runAgain()"
          />
          <AukButtonSecondary
            v-if="showResult && tab.document.status !== 'running'"
            :icon="IconPlus"
            :label="t('test.new_run')"
            filled
            outline
            @click="newRun()"
          />
        </div>
      </div>

      <HttpTestRunnerResult
        v-if="showResult"
        :tab="tab"
        :collection-adapter="collectionAdapter"
        :is-running="tab.document.status === 'running'"
        :selected-request-path="selectedRequestPath"
        @on-change-tab="showTestsType = $event as 'all' | 'passed' | 'failed'"
        @on-select-request="onSelectRequest"
        @request-path="onChangeRequestPath"
      />
    </template>
    <template #secondary>
      <div
        v-if="tab.document.status === 'running'"
        class="flex flex-col items-center gap-4 justify-center h-full"
      >
        <AukSmartSpinner />
        <span> {{ t("collection_runner.running_collection") }}... </span>
      </div>
      <HttpTestResponse
        v-else-if="selectedRequest && selectedRequest.response"
        v-model:document="selectedRequest"
        :show-response="tab.document.config.persistResponses"
      />

      <AukSmartPlaceholder
        v-else-if="
          !testRunnerConfig.persistResponses && !selectedRequest?.response
        "
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('collection_runner.no_response_persist')}`"
        :text="`${t('collection_runner.no_response_persist')}`"
      >
        <template #body>
          <AukButtonPrimary
            :label="t('test.new_run')"
            @click="showCollectionsRunnerModal = true"
          />
        </template>
      </AukSmartPlaceholder>

      <AukSmartPlaceholder
        v-else-if="!selectedRequest"
        :src="`/images/states/${colorMode.value}/pack.svg`"
        :alt="`${t('collection_runner.response_body_lost_rerun')}`"
        :text="`${t('collection_runner.response_body_lost_rerun')}`"
      >
      </AukSmartPlaceholder>
    </template>
  </AppPaneLayout>

  <HttpTestRunnerModal
    v-if="showCollectionsRunnerModal"
    :same-tab="true"
    :collection-runner-data="{
      type: 'my-collections',
      collectionID: tab.document.collectionID,
    }"
    :prev-config="testRunnerConfig"
    @hide-modal="showCollectionsRunnerModal = false"
  />
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { AukCollection } from "@auk/data"
import { SmartTreeAdapter } from "@auk/ui"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { computed, nextTick, onMounted, ref } from "vue"
import { useColorMode } from "~/composables/theming"
import { useToast } from "~/composables/toast"
import { AukTestRunnerDocument } from "~/helpers/rest/document"
import {
  CollectionNode,
  TestRunnerCollectionsAdapter,
} from "~/helpers/runner/adapter"
import {
  getRESTCollectionByRefId,
  getRESTCollectionInheritedProps,
  restCollectionStore,
} from "~/store/collections"
import { AukTab } from "~/services/tab"
import { RESTTabService } from "~/services/tab/rest"
import {
  TestRunnerRequest,
  TestRunnerService,
} from "~/services/test-runner/test-runner.service"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const props = defineProps<{ modelValue: AukTab<AukTestRunnerDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: AukTab<AukTestRunnerDocument>): void
}>()

const tabs = useService(RESTTabService)
const tab = useVModel(props, "modelValue", emit)

const selectedRequestPath = computed(
  () => tab.value.document.selectedRequestPath
)
const duration = computed(() => tab.value.document.testRunnerMeta.totalTime)
const avgResponseTime = computed(() =>
  calculateAverageTime(
    tab.value.document.testRunnerMeta.totalTime,
    tab.value.document.testRunnerMeta.completedRequests
  )
)

function msToHumanReadable(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000

  let result = ""
  if (seconds > 0) {
    result += `${seconds}s `
  }
  result += `${milliseconds}ms`

  return result.trim()
}

const selectedRequest = computed(() => tab.value.document.request)

const onSelectRequest = async (request: TestRunnerRequest) => {
  tab.value.document.request = null
  await nextTick() // HACK: To ensure the request is cleared before setting the new request. there is a bug in the response component that doesn't change to the valid lens when the response is changed.
  tab.value.document.request = request
}

const onChangeRequestPath = (path: string) => {
  tab.value.document.selectedRequestPath = path
}

const collectionName = computed(() =>
  props.modelValue.document.type === "test-runner"
    ? props.modelValue.document.collection.name
    : ""
)

const testRunnerConfig = computed(() => tab.value.document.config)

const collection = computed(() => {
  return tab.value.document.collection
})

// for re-run config
const showCollectionsRunnerModal = ref(false)
const selectedCollectionID = ref<string>()

const testRunnerStopRef = ref(false)
const showResult = computed(() => {
  return (
    tab.value.document.status === "running" ||
    tab.value.document.status === "stopped" ||
    tab.value.document.status === "error"
  )
})

const runTests = async () => {
  const { collectionID, collectionType } = tab.value.document

  const collections = restCollectionStore.value.state

  const collectionInheritedProps = getRESTCollectionInheritedProps(
    collectionID,
    collections,
    collectionType
  )

  const { auth, headers, variables } = collectionInheritedProps ?? {
    auth: { authActive: true, authType: "none" },
    headers: [],
    variables: [],
  }

  const resolvedCollection: AukCollection = {
    ...collection.value,
    auth,
    headers,
    variables,
  }

  testRunnerStopRef.value = false // when testRunnerStopRef is false, the test runner will start running
  testRunnerService.runTests(tab, resolvedCollection, {
    ...testRunnerConfig.value,
    stopRef: testRunnerStopRef,
  })
}

const stopTests = () => {
  testRunnerStopRef.value = true
  // when we manually stop the test runner, we need to update the tab document with the current state
  tab.value.document.testRunnerMeta = {
    ...tab.value.document.testRunnerMeta,
  }
}

const runAgain = async () => {
  tab.value.document.request = null
  tab.value.document.resultCollection = undefined
  await nextTick()
  resetRunnerState()
  const updatedCollection = await refetchCollectionTree()

  if (updatedCollection) {
    if (checkIfCollectionIsEmpty(updatedCollection)) {
      tabs.closeTab(tab.value.id)
      toast.error(t("collection_runner.empty_collection"))
      return
    }

    tab.value.document.collection = updatedCollection
    await nextTick()
    runTests()
  } else {
    tabs.closeTab(tab.value.id)
    toast.error(t("collection_runner.collection_not_found"))
  }
}

const resetRunnerState = () => {
  tab.value.document.testRunnerMeta = {
    failedTests: 0,
    passedTests: 0,
    totalTests: 0,
    totalRequests: 0,
    totalTime: 0,
    completedRequests: 0,
  }
}

onMounted(() => {
  if (tab.value.document.status === "idle") runTests()
  if (
    tab.value.document.status === "stopped" ||
    tab.value.document.status === "error"
  ) {
  }
})

function calculateAverageTime(
  totalTime: number,
  completedRequests: number
): number {
  return completedRequests > 0 ? Math.round(totalTime / completedRequests) : 0
}

const newRun = () => {
  showCollectionsRunnerModal.value = true
  selectedCollectionID.value = collection.value.id
}

const testRunnerService = useService(TestRunnerService)

const result = computed(() => {
  return tab.value.document.resultCollection
    ? [tab.value.document.resultCollection]
    : []
})

const showTestsType = ref<"all" | "passed" | "failed">("all")

const collectionAdapter: SmartTreeAdapter<CollectionNode> =
  new TestRunnerCollectionsAdapter(result, showTestsType)

/**
 * refetches the collection tree from the backend
 * @returns collection tree
 */
const refetchCollectionTree = async () => {
  if (!tab.value.document.collectionID) return
  return getRESTCollectionByRefId(tab.value.document.collectionID)
}

function checkIfCollectionIsEmpty(collection: AukCollection): boolean {
  // Check if the collection has requests or if any child collection is non-empty
  return (
    collection.requests.length === 0 &&
    collection.folders.every((folder) => checkIfCollectionIsEmpty(folder))
  )
}
</script>
