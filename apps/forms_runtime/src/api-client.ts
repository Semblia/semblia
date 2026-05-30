import { createHash, createHmac } from "node:crypto";
import type { FormsRuntimeEnv } from "./env.js";

export function signRuntimeRequest(input: {
  method: string;
  path: string;
  timestamp: number;
  body: string;
  secret: string;
}): Record<string, string> {
  const bodyHash = createHash("sha256").update(input.body).digest("hex");
  const payload = [
    input.method.toUpperCase(),
    input.path,
    String(input.timestamp),
    bodyHash,
  ].join("\n");
  const signature = createHmac("sha256", input.secret)
    .update(payload)
    .digest("hex");

  return {
    "content-type": "application/json",
    "x-tresta-runtime": "forms",
    "x-tresta-runtime-timestamp": String(input.timestamp),
    "x-tresta-runtime-signature": `v1=${signature}`,
  };
}

export async function runtimeApiPost<TResponse>(
  env: FormsRuntimeEnv,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<TResponse> {
  if (
    env.FORMS_RUNTIME_MODE !== "api" ||
    !env.FORMS_RUNTIME_API_BASE_URL ||
    !env.FORMS_RUNTIME_SIGNING_SECRET
  ) {
    throw new Error("runtimeApiPost requires api mode");
  }

  const serialized = JSON.stringify(body);
  const timestamp = Date.now();
  const headers = {
    ...signRuntimeRequest({
      method: "POST",
      path,
      timestamp,
      body: serialized,
      secret: env.FORMS_RUNTIME_SIGNING_SECRET,
    }),
    ...extraHeaders,
  };

  const response = await fetch(`${env.FORMS_RUNTIME_API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: serialized,
  });

  if (!response.ok) {
    throw new Error(`api_v2 request failed: ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
