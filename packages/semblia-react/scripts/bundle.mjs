import { build } from "esbuild";

// @semblia/embed is a private workspace package until its standalone publish;
// bundling it keeps the npm artifact self-contained. React stays external —
// it is the consumer's peer dependency.
await build({
  entryPoints: ["src/index.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  outfile: "dist/index.js",
  external: ["react", "react/jsx-runtime"],
  banner: { js: '"use client";' },
});
