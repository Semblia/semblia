import {
  SembliaApiError,
  SembliaClient as SembliaSdkClient,
  type QueryParams,
  type RequestOptions,
} from "@semblia/node";

export type JsonRecord = Record<string, unknown>;

export { SembliaApiError };
export type { QueryParams, RequestOptions };

export type SembliaClientOptions = {
  baseUrl: string;
  agentKey: string;
  fetchImpl?: typeof fetch;
};

/**
 * MCP-facing wrapper over the @semblia/node transport. Tool outputs keep the
 * raw `{ success, data, meta }` envelopes the server has always emitted, so
 * everything routes through the SDK's `requestRaw` rather than the unwrapping
 * helpers.
 */
export class SembliaClient {
  private readonly core: SembliaSdkClient;

  constructor(options: SembliaClientOptions) {
    if (!options.agentKey.trim()) {
      throw new Error("SEMBLIA_AGENT_KEY is required");
    }

    this.core = new SembliaSdkClient({
      apiKey: options.agentKey,
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl,
    });
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

  request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.core.requestRaw<T>(path, options);
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
