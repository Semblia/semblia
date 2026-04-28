import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, type Observable } from "rxjs";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (
          value &&
          typeof value === "object" &&
          "success" in (value as Record<string, unknown>)
        ) {
          return value;
        }

        const timestamp = new Date().toISOString();
        const record =
          value && typeof value === "object"
            ? (value as Record<string, unknown>)
            : null;
        const hasWrappedShape =
          record !== null && "data" in record && Object.keys(record).length <= 2;

        return {
          success: true,
          data: hasWrappedShape ? record.data : value,
          meta: {
            timestamp,
            ...(hasWrappedShape && record.meta && typeof record.meta === "object"
              ? (record.meta as Record<string, unknown>)
              : {}),
          },
        };
      }),
    );
  }
}
