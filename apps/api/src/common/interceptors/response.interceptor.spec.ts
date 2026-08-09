import { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { ResponseInterceptor } from "./response.interceptor.js";

function createNext(value: unknown): CallHandler {
  return {
    handle: vi.fn(() => of(value)),
  };
}

describe("ResponseInterceptor", () => {
  it("wraps plain values in the v2 success envelope", async () => {
    const interceptor = new ResponseInterceptor();

    const result = await lastValueFrom(
      interceptor.intercept(
        {} as ExecutionContext,
        createNext({ id: "project_1", slug: "alpha" }),
      ),
    );

    expect(result).toMatchObject({
      success: true,
      data: { id: "project_1", slug: "alpha" },
    });
    expect(result).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      }),
    );
  });

  it("preserves already-wrapped success payloads", async () => {
    const interceptor = new ResponseInterceptor();
    const wrapped = {
      success: true,
      data: { id: "form_1" },
      meta: { timestamp: "2026-05-01T00:00:00.000Z", source: "service" },
    };

    const result = await lastValueFrom(
      interceptor.intercept({} as ExecutionContext, createNext(wrapped)),
    );

    expect(result).toBe(wrapped);
  });

  it("hoists service meta from { data, meta } results", async () => {
    const interceptor = new ResponseInterceptor();

    const result = await lastValueFrom(
      interceptor.intercept(
        {} as ExecutionContext,
        createNext({
          data: [{ id: "item_1" }],
          meta: { page: 2, total: 7 },
        }),
      ),
    );

    expect(result).toMatchObject({
      success: true,
      data: [{ id: "item_1" }],
      meta: {
        page: 2,
        total: 7,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      }),
    );
  });
});
