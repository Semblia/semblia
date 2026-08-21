import type {
  SembliaAnnotateResponseBody,
  SembliaCreateFormRequestBody,
  SembliaEnvelope,
  SembliaFormRequest,
  SembliaFormSummary,
  SembliaModerateResponseBody,
  SembliaPage,
  SembliaProject,
  SembliaResponse,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://api.semblia.com/v2";

export interface SembliaClientOptions {
  /**
   * A Semblia credential from your project's Developers section — an API key
   * (`tsk_live_…`) or an agent key (`tag_live_…`). Both authenticate the same
   * way; they differ only in the capabilities the project grants them.
   */
  apiKey: string;
  /** API base URL including the `/v2` prefix. Defaults to production. */
  baseUrl?: string;
  /** Override fetch (testing, instrumentation). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export type QueryParams = Record<
  string,
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>
>;

export interface RequestOptions {
  method?: string;
  query?: QueryParams;
  body?: unknown;
}

export class SembliaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The API's machine-readable error code, when the response carried one. */
    readonly code: string | null,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "SembliaApiError";
  }
}

/**
 * Typed client for the Semblia v2 API.
 *
 * ```ts
 * import { SembliaClient } from "@semblia/node";
 *
 * const semblia = new SembliaClient({ apiKey: process.env.SEMBLIA_API_KEY! });
 * const projects = await semblia.projects.list();
 * ```
 */
export class SembliaClient {
  private readonly baseUrl: URL;
  private readonly fetchImpl: typeof fetch;
  private readonly apiKey: string;

  constructor(options: SembliaClientOptions) {
    if (!options.apiKey?.trim()) {
      throw new Error("SembliaClient requires an apiKey (tsk_… or tag_…)");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = new URL(
      ensureTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL),
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /**
   * Perform a request and return the parsed body exactly as the API sent it
   * (the `{ success, data, meta }` envelope). Throws `SembliaApiError` on a
   * non-2xx status.
   */
  async requestRaw<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${this.apiKey}`,
    };

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url.href, { method, headers, body });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new SembliaApiError(
        getErrorMessage(response, responseBody),
        response.status,
        getErrorCode(responseBody),
        responseBody,
      );
    }

    return responseBody as T;
  }

  /** Perform a request and return the envelope's `data` payload. */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const raw = await this.requestRaw<unknown>(path, options);
    if (isEnvelope(raw)) return raw.data as T;
    return raw as T;
  }

  get<T = unknown>(path: string, options: Omit<RequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body });
  }

  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PATCH", body });
  }

  readonly projects = {
    /** `GET /projects` — the projects this credential can see. */
    list: (query: QueryParams = {}) =>
      this.get<SembliaPage<SembliaProject>>("/projects", { query }),
    /** `GET /projects/:slug` */
    get: (slug: string) =>
      this.get<SembliaProject>(`/projects/${encodeURIComponent(slug)}`),
  };

  readonly forms = {
    /** `GET /projects/:slug/forms` */
    list: (project: string) =>
      this.get<SembliaFormSummary[]>(
        `/projects/${encodeURIComponent(project)}/forms`,
      ),
  };

  readonly responses = {
    /** `GET /projects/:slug/responses` */
    list: (project: string, query: QueryParams = {}) =>
      this.get<SembliaPage<SembliaResponse>>(
        `/projects/${encodeURIComponent(project)}/responses`,
        { query },
      ),
    /** `GET /projects/:slug/responses/:id` */
    get: (project: string, responseId: string) =>
      this.get<SembliaResponse>(
        `/projects/${encodeURIComponent(project)}/responses/${encodeURIComponent(responseId)}`,
      ),
    /** `POST /projects/:slug/responses/:id/annotations` */
    annotate: (
      project: string,
      responseId: string,
      body: SembliaAnnotateResponseBody,
    ) =>
      this.post<SembliaResponse>(
        `/projects/${encodeURIComponent(project)}/responses/${encodeURIComponent(responseId)}/annotations`,
        body,
      ),
    /** `POST /projects/:slug/responses/:id/moderation` */
    moderate: (
      project: string,
      responseId: string,
      body: SembliaModerateResponseBody,
    ) =>
      this.post<SembliaResponse>(
        `/projects/${encodeURIComponent(project)}/responses/${encodeURIComponent(responseId)}/moderation`,
        body,
      ),
  };

  readonly formRequests = {
    /** `POST /projects/:slug/form-requests` — email people a link to a hosted form. */
    create: (project: string, body: SembliaCreateFormRequestBody) =>
      this.post<SembliaFormRequest>(
        `/projects/${encodeURIComponent(project)}/form-requests`,
        body,
      ),
    /** `GET /projects/:slug/form-requests` */
    list: (project: string, query: QueryParams = {}) =>
      this.get<SembliaFormRequest[]>(
        `/projects/${encodeURIComponent(project)}/form-requests`,
        { query },
      ),
  };

  readonly analytics = {
    /** `GET /projects/:slug/analytics/summary` */
    summary: (project: string, query: QueryParams = {}) =>
      this.get<Record<string, unknown>>(
        `/projects/${encodeURIComponent(project)}/analytics/summary`,
        { query },
      ),
  };

  private buildUrl(path: string, query: QueryParams | undefined) {
    const url = new URL(path.replace(/^\/+/, ""), this.baseUrl);

    for (const [key, rawValue] of Object.entries(query ?? {})) {
      if (rawValue === undefined || rawValue === null) continue;
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      for (const value of values) {
        url.searchParams.append(key, String(value));
      }
    }

    return url;
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

function isEnvelope(value: unknown): value is SembliaEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "success" in value &&
    "data" in value
  );
}

function getErrorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const error = (body as Record<string, unknown>)["error"];
  if (typeof error !== "object" || error === null) return null;
  const code = (error as Record<string, unknown>)["code"];
  return typeof code === "string" ? code : null;
}

function getErrorMessage(response: Response, body: unknown) {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    const error = record["error"];
    if (typeof error === "object" && error !== null) {
      const message = (error as Record<string, unknown>)["message"];
      if (typeof message === "string" && message.trim()) return message;
    }
    const message = record["message"] ?? record["error"];
    if (typeof message === "string" && message.trim()) return message;
  }

  if (typeof body === "string" && body.trim()) return body;
  return `HTTP ${response.status}: ${response.statusText}`;
}
