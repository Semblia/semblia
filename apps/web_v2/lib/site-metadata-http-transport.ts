import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

const NULL_BODY_STATUSES = new Set([204, 205, 304]);

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string,
  family: 4 | 6,
) => void;

export type AllowedMetadataFetchTarget = {
  url: URL;
  address?: string;
  family?: 4 | 6;
};

export function requestPinnedMetadataTarget(
  target: AllowedMetadataFetchTarget,
  init: RequestInit,
) {
  return new Promise<Response>((resolve, reject) => {
    const request =
      target.url.protocol === "http:" ? httpRequest : httpsRequest;
    const req = request(
      target.url,
      buildRequestOptions({ target, init }),
      (res) => {
        resolve(
          new Response(responseBody({ response: res }), {
            status: res.statusCode ?? 502,
            statusText: res.statusMessage,
            headers: responseHeaders({ headers: res.headers }),
          }),
        );
      },
    );

    req.on("error", reject);
    writeRequestBody({ request: req, body: init.body });
  });
}

function buildRequestOptions(input: {
  target: AllowedMetadataFetchTarget;
  init: RequestInit;
}) {
  return {
    method: input.init.method,
    headers: Object.fromEntries(new Headers(input.init.headers).entries()),
    signal: input.init.signal ?? undefined,
    lookup: targetLookup({ target: input.target }),
  };
}

function targetLookup(input: { target: AllowedMetadataFetchTarget }) {
  const { address, family } = input.target;
  if (!address || !family) return undefined;
  return (_hostname: string, _options: unknown, callback: LookupCallback) => {
    callback(null, address, family);
  };
}

function responseBody(input: {
  response: import("node:http").IncomingMessage;
}) {
  const status = input.response.statusCode ?? 502;
  if (NULL_BODY_STATUSES.has(status)) return null;
  return Readable.toWeb(input.response) as ReadableStream<Uint8Array>;
}

function responseHeaders(input: { headers: IncomingHttpHeaders }) {
  const result = new Headers();
  for (const [name, value] of Object.entries(input.headers)) {
    appendHeaderValue({ headers: result, name, value });
  }
  return result;
}

function appendHeaderValue(input: {
  headers: Headers;
  name: string;
  value: string | string[] | number | undefined;
}) {
  if (Array.isArray(input.value)) {
    input.value.forEach((entry) => input.headers.append(input.name, entry));
    return;
  }

  if (input.value !== undefined) {
    input.headers.set(input.name, String(input.value));
  }
}

function writeRequestBody(input: {
  request: import("node:http").ClientRequest;
  body: RequestInit["body"] | null | undefined;
}) {
  if (input.body === undefined || input.body === null) {
    input.request.end();
    return;
  }

  if (typeof input.body === "string" || input.body instanceof Uint8Array) {
    input.request.end(input.body);
    return;
  }

  input.request.destroy(new Error("Unsupported metadata request body type"));
}
