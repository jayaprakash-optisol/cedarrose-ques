import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_USE_MOCK": JSON.stringify("true"),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api/v1"),
  },
  test: {
    name: "web",
    environment: "jsdom",
    setupFiles: ["./tests/setup/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    pool: "forks",
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/**/*.ts",
        "src/services/**/*.ts",
        "src/components/**/*.tsx",
        "src/features/**/*.tsx",
        "src/app/**/*.tsx",
        "src/config/**/*.ts",
      ],
      exclude: [
        "src/main.tsx",
        "src/mocks/**",
        "src/types/**",
        "src/components/ui/**",
        "src/services/mock/**",
        "src/services/index.ts",
        "src/config/env.ts",
        "src/components/common/StatusBadge.tsx",
        "src/lib/case-display.ts",
        "src/lib/workflow-completion.ts",
        "src/features/cases/components/ResendLinkModal.tsx",
        "src/features/cases/components/CaseDetailPanel.tsx",
        "src/lib/audit-log.ts",
        "src/lib/app-selection.ts",
        "src/lib/case-completion-stats.ts",
        "src/lib/workflow-progress.ts",
        "src/app/router.tsx",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
