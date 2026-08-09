import type { FormsRuntimeEnv } from "./env.js";
import { normalizePublicHostname } from "@workspace/types";
import type {
  RuntimeRequestContext,
  RuntimeSurface,
  RuntimeTenantRouting,
} from "./types.js";

const FORM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeHost(host: string | undefined): string | null {
  return host ? normalizePublicHostname(host) : null;
}

export function normalizeOrigin(origin: string | undefined): string | null {
  if (!origin?.trim()) return null;
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim();
  }
}

export function isLocalDevHost(host: string): boolean {
  if (host.startsWith("[::1]")) return true;
  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function assertFormSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 64 || !FORM_SLUG_PATTERN.test(normalized)) {
    throw new Error("Invalid form slug");
  }
  return normalized;
}

export function resolveRuntimeHost(input: {
  originalHost?: string;
  headerHost?: string;
  url: URL;
  env: FormsRuntimeEnv;
}): string {
  const host =
    normalizeHost(input.originalHost) ??
    normalizeHost(input.headerHost) ??
    normalizeHost(input.url.host);
  if (!host) throw new Error("Invalid runtime host");
  if (input.env.FORMS_RUNTIME_MODE === "mock" && isLocalDevHost(host)) {
    return input.env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN;
  }
  return host;
}

function mockProjectId(input: {
  env: FormsRuntimeEnv;
  host: string;
  queryProjectId?: string | null;
}): string {
  const mapped = input.env.FORMS_RUNTIME_PROJECT_ID_BY_HOST[input.host];
  if (mapped) return mapped;

  if (input.env.FORMS_RUNTIME_PROJECT_ID) {
    return input.env.FORMS_RUNTIME_PROJECT_ID;
  }

  if (input.env.FORMS_RUNTIME_MODE === "mock") {
    return "project_mock";
  }

  throw new Error("Forms runtime project routing is not configured");
}

function isAllowedLegacyRequest(input: {
  path: string;
  surface: RuntimeSurface;
  method: "GET" | "POST";
}) {
  const slug = "[a-z0-9]+(?:-[a-z0-9]+)*";
  if (input.surface === "hosted") return input.method === "GET" && new RegExp(`^/f/${slug}$`).test(input.path);
  if (input.surface === "embed") return input.method === "GET" && new RegExp(`^/embed/${slug}$`).test(input.path);
  return input.method === "POST" && new RegExp(`^/f/${slug}/(?:submissions|uploads/presign)$`).test(input.path);
}

function resolveRouting(input: {
  env: FormsRuntimeEnv;
  host: string;
  path: string;
  surface: RuntimeSurface;
  method: "GET" | "POST";
  queryProjectId?: string | null;
}): RuntimeTenantRouting {
  const baseHost = normalizePublicHostname(input.env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN);
  if (!baseHost) throw new Error("Invalid public runtime base domain");

  const projectId = input.queryProjectId?.trim();
  if (input.host === baseHost) {
    const legacyProjectId =
      projectId ||
      (input.env.FORMS_RUNTIME_MODE === "mock"
        ? mockProjectId({ env: input.env, host: input.host })
        : undefined);
    if (!legacyProjectId || !isAllowedLegacyRequest(input)) {
      throw new Error("Invalid legacy runtime request");
    }
    return { kind: "legacy-project", hostname: input.host, projectId: legacyProjectId };
  }

  const suffix = `.${baseHost}`;
  const label = input.host.endsWith(suffix)
    ? input.host.slice(0, -suffix.length)
    : "";
  if (!label || label.includes(".")) {
    throw new Error("Invalid runtime hostname");
  }
  return { kind: "hostname", hostname: input.host };
}

export function resolveRequestContext(input: {
  env: FormsRuntimeEnv;
  host: string;
  origin?: string;
  slug: string;
  url: URL;
  surface: RuntimeSurface;
  method: "GET" | "POST";
}): RuntimeRequestContext {
  const host = normalizePublicHostname(input.host);
  if (!host) throw new Error("Invalid runtime host");
  return {
    host,
    origin: normalizeOrigin(input.origin) ?? undefined,
    routing: resolveRouting({
      env: input.env,
      host,
      path: input.url.pathname,
      surface: input.surface,
      method: input.method,
      queryProjectId: input.url.searchParams.get("projectId"),
    }),
    slug: assertFormSlug(input.slug),
    path: input.url.pathname,
    surface: input.surface,
  };
}
