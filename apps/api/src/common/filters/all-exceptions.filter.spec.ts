import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AllExceptionsFilter } from "./all-exceptions.filter.js";

function createHost() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe("AllExceptionsFilter", () => {
  it("emits the v2 error envelope for HttpException payloads with details", () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = createHost();

    filter.catch(
      new BadRequestException({
        message: "Validation failed",
        details: { field: "email", reason: "required" },
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Validation failed",
        details: { field: "email", reason: "required" },
      },
      meta: {
        timestamp: expect.any(String),
      },
    });
  });

  it("normalizes string HttpException payloads into the v2 error envelope", () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = createHost();

    filter.catch(
      new HttpException("Project not found", HttpStatus.NOT_FOUND),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Project not found",
      },
      meta: {
        timestamp: expect.any(String),
      },
    });
  });

  it("falls back to the internal error envelope for unknown errors", () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = createHost();

    filter.catch(new Error("boom"), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
      meta: {
        timestamp: expect.any(String),
      },
    });
  });
});
