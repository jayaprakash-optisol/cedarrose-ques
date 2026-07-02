import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    setupFiles: ["./tests/setup/env.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/modules/**/*.ts",
        "src/middleware/**/*.ts",
        "src/shared/**/*.ts",
        "src/config/workflow.ts",
        "src/config/constants.ts",
        "src/lib/**/*.ts",
      ],
      exclude: ["src/db/**", "src/swagger/**", "src/shared/types/**", "src/**/*.d.ts"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
});
