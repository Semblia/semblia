export type JsonRecord = Record<string, unknown>;

export type SembliaClientOptions = {
  baseUrl: string;
  agentKey: string;
  fetchImpl?: typeof fetch;
};

export type RequestOptions = {
  method?: string;
  query?: QueryParams;
  body?: unknown;
};

type QueryParams = Record<
  string,
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>
>;

export class SembliaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "SembliaApiError";
  }
}

export class SembliaClient {
  private readonly baseUrl: URL;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: SembliaClientOptions) {
    if (!options.agentKey.trim()) {
      throw new Error("SEMBLIA_AGENT_KEY is required");
    }

    this.baseUrl = new URL(ensureTrailingSlash(options.baseUrl));
    this.fetchImpl = options.fetchImpl ?? fetch;
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

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${this.options.agentKey}`,
    };

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url.href, {
      method,
      headers,
      body,
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new SembliaApiError(
        getErrorMessage(response, responseBody),
        response.status,
        responseBody,
      );
    }

    return responseBody as T;
  }

  listProjects(query: QueryParams = {}) {
    return this.get("/projects", { query });
  }

  getProject(slug: string) {
    return this.get(`/projects/${encodeURIComponent(slug)}`);
  }

  listResponses(slug: string, query: QueryParams = {}) {
    return this.get(`/projects/${encodeURIComponent(slug)}/responses`, {
      query: { status: "ALL", page: 1, ...query },
    });
  }

  getResponse(slug: string, responseId: string) {
    return this.get(
      `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(
        responseId,
      )}`,
    );
  }

  annotateResponse(
    slug: string,
    responseId: string,
    body: {
      note?: string | null;
      labels?: string[];
      sentiment?: string | null;
      metadata?: JsonRecord | null;
    },
  ) {
    return this.post(
      `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(
        responseId,
      )}/annotations`,
      body,
    );
  }

  moderateResponse(
    slug: string,
    responseId: string,
    body: {
      status: string;
      reason?: string | null;
      metadata?: JsonRecord | null;
    },
  ) {
    return this.post(
      `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(
        responseId,
      )}/moderation`,
      body,
    );
  }

  getProjectAnalytics(slug: string, query: QueryParams = {}) {
    return this.get(`/projects/${encodeURIComponent(slug)}/analytics/summary`, {
      query,
    });
  }

  async getProjectSummary(slug: string) {
    const project = await this.getProject(slug);
    const analytics = await this.getProjectAnalytics(slug).catch((error) => ({
      unavailable: true,
      reason: getUnknownErrorMessage(error),
    }));

    return { project, analytics };
  }

  async listExportDestinations(slug: string) {
    const nativeConnections = await this.get(
      `/projects/${encodeURIComponent(slug)}/integrations`,
    );

    return {
      data: [
        {
          id: "csv",
          destinationType: "csv",
          label: "CSV export",
          description: "Database-backed CSV export artifact.",
        },
        ...extractDataArray(nativeConnections).map((connection) => ({
          ...connection,
          destinationType: "native_integration",
        })),
      ],
      nativeConnections,
    };
  }

  createCsvExport(slug: string, body: { filename?: string }) {
    return this.post(`/projects/${encodeURIComponent(slug)}/exports/csv`, body);
  }

  createNativeIntegrationExport(
    slug: string,
    connectionId: string,
    body: { eventType: string; payload: JsonRecord },
  ) {
    return this.post(
      `/projects/${encodeURIComponent(
        slug,
      )}/integrations/connections/${encodeURIComponent(connectionId)}/exports`,
      body,
    );
  }

  listExportDeliveries(slug: string, query: QueryParams = {}) {
    return this.get(
      `/projects/${encodeURIComponent(slug)}/exports/deliveries`,
      {
        query,
      },
    );
  }

  listOutboundWebhookDeliveries(slug: string, query: QueryParams = {}) {
    return this.get(
      `/projects/${encodeURIComponent(slug)}/outbound-webhooks/deliveries`,
      { query },
    );
  }

  async listDeliveryFailures(slug: string) {
    const [failedExports, exhaustedExports, failedWebhooks, exhaustedWebhooks] =
      await Promise.all([
        this.listExportDeliveries(slug, { status: "FAILED" }),
        this.listExportDeliveries(slug, { status: "EXHAUSTED" }),
        this.listOutboundWebhookDeliveries(slug, { status: "FAILED" }),
        this.listOutboundWebhookDeliveries(slug, { status: "EXHAUSTED" }),
      ]);

    return {
      data: [
        ...tagDeliveries("export", failedExports),
        ...tagDeliveries("export", exhaustedExports),
        ...tagDeliveries("webhook", failedWebhooks),
        ...tagDeliveries("webhook", exhaustedWebhooks),
      ],
    };
  }

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

function getErrorMessage(response: Response, body: unknown) {
  if (isRecord(body)) {
    const message = body["message"] ?? body["error"];
    if (typeof message === "string" && message.trim()) return message;
  }

  if (typeof body === "string" && body.trim()) return body;
  return `HTTP ${response.status}: ${response.statusText}`;
}

function getUnknownErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function extractDataArray(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value["data"])) return [];
  return value["data"].filter(isRecord);
}

function tagDeliveries(kind: "export" | "webhook", value: unknown) {
  return extractDataArray(value).map((delivery) => ({ kind, ...delivery }));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
