import { defineConfig, mergeConfig } from "vitest/config"
import baseConfig from "./vitest.config.mts"

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: [
        "src/store/__tests__/workspace.store.spec.ts",
        "src/services/git/__tests__/sync-manager.spec.ts",
        "src/services/workspace-storage/__tests__/async-lock.spec.ts",
        "src/services/workspace-storage/__tests__/index.spec.ts",
        "src/services/git/__tests__/history-store.spec.ts",
        "src/components/workspace/__tests__/WorkspaceManageModal.spec.ts",
        "src/components/workspace/__tests__/WorkspaceCreateModal.spec.ts",
        "src/components/workspace/__tests__/SyncCenterModal.spec.ts",
      ],
      coverage: {
        enabled: true,
        provider: "v8",
        reporter: ["text", "json-summary"],
        include: [
          "src/store/workspace.ts",
          "src/services/git/sync-manager.ts",
          "src/services/workspace-storage/async-lock.ts",
          "src/services/workspace-storage/index.ts",
          "src/services/git/history-store.ts",
          "src/components/workspace/SyncCenterModal.vue",
          "src/components/workspace/WorkspaceManageModal.vue",
          "src/components/workspace/WorkspaceCreateModal.vue",
        ],
        thresholds: {
          lines: 55,
          functions: 50,
          branches: 45,
          statements: 55,
        },
      },
    },
  })
)
