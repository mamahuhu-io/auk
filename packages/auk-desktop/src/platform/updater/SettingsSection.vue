<template>
  <div class="md:grid md:grid-cols-3 md:gap-4">
    <div class="p-8 md:col-span-1">
      <h3 class="heading">
        {{ t("updater.title") }}
      </h3>
      <p class="my-1 text-secondaryLight">
        {{ t("updater.description") }}
      </p>
    </div>

    <div class="space-y-6 p-8 md:col-span-2">
      <section class="flex flex-col space-y-2">
        <h4 class="font-semibold text-secondaryDark">
          {{ t("updater.version_info") }}
        </h4>
        <p class="text-secondaryLight">
          {{ t("updater.current_version") }}: {{ currentVersionText }}
        </p>
        <p v-if="updater.latestVersion.value" class="text-secondaryLight">
          {{ t("updater.latest_version") }}: {{ updater.latestVersion.value }}
        </p>
        <p class="text-secondaryLight">
          {{ updater.statusText.value }}
        </p>
        <p v-if="updater.errorMessage.value" class="text-red-500">
          {{ updater.errorMessage.value }}
        </p>
      </section>

      <section
        v-if="updater.isDownloading.value"
        class="flex flex-col space-y-2"
      >
        <h4 class="font-semibold text-secondaryDark">
          {{ t("updater.download_progress") }}
        </h4>
        <div class="h-2 w-full rounded bg-primaryLight">
          <div
            class="h-2 rounded bg-accent"
            :style="{ width: `${normalizedProgress}%` }"
          />
        </div>
        <p class="text-secondaryLight">{{ Math.round(normalizedProgress) }}%</p>
      </section>

      <section class="flex flex-wrap gap-2">
        <AukButtonPrimary
          :label="t('updater.check_for_updates')"
          :loading="updater.isChecking.value"
          :disabled="updater.isBusy.value"
          @click="checkForUpdates"
        />

        <AukButtonSecondary
          v-if="
            updater.updateAvailable.value &&
            !updater.isPortable.value &&
            !updater.restartRequired.value
          "
          :label="t('updater.update_now')"
          :disabled="updater.isBusy.value"
          @click="downloadAndInstall"
        />

        <AukButtonSecondary
          v-if="updater.isDownloading.value"
          :label="t('updater.cancel_download')"
          @click="cancelUpdate"
        />

        <AukButtonSecondary
          v-if="updater.restartRequired.value"
          :label="t('updater.restart_now')"
          @click="restartApp"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useService } from "dioc/vue"
import { useI18n } from "@auk/common/composables/i18n"
import { DesktopUpdaterService } from "./service"

const t = useI18n()
const updater = useService(DesktopUpdaterService)

const currentVersionText = computed(
  () => updater.currentVersion.value || t("updater.version_unknown")
)

const normalizedProgress = computed(() => {
  const percentage = updater.downloadProgress.value.percentage
  if (!Number.isFinite(percentage)) return 0
  return Math.max(0, Math.min(100, percentage))
})

const checkForUpdates = () => {
  void updater.checkForUpdates({ manual: true })
}

const downloadAndInstall = () => {
  void updater.downloadAndInstallUpdate()
}

const cancelUpdate = () => {
  void updater.cancelUpdate()
}

const restartApp = () => {
  void updater.restartApplication()
}
</script>
