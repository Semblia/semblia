import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // The build emits compiled copies into dist/; scope discovery to the
    // TypeScript sources so specs aren't run (and counted) twice.
    include: ["src/**/*.spec.{ts,tsx}"],
  },
});
