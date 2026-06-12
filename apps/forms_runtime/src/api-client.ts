import { createHash, createHmac } from "node:crypto";
import type { FormsRuntimeEnv } from "./env.js";

function unwrapApiResponse<TResponse>(body: unknown): TResponse {
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "success" in body &&
    body.success === true &&
    "data" in body
  ) {
    return body.data as TResponse;
  }

  return body as TResponse;
}

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
    "x-semblia-runtime": "forms",
    "x-semblia-runtime-timestamp": String(input.timestamp),
    "x-semblia-runtime-signature": `v1=${signature}`,
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

  let response: Response;
  try {
    response = await fetch(`${env.FORMS_RUNTIME_API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: serialized,
      signal: AbortSignal.timeout(env.FORMS_RUNTIME_API_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("api_v2 request timed out");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`api_v2 request failed: ${response.status}`);
  }

  return unwrapApiResponse<TResponse>(await response.json());
}
