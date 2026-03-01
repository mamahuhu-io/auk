<template>
  <button
    v-if="renderedTag === 'BUTTON'"
    aria-label="button"
    :role="role || 'button'"
    v-bind="mergedAttrs"
  >
    <slot></slot>
  </button>
  <a
    v-else-if="renderedTag === 'ANCHOR' && !blank"
    aria-label="Link"
    :href="to"
    :role="role || 'link'"
    v-bind="updatedAttrs"
  >
    <slot></slot>
  </a>
  <a
    v-else-if="renderedTag === 'ANCHOR' && blank"
    aria-label="Link"
    :href="to"
    :role="role || 'link'"
    target="_blank"
    rel="noopener"
    v-bind="updatedAttrs">
    <slot></slot>
  </a>
  <RouterLink v-else :to="to" :role="role || 'link'" v-bind="updatedAttrs">
    <slot></slot>
  </RouterLink>
</template>

<script lang="ts">
// Do not import RouterLink, for some reason that breaks things ¯\_(ツ)_/¯
/**
 * for preventing the automatic binding of $attrs.
 * we are manually binding $attrs or updatedAttrs.
 * if this is not set to false, along with manually binded updatedAttrs, it will also bind $attrs.
 */
export default {
  inheritAttrs: false,
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from "vue"
import { omit } from "lodash-es"

const props = defineProps({
  to: {
    type: String,
    default: "",
  },
  blank: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  exact: {
    type: Boolean,
    default: true,
  },
  tabindex: {
    type: [String, Number],
    default: "0",
  },
  role: {
    type: String,
    default: "",
  },
  ariaChecked: {
    type: [Boolean, String],
    default: undefined,
  },
})

const renderedTag = computed(() => {
  if (!props.to) {
    return "BUTTON" as const
  } else if (props.blank) {
    return "ANCHOR" as const
  } else if (/^\/(?!\/).*$/.test(props.to)) {
    // regex101.com/r/LU1iFL/1
    return "FRAMEWORK" as const
  } else {
    return "ANCHOR" as const
  }
})

const $attrs = useAttrs()

const mergedAttrs = computed(() => ({
  ...$attrs,
  disabled: props.disabled,
  tabindex: props.tabindex,
  "aria-checked": props.ariaChecked,
}))

/**
 * tippy checks if the disabled attribute exists on the anchor tag, if it exists it won't show the tooltip.
 * and when directly binding the disabled attribute using v-bind="attrs",
 * vue renders the disabled attribute as disabled="false" ("false" being a string),
 * which causes tippy to think the disabled attribute is present, ( it does a targetElement.hasAttribute("disabled") check ) and it won't show the tooltip.
 *
 * here we are just omiting disabled if it is false.
 */
const updatedAttrs = computed(() =>
  renderedTag.value === "ANCHOR" && !props.disabled
    ? omit(mergedAttrs.value, "disabled")
    : mergedAttrs.value
)
</script>
