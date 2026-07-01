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
    "import.meta.env.VITE_QA_AUTOMATION_URL": JSON.stringify("https://qa.example.com"),
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
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/styles.css",
        "src/**/index.ts",
        "src/services/index.ts",
        "src/services/types.ts",
        "src/config/env.ts",
        "src/types/**",
        "src/components/ui/**",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 95,
        statements: 100,
      },
    },
  },
});

