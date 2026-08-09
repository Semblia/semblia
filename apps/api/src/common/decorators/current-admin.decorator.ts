import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { AdminUser } from "@workspace/database/prisma";
import type { AdminLookupRequest } from "../interceptors/admin-lookup.interceptor.js";

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser => {
    const request = ctx.switchToHttp().getRequest<AdminLookupRequest>();
    if (!request.adminUser) {
      throw new UnauthorizedException("Admin context is missing");
    }

    return request.adminUser;
  },
);
