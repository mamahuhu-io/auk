import { defineConfig } from "vitest/config"
import * as path from "path"
import Icons from "unplugin-icons/vite"
import { FileSystemIconLoader } from "unplugin-icons/loaders"
import Vue from "@vitejs/plugin-vue"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../auk-common/src"),
      "@composables": path.resolve(__dirname, "../auk-common/src/composables"),
    },
  },
  plugins: [
    Vue(),
    Icons({
      compiler: "vue3",
      customCollections: {
        auk: FileSystemIconLoader("../auk-common/assets/icons"),
        auth: FileSystemIconLoader("../auk-common/assets/icons/auth"),
        brands: FileSystemIconLoader("../auk-common/assets/icons/brands"),
      },
    }) as any,
  ],
})
