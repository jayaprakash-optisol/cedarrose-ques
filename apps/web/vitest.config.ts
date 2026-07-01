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
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api/v1"),
  },
  test: {
    name: "web",
    environment: "jsdom",
    setupFiles: ["./tests/setup/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    pool: "threads",
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/**/*.ts",
        "src/services/**/*.ts",
        "src/config/**/*.ts",
      ],
      exclude: [
        "src/services/index.ts",
        "src/services/types.ts",
        "src/config/env.ts",
        "src/lib/workflow-completion.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
