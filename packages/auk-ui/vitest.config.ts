import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: 'vue3',
      autoInstall: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: [
      'node_modules/',
      'dist/',
      'e2e/**',
      '**/*.e2e.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'test/',
        'e2e/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'vuedraggable-es': resolve(__dirname, '../../node_modules/.pnpm/vuedraggable-es@4.1.1_vue@3.5.27_typescript@5.9.3_/node_modules/vuedraggable-es/dist/index.es.js'),
    },
  },
})
