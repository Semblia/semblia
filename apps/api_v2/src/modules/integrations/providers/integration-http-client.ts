import { Injectable } from "@nestjs/common";

export type IntegrationHttpClientPostJsonInput = {
  url: string;
  token: string;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
};

export type IntegrationHttpClientResponse = {
  status: number;
  body: unknown;
};

@Injectable()
export class IntegrationHttpClient {
  async postJson({
    url,
    token,
    body,
    headers = {},
  }: IntegrationHttpClientPostJsonInput): Promise<IntegrationHttpClientResponse> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      throw new IntegrationProviderError(
        `Provider returned HTTP ${response.status}`,
        response.status,
        responseBody,
      );
    }

    return { status: response.status, body: responseBody };
  }
}

export class IntegrationProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly responseBody?: unknown,
  ) {
    super(message);
  }
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
