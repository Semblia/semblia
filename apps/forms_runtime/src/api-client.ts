import { createHmac } from "node:crypto";
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

export function signSembliaPayload(input: {
  timestampSeconds: number;
  rawBody: string;
  secret: string;
}): Record<string, string> {
  const signature = createHmac("sha256", input.secret)
    .update(`v1.${input.timestampSeconds}.${input.rawBody}`, "utf8")
    .digest("base64");

  return {
    "x-semblia-signature": `sha256=${signature}`,
    "x-semblia-timestamp": String(input.timestampSeconds),
  };
}

function joinApiUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function signedOrForwardedTrustHeaders(input: {
  env: FormsRuntimeEnv;
  rawBody: string;
}) {
  if (!input.env.FORMS_RUNTIME_SIGNING_SECRET) return {};
  return signSembliaPayload({
    timestampSeconds: Math.floor(Date.now() / 1000),
    rawBody: input.rawBody,
    secret: input.env.FORMS_RUNTIME_SIGNING_SECRET,
  });
}

function forwardableHeaderEntries(headers: Record<string, string | undefined>) {
  return Object.entries(headers).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" &&
      entry[1].trim() !== "" &&
      entry[0].toLowerCase() !== "x-semblia-signature" &&
      entry[0].toLowerCase() !== "x-semblia-timestamp",
  );
}

function buildRuntimeApiHeaders(input: {
  env: FormsRuntimeEnv;
  method: "GET" | "POST";
  rawBody: string;
  headers?: Record<string, string | undefined>;
}) {
  const headers: Record<string, string> = {
    accept: "application/json",
    ...Object.fromEntries(forwardableHeaderEntries(input.headers ?? {})),
    ...signedOrForwardedTrustHeaders({
      env: input.env,
      rawBody: input.rawBody,
    }),
  };

  if (input.method === "POST") {
    headers["content-type"] = "application/json";
  }

  return headers;
}

function bodyForMethod(method: "GET" | "POST", rawBody: string) {
  return method === "POST" ? { body: rawBody } : {};
}

export async function runtimeApiRequest<TResponse>(input: {
  env: FormsRuntimeEnv;
  method: "GET" | "POST";
  path: string;
  rawBody?: string;
  headers?: Record<string, string | undefined>;
}): Promise<TResponse> {
  if (
    input.env.FORMS_RUNTIME_MODE !== "api" ||
    !input.env.FORMS_RUNTIME_API_BASE_URL
  ) {
    throw new Error("runtimeApiRequest requires api mode");
  }

  const rawBody = input.rawBody ?? "";
  const headers = buildRuntimeApiHeaders({ ...input, rawBody });

  let response: Response;
  try {
    response = await fetch(
      joinApiUrl(input.env.FORMS_RUNTIME_API_BASE_URL, input.path),
      {
        method: input.method,
        headers,
        ...bodyForMethod(input.method, rawBody),
        signal: AbortSignal.timeout(input.env.FORMS_RUNTIME_API_TIMEOUT_MS),
      },
    );
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
