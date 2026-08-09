import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // eslint-plugin-react-hooks 7.1 (pulled in by eslint-config-next) added
      // this rule, and it fires on 34 pre-existing call sites across 30 files
      // -- including the standard matchMedia hooks (use-mobile, use-media-query)
      // and shadcn's own carousel. Each one is a real "you might not need an
      // effect" question with its own answer, several of them behavioural, so
      // they belong in a focused pass rather than in a dependency bump. Every
      // other rule the new plugin added stays on.
      // TODO: work through these and drop this override.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
