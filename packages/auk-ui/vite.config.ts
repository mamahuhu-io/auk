import vue from "@vitejs/plugin-vue"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import Unfonts from "unplugin-fonts/vite"
import { visualizer } from "rollup-plugin-visualizer"

export default defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: "vue3",
    }),
    Unfonts({
      fontsource: {
        families: [
          {
            name: "Inter Variable",
            variables: ["variable-full"],
            subsets: ["latin"],
          },
          {
            name: "Material Symbols Rounded Variable",
            variables: ["variable-full"],
            subsets: ["latin"],
          },
          {
            name: "Roboto Mono Variable",
            variables: ["variable-full"],
            subsets: ["latin"],
          },
        ],
      },
    }),
    visualizer({
      filename: "./dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap", // treemap, sunburst, network
    }),
  ], // to process SFC
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // 使用现代 Sass API
      },
    },
  },
  build: {
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        pure_funcs: ['console.debug'], // Remove console.debug only
      },
      format: {
        comments: false, // Remove comments
      },
    },
    lib: {
      entry: {
        index: "./src/index.ts",
        "ui-preset": "./ui-preset.ts",
        "postcss.config": "./postcss.config.cjs",
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        exports: "named",
        // Code splitting for better caching
        manualChunks: (id) => {
          // Split vendor dependencies
          if (id.includes('node_modules')) {
            // Split large dependencies into separate chunks
            if (id.includes('@vueuse')) {
              return 'vendor-vueuse'
            }
            if (id.includes('lodash')) {
              return 'vendor-lodash'
            }
            if (id.includes('@fontsource')) {
              return 'vendor-fonts'
            }
            // Other vendor dependencies
            return 'vendor'
          }
        },
      },
    },
    emptyOutDir: true,
  },
})
