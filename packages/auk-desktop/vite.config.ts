import { defineConfig, Plugin } from "vite"
import Vue from "@vitejs/plugin-vue"
import VueI18n from "@intlify/unplugin-vue-i18n/vite"
import Components from "unplugin-vue-components/vite"
import Icons from "unplugin-icons/vite"
import Inspect from "vite-plugin-inspect"
import Pages from "vite-plugin-pages"
import Layouts from "vite-plugin-vue-layouts"
import IconResolver from "unplugin-icons/resolver"
import { FileSystemIconLoader } from "unplugin-icons/loaders"
import * as path from "path"
import Unfonts from "unplugin-fonts/vite"
import legacy from "@vitejs/plugin-legacy"
import { createRequire } from "node:module"

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST
const require = createRequire(import.meta.url)

/**
 * Mock PWA plugin for desktop - PWA is not needed in Tauri
 */
function mockPWA(): Plugin {
  const virtualModuleId = "virtual:pwa-register"
  const resolvedVirtualModuleId = "\0" + virtualModuleId

  return {
    name: "mock-pwa",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `
          export function registerSW(options = {}) {
            return (reloadPage) => Promise.resolve();
          }
        `
      }
    },
  }
}

export default defineConfig(async () => ({
  // TODO: Migrate @auk/data to full ESM
  define: {
    // For 'util' polyfill required by dep of '@apidevtools/swagger-parser'
    "process.env": {},
    "process.platform": '"browser"',
  },
  publicDir: path.resolve(__dirname, "../auk-common/public"),
  build: {
    sourcemap: true,
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // 增加警告阈值到 1000 KB
    rollupOptions: {
      maxParallelFileOps: 2,
      // Use Rollup's automatic chunking to avoid circular chunk graphs that
      // were causing "Cannot access 'X' before initialization" at runtime.
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // 使用现代 Sass API
      },
    },
  },
  worker: {
    format: "es",
  },
  resolve: {
    alias: {
      // Desktop kernel override - MUST be before ~ alias
      // This ensures common package uses desktop's kernel implementation
      "~/kernel": path.resolve(__dirname, "./src/kernel"),

      // Common package aliases
      "~": path.resolve(__dirname, "../auk-common/src"),
      "@auk/common": path.resolve(__dirname, "../auk-common/src"),

      // Common (shared) modules
      "@composables": path.resolve(
        __dirname,
        "../auk-common/src/composables"
      ),
      "@modules": path.resolve(__dirname, "../auk-common/src/modules"),
      "@services": path.resolve(__dirname, "../auk-common/src/services"),
      "@components": path.resolve(
        __dirname,
        "../auk-common/src/components"
      ),
      "@helpers": path.resolve(__dirname, "../auk-common/src/helpers"),
      "@platform": path.resolve(__dirname, "../auk-common/src/platform"),
      "@functional": path.resolve(
        __dirname,
        "../auk-common/src/helpers/functional"
      ),
      "@workers": path.resolve(__dirname, "../auk-common/src/workers"),

      // Application layer (desktop-specific)
      "@app/platform": path.resolve(__dirname, "./src/platform"),
      "@app/services": path.resolve(__dirname, "./src/services"),
      "@app/components": path.resolve(__dirname, "./src/components"),
      "@app/helpers": path.resolve(__dirname, "./src/helpers"),
      "@app/kernel": path.resolve(__dirname, "./src/kernel"),

      // Node.js polyfills
      stream: "stream-browserify",
      util: require.resolve("util/"),
    },
    dedupe: ["vue"],
  },
  plugins: [
    mockPWA(),
    Inspect(),
    Vue(),
    Pages({
      routeStyle: "nuxt",
      dirs: ["../auk-common/src/pages"],
      importMode: "async",
    }),
    Layouts({
      layoutsDirs: "../auk-common/src/layouts",
      defaultLayout: "default",
    }),
    VueI18n({
      runtimeOnly: false,
      compositionOnly: true,
      include: [path.resolve(__dirname, "../auk-common/locales")],
    }),
    Components({
      dts: "./src/components.d.ts",
      dirs: ["../auk-common/src/components"],
      directoryAsNamespace: true,
      resolvers: [
        IconResolver({
          prefix: "icon",
          customCollections: ["auk", "auth", "brands"],
        }),
        (compName: string) => {
          if (compName.startsWith("Auk"))
            return { name: compName, from: "@auk/ui" }
          else return undefined
        },
      ],
      types: [
        {
          from: "vue-tippy",
          names: ["Tippy"],
        },
      ],
    }),
    Icons({
      compiler: "vue3",
      customCollections: {
        auk: FileSystemIconLoader("../auk-common/assets/icons"),
        auth: FileSystemIconLoader("../auk-common/assets/icons/auth"),
        brands: FileSystemIconLoader(
          "../auk-common/assets/icons/brands"
        ),
      },
    }),
    Unfonts({
      fontsource: {
        families: [
          {
            name: "Inter Variable",
            variables: ["variable-full"],
          },
          {
            name: "Material Symbols Rounded Variable",
            variables: ["variable-full"],
          },
          {
            name: "Roboto Mono Variable",
            variables: ["variable-full"],
          },
        ],
      },
    }),
    legacy({
      modernPolyfills: ["es.string.replace-all"],
      renderLegacyChunks: false,
    }),
  ],

  optimizeDeps: {
    include: [
      "@auk/kernel",
      "@tauri-apps/api",
      "@tauri-apps/plugin-dialog",
      "@tauri-apps/plugin-fs",
      "@tauri-apps/plugin-shell",
      "@tauri-apps/plugin-store",
    ],
  },

  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}))
