<template>
  <AukSmartPlaceholder
    :src="`/images/states/${colorMode.value}/upload_error.svg`"
    :alt="`${t('error.network_fail')}`"
    :heading="t('error.network_fail')"
  >
    <template #body>
      <div class="my-1 flex flex-col items-center text-secondaryLight">
        <span>
          {{ t("error.check_how_to_add_origin") }}
        </span>
      </div>
    </template>
  </AukSmartPlaceholder>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useColorMode } from "~/composables/theming"

const colorMode = useColorMode()
const t = useI18n()
</script>
