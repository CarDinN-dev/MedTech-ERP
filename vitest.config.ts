import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  resolve: { alias: { "@": root } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "tests/components/**/*.test.tsx"],
    exclude: ["tests/e2e/**", "tests/database/**"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["lib/validation.ts", "lib/demo-auth.ts", "lib/hr-calculations.ts", "lib/export/excel.ts", "lib/pdf/generator.ts", "components/record-modal.tsx"],
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 }
    }
  }
});
