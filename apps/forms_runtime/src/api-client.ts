import { createHash, createHmac } from "node:crypto";
import {
  canonicalizeRuntimeRequest,
  formatRuntimeSignature,
  normalizePublicHostname,
  SEMBLIA_RUNTIME_HEADERS,
} from "@workspace/types";
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

  throw new RuntimeApiError(503);
}

function joinApiUrl(baseUrl: string, path: string): URL {
  const base = new URL(baseUrl);
  const target = new URL(base.origin);
  target.pathname = `${base.pathname.replace(/\/+$/, "")}/${path.replace(/^\/+/, "").split("?")[0]}`;
  const queryIndex = path.indexOf("?");
  target.search = queryIndex === -1 ? "" : path.slice(queryIndex);
  return target;
}

function runtimeTrustHeaders(input: {
  env: FormsRuntimeEnv;
  method: "GET" | "POST";
  url: URL;
  hostname: string;
  rawBody: string;
}) {
  const hostname = normalizePublicHostname(input.hostname);
  const secret = input.env.FORMS_RUNTIME_SIGNING_SECRET;
  if (!hostname || !secret) throw new Error("Invalid runtime signing configuration");
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const canonical = canonicalizeRuntimeRequest({
    timestampSeconds,
    method: input.method,
    requestTarget: `${input.url.pathname}${input.url.search}`,
    hostname,
    bodySha256: createHash("sha256").update(input.rawBody, "utf8").digest("hex"),
  });
  return {
    [SEMBLIA_RUNTIME_HEADERS.host]: hostname,
    [SEMBLIA_RUNTIME_HEADERS.timestamp]: String(timestampSeconds),
    [SEMBLIA_RUNTIME_HEADERS.signature]: formatRuntimeSignature(
      createHmac("sha256", secret).update(canonical, "utf8").digest(),
    ),
  };
}

function forwardableHeaderEntries(headers: Record<string, string | undefined>) {
  return Object.entries(headers).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" &&
      entry[1].trim() !== "" &&
      entry[0].toLowerCase() !== "x-semblia-signature" &&
      entry[0].toLowerCase() !== "x-semblia-timestamp" &&
      !entry[0].toLowerCase().startsWith("x-semblia-runtime-"),
  );
}

function buildRuntimeApiHeaders(input: {
  env: FormsRuntimeEnv;
  method: "GET" | "POST";
  url: URL;
  hostname: string;
  rawBody: string;
  headers?: Record<string, string | undefined>;
}) {
  const headers: Record<string, string> = {
    accept: "application/json",
    ...Object.fromEntries(forwardableHeaderEntries(input.headers ?? {})),
    ...runtimeTrustHeaders({
      env: input.env,
      method: input.method,
      url: input.url,
      hostname: input.hostname,
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
  hostname: string;
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
  const url = joinApiUrl(input.env.FORMS_RUNTIME_API_BASE_URL, input.path);
  const headers = buildRuntimeApiHeaders({ ...input, url, rawBody });

  let response: Response;
  try {
    response = await fetch(
      url.toString(),
      {
        method: input.method,
        headers,
        ...bodyForMethod(input.method, rawBody),
        signal: AbortSignal.timeout(input.env.FORMS_RUNTIME_API_TIMEOUT_MS),
      },
    );
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new RuntimeApiError(503);
    }
    throw new RuntimeApiError(503);
  }

  if (!response.ok) {
    throw new RuntimeApiError(
      response.status === 401 || response.status === 404 || response.status === 429
        ? response.status
        : 503,
    );
  }

  try {
    return unwrapApiResponse<TResponse>(await response.json());
  } catch (error) {
    if (error instanceof RuntimeApiError) throw error;
    throw new RuntimeApiError(503);
  }
}

export class RuntimeApiError extends Error {
  constructor(readonly status: 401 | 404 | 429 | 503) {
    super(`Runtime API request failed: ${status}`);
    this.name = "RuntimeApiError";
  }
}
