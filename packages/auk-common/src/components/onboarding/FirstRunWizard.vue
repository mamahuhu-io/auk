<template>
  <AukSmartModal
    v-if="show"
    :title="t('onboarding.welcome')"
    dialog
    @close="completeOnboarding"
  >
    <template #body>
      <div class="flex flex-col space-y-6 p-4">
        <!-- Step 1: Welcome -->
        <div
          v-if="currentStep === 1"
          class="flex flex-col items-center space-y-4"
        >
          <div class="text-6xl">🚀</div>
          <h2 class="text-xl font-bold text-center">
            {{ t("onboarding.welcome_title") }}
          </h2>
          <p class="text-center text-secondaryLight">
            {{ t("onboarding.welcome_description") }}
          </p>
          <div class="flex flex-col space-y-2 w-full max-w-md">
            <div
              class="flex items-center space-x-3 p-3 rounded bg-primaryLight"
            >
              <span class="text-2xl">📁</span>
              <div>
                <div class="font-semibold">
                  {{ t("onboarding.feature_local") }}
                </div>
                <div class="text-sm text-secondaryLight">
                  {{ t("onboarding.feature_local_desc") }}
                </div>
              </div>
            </div>
            <div
              class="flex items-center space-x-3 p-3 rounded bg-primaryLight"
            >
              <span class="text-2xl">🔒</span>
              <div>
                <div class="font-semibold">
                  {{ t("onboarding.feature_privacy") }}
                </div>
                <div class="text-sm text-secondaryLight">
                  {{ t("onboarding.feature_privacy_desc") }}
                </div>
              </div>
            </div>
            <div
              class="flex items-center space-x-3 p-3 rounded bg-primaryLight"
            >
              <span class="text-2xl">⚡</span>
              <div>
                <div class="font-semibold">
                  {{ t("onboarding.feature_fast") }}
                </div>
                <div class="text-sm text-secondaryLight">
                  {{ t("onboarding.feature_fast_desc") }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Create First Collection -->
        <div
          v-if="currentStep === 2"
          class="flex flex-col items-center space-y-4"
        >
          <div class="text-6xl">📂</div>
          <h2 class="text-xl font-bold text-center">
            {{ t("onboarding.create_collection") }}
          </h2>
          <p class="text-center text-secondaryLight">
            {{ t("onboarding.create_collection_desc") }}
          </p>
          <div class="w-full max-w-md">
            <label class="block mb-2 font-semibold">
              {{ t("collection.name") }}
            </label>
            <input
              v-model="collectionName"
              type="text"
              class="input w-full"
              :placeholder="t('onboarding.collection_placeholder')"
            />
          </div>
        </div>

        <!-- Step 3: Ready -->
        <div
          v-if="currentStep === 3"
          class="flex flex-col items-center space-y-4"
        >
          <div class="text-6xl">✅</div>
          <h2 class="text-xl font-bold text-center">
            {{ t("onboarding.ready") }}
          </h2>
          <p class="text-center text-secondaryLight">
            {{ t("onboarding.ready_desc") }}
          </p>
          <div class="flex flex-col space-y-2 w-full max-w-md text-sm">
            <div class="flex items-center space-x-2">
              <span class="text-green-500">✓</span>
              <span>{{ t("onboarding.tip_collections") }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-green-500">✓</span>
              <span>{{ t("onboarding.tip_environments") }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-green-500">✓</span>
              <span>{{ t("onboarding.tip_shortcuts") }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between w-full">
        <div class="flex items-center space-x-2">
          <span
            v-for="step in totalSteps"
            :key="step"
            class="w-2 h-2 rounded-full"
            :class="step === currentStep ? 'bg-accent' : 'bg-divider'"
          />
        </div>
        <div class="flex space-x-2">
          <AukButtonSecondary
            v-if="currentStep > 1"
            :label="t('action.back')"
            outline
            @click="previousStep"
          />
          <AukButtonPrimary
            v-if="currentStep < totalSteps"
            :label="t('action.next')"
            @click="nextStep"
          />
          <AukButtonPrimary
            v-else
            :label="t('onboarding.get_started')"
            @click="completeOnboarding"
          />
        </div>
      </div>
    </template>
  </AukSmartModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useI18n } from "~/composables/i18n"
import { useLocalState } from "~/store/localstate"
import { addRESTCollection } from "~/store/collections"
import { makeCollection } from "@auk/data"

const t = useI18n()

const FIRST_RUN_KEY = useLocalState("FIRST_RUN_COMPLETED")

const show = ref(false)
const currentStep = ref(1)
const totalSteps = 3
const collectionName = ref("")

onMounted(() => {
  // Show wizard only on first run
  if (!FIRST_RUN_KEY.value) {
    show.value = true
  }
})

const nextStep = () => {
  if (currentStep.value === 2 && collectionName.value.trim()) {
    // Create the collection
    addRESTCollection(
      makeCollection({
        name: collectionName.value.trim(),
        folders: [],
        requests: [],
      })
    )
  }
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const completeOnboarding = () => {
  FIRST_RUN_KEY.value = true
  show.value = false
}
</script>
