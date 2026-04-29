// This configuration only applies to the package manager root.
/** @type {import("eslint").Linter.Config} */
module.exports = {
  ignorePatterns: ["apps/**", "packages/**"],
  extends: ["@workspace/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  rules: {
    "no-restricted-imports": [
      "warn",
      {
        paths: [
          {
            name: "@workspace/widget",
            message:
              "This package is deprecated for a new package for V2. Do not use until the new package is in development.",
          },
        ],
      },
    ],
  },
};
