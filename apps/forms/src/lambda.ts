import { handle } from "hono/aws-lambda";
import { createFormsRuntimeApp } from "./app.js";
import { loadEnv } from "./env.js";
import { loadRuntimeSigningSecret } from "./runtime-secret.js";

let initializedHandler: ReturnType<typeof handle> | undefined;
let initialization: Promise<ReturnType<typeof handle>> | undefined;

async function getHandler() {
  if (!initialization) {
    initialization = loadRuntimeSigningSecret({
      env: loadEnv(process.env),
      // eslint-disable-next-line turbo/no-undeclared-env-vars -- Lambda runtime identity is injected by AWS.
      deployedLambda: Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME),
    }).then((env) => {
      initializedHandler = handle(createFormsRuntimeApp(env));
      return initializedHandler;
    });
  }
  try {
    return await initialization;
  } catch (error) {
    initialization = undefined;
    initializedHandler = undefined;
    throw error;
  }
}

export async function handler(...args: Parameters<ReturnType<typeof handle>>) {
  let runtimeHandler: ReturnType<typeof handle>;
  try {
    runtimeHandler = await getHandler();
  } catch {
    return {
      statusCode: 503,
      headers: { "cache-control": "private, no-store" },
      body: "Form unavailable",
    };
  }
  return runtimeHandler(...args);
}
