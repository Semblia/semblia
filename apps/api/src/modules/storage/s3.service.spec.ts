import { describe, expect, it, vi } from "vitest";
import { S3Service } from "./s3.service.js";

describe("S3Service signed reads", () => {
  it("streams within both the declared and actual byte limits", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Blob(["hello", " world"]).stream(), {
        status: 200,
        headers: { "content-length": "11" },
      }),
    );
    const service = new S3Service(
      {
        get: vi.fn((key) => (key === "NODE_ENV" ? "test" : undefined)),
      } as never,
      fetcher,
    );
    await expect(
      service.readPresignedGet("https://private.test/file?secret=yes", {
        maxBytes: 20,
        expectedBytes: 11,
        timeoutMs: 1000,
      }),
    ).resolves.toEqual(Buffer.from("hello world"));
  });

  it("cancels an oversized stream and never leaks the signed URL", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(6));
        controller.enqueue(new Uint8Array(6));
      },
      cancel,
    });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "content-length": "12" },
      }),
    );
    const service = new S3Service(
      {
        get: vi.fn((key) => (key === "NODE_ENV" ? "test" : undefined)),
      } as never,
      fetcher,
    );
    const error = await service
      .readPresignedGet("https://private.test/file?AWSAccessKeyId=secret", {
        maxBytes: 10,
        expectedBytes: 12,
        timeoutMs: 1000,
      })
      .catch((caught: unknown) => caught);
    expect(String(error)).not.toContain("AWSAccessKeyId");
    expect(String(error)).not.toContain("secret");
    expect(cancel).toHaveBeenCalled();
  });

  it("rejects a missing or mismatched response length before buffering", async () => {
    const missingCancel = vi.fn();
    const mismatchCancel = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new ReadableStream<Uint8Array>({ cancel: missingCancel })),
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream<Uint8Array>({ cancel: mismatchCancel }),
          { headers: { "content-length": "3" } },
        ),
      );
    const service = new S3Service(
      {
        get: vi.fn((key) => (key === "NODE_ENV" ? "test" : undefined)),
      } as never,
      fetcher,
    );
    await expect(
      service.readPresignedGet("https://private.test/a", {
        maxBytes: 10,
        expectedBytes: 3,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow("content length");
    expect(missingCancel).toHaveBeenCalled();
    await expect(
      service.readPresignedGet("https://private.test/b", {
        maxBytes: 10,
        expectedBytes: 2,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow("content length");
    expect(mismatchCancel).toHaveBeenCalled();
  });

  it("cancels an acquired reader and aborts an unexpected read failure", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const read = vi.fn().mockRejectedValue(new Error("socket reset"));
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-length": "3" }),
      body: { getReader: () => ({ read, cancel }) },
    });
    const service = new S3Service(
      {
        get: vi.fn((key) => (key === "NODE_ENV" ? "test" : undefined)),
      } as never,
      fetcher as never,
    );

    await expect(
      service.readPresignedGet("https://private.test/file", {
        maxBytes: 10,
        expectedBytes: 3,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow("Private object read failed");

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
});
