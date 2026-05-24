import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/db/**",
        "src/plugins/**",
        "src/routes/**",
        "src/config/**",
      ],
    },
    setupFiles: ["./test/setup.ts"],
  },
});
