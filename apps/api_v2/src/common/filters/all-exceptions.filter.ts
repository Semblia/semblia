import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

type ErrorEnvelope = {
  code: string;
  message: string;
  details?: unknown;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const error = this.buildHttpError(exception, payload, status);

      response.status(status).json({
        success: false,
        error,
        meta: { timestamp },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
      meta: { timestamp },
    });
  }

  private buildHttpError(
    exception: HttpException,
    payload: string | object,
    status: number,
  ): ErrorEnvelope {
    if (typeof payload === "string") {
      return {
        code: this.mapCode(exception, status),
        message: payload,
      };
    }

    const record = payload as Record<string, unknown>;
    const rawMessage = record.message;
    const details = record.details;

    return {
      code: this.mapCode(exception, status),
      message: Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : typeof rawMessage === "string"
          ? rawMessage
          : exception.message,
      ...(details !== undefined ? { details } : {}),
    };
  }

  private mapCode(exception: HttpException, status: number): string {
    if (exception instanceof BadRequestException) {
      return "BAD_REQUEST";
    }

    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.NOT_IMPLEMENTED:
        return "NOT_IMPLEMENTED";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "UNPROCESSABLE_ENTITY";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "RATE_LIMITED";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "SERVICE_UNAVAILABLE";
      default:
        return status >= 500 ? "INTERNAL_ERROR" : `HTTP_${status}`;
    }
  }
}
