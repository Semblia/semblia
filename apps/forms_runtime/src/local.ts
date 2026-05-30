import { serve } from "@hono/node-server";
import { createFormsRuntimeApp } from "./app.js";
import { loadEnv } from "./env.js";

const forceMock = process.argv.includes("--mock");
const env = loadEnv({
  ...process.env,
  ...(forceMock ? { FORMS_RUNTIME_MODE: "mock" } : {}),
});
const app = createFormsRuntimeApp(env);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  () => {
    console.log(
      `forms_runtime listening on http://localhost:${env.PORT} (${env.FORMS_RUNTIME_MODE})`,
    );
  },
);
