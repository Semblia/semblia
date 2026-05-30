import { config as base } from "@workspace/eslint-config/base";

export default [
  ...base,
  {
    ignores: ["cdk.out/**", "dist/**", "node_modules/**"],
  },
  {
    files: ["infra/**/*.ts"],
    rules: {
      "turbo/no-undeclared-env-vars": "off",
    },
  },
];
