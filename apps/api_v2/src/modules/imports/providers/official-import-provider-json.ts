import { ImportProviderError } from "./official-import-providers.js";

const MAX_RESPONSE_BYTES = 1_000_000;

export async function discardResponse(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // Status and headers are sufficient for sanitized provider classification.
  }
}

export async function readBoundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
    await discardResponse(response);
    throw responseTooLarge();
  }
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw responseTooLarge();
    }
    chunks.push(value);
  }
  return parseResponseJson(new TextDecoder().decode(concat(chunks, size)));
}

function responseTooLarge() {
  return new ImportProviderError(
    "PROVIDER_INVALID_RESPONSE",
    "Provider response exceeded the allowed size.",
  );
}

function parseResponseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ImportProviderError(
      "PROVIDER_INVALID_RESPONSE",
      "Provider returned an invalid response.",
    );
  }
}

function concat(chunks: Uint8Array[], size: number) {
  const value = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    value.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return value;
}
