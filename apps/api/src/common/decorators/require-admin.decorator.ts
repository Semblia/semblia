import { applyDecorators, UseGuards, UseInterceptors } from "@nestjs/common";
import { ClerkAdminAuthGuard } from "../guards/clerk-admin-auth.guard.js";
import { AdminLookupInterceptor } from "../interceptors/admin-lookup.interceptor.js";

export const RequireAdmin = () =>
  applyDecorators(
    UseGuards(ClerkAdminAuthGuard),
    UseInterceptors(AdminLookupInterceptor),
  );
