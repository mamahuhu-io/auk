<template>
  <GithubButton
    title="Star Auk on GitHub"
    href="https://auk.mamahuhu.io/github"
    :data-color-scheme="
      colorMode.value != 'light'
        ? colorMode.value == 'black'
          ? 'dark'
          : 'dark_dimmed'
        : 'light'
    "
    data-show-count="true"
    data-text="Star"
    aria-label="Star Auk on GitHub"
    :data-size="size"
  />
</template>

<script setup lang="ts">
import GithubButton from "vue-github-button"
import { useColorMode } from "@composables/theming"

const colorMode = useColorMode()

defineProps({
  size: {
    type: String,
    default: undefined,
  },
})
</script>
