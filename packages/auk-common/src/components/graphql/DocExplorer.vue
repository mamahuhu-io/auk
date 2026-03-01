<template>
  <section
    v-if="schema"
    class="auk-doc-explorer"
    aria-label="Documentation Explorer"
  >
    <div class="sticky top-0 z-10 border-b border-dividerLight bg-primary">
      <GraphqlSchemaSearch />
      <div
        class="flex items-center overflow-x-auto whitespace-nowrap px-3 py-2 text-tiny text-secondaryLight"
      >
        <template v-for="(item, index) in navStack" :key="index">
          <span
            class="cursor-pointer hover:text-secondary"
            @click="navigateToIndex(index)"
          >
            {{ item.name }}
          </span>
          <span>
            <icon-lucide-chevron-right
              v-if="index < navStack.length - 1"
              class="mx-1"
            />
          </span>
        </template>
      </div>
    </div>
    <div class="auk-doc-explorer-content">
      <template v-if="navStack.length === 1">
        <GraphqlSchemaDocumentation :schema="schema" />
      </template>
      <template v-else-if="isType(currentNavItem.def)">
        <div class="auk-doc-explorer-title text-xl font-bold break-words p-4">
          {{ currentNavItem.name }}
        </div>
        <GraphqlTypeDocumentation
          :type="currentNavItem.def"
          :readonly="currentNavItem.readonly"
        />
      </template>
      <template v-else-if="currentNavItem.def">
        <GraphqlFieldDocumentation
          :field="currentNavItem.def"
          :readonly="currentNavItem.readonly"
        />
      </template>
    </div>
  </section>

  <AukSmartPlaceholder
    v-else
    :src="`/images/states/${colorMode.value}/pack.svg`"
    :alt="t('empty.empty_schema')"
    :text="t('empty.empty_schema')"
  >
  </AukSmartPlaceholder>
</template>

<script setup lang="ts">
import { isType } from "graphql"
import { schema } from "~/helpers/graphql/connection"
import { useExplorer } from "../../helpers/graphql/explorer"
import { useColorMode } from "~/composables/theming"
import { useI18n } from "~/composables/i18n"

const colorMode = useColorMode()
const t = useI18n()

// Use explorer composable
const { navStack, currentNavItem, navigateToIndex } = useExplorer()
</script>

<style lang="scss">
.auk-doc-explorer-field-name {
  color: var(--editor-name-color);
}
.auk-doc-explorer-root-type {
  color: var(--editor-name-color);
}
.auk-doc-explorer-type-name {
  cursor: pointer;
  color: var(--editor-type-color);
  @apply text-sm font-normal;
}

.auk-doc-explorer-argument-name {
  color: var(--editor-keyword-color);
}

.auk-doc-explorer-argument-multiple {
  margin-left: 0.5rem;
}

.auk-doc-explorer-deprecated {
  // use color from above comment
  color: var(--status-critical-error-color);
}

.auk-doc-explorer-argument-deprecation {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--status-critical-error-color);
  border-radius: 0.25rem;
}
</style>
