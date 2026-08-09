import { config as base } from "@workspace/eslint-config/base";

export default [
  ...base,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
