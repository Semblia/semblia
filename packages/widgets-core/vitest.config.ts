import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The build emits compiled `.spec.js` copies into dist/; scope discovery to
    // the TypeScript sources so the same specs aren't run (and counted) twice.
    include: ["src/**/*.spec.ts"],
  },
});
