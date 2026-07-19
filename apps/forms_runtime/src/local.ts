import { serve } from "@hono/node-server";
import { createFormsRuntimeApp } from "./app.js";
import { loadEnv } from "./env.js";
import { loadRuntimeSigningSecret } from "./runtime-secret.js";

const forceMock = process.argv.includes("--mock");
const env = loadEnv({
  ...process.env,
  ...(forceMock ? { FORMS_RUNTIME_MODE: "mock" } : {}),
});
async function start() {
  const resolvedEnv = await loadRuntimeSigningSecret({
    env,
    deployedLambda: false,
  });
  const app = createFormsRuntimeApp(resolvedEnv);
  serve({ fetch: app.fetch, port: resolvedEnv.PORT }, () => {
    console.log(`forms_runtime listening on http://localhost:${resolvedEnv.PORT} (${resolvedEnv.FORMS_RUNTIME_MODE})`);
  });
}

void start().catch(() => {
  console.error("forms_runtime startup failed");
  process.exitCode = 1;
});
