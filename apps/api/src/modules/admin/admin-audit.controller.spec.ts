import { RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { ClerkAdminAuthGuard } from "../../common/guards/clerk-admin-auth.guard.js";
import { AdminLookupInterceptor } from "../../common/interceptors/admin-lookup.interceptor.js";
import { AdminAuditController } from "./admin-audit.controller.js";

const GUARDS_METADATA = "__guards__";
const INTERCEPTORS_METADATA = "__interceptors__";
const METHOD_METADATA = "method";
const PATH_METADATA = "path";

describe("AdminAuditController", () => {
  it("declares a protected recent audit-log route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminAuditController)).toBe(
      "admin/audit-logs",
    );
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AdminAuditController)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminAuditController)).toEqual([
      ClerkAdminAuthGuard,
    ]);
    expect(
      Reflect.getMetadata(INTERCEPTORS_METADATA, AdminAuditController),
    ).toEqual([AdminLookupInterceptor]);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AdminAuditController.prototype.listAuditLogs,
      ),
    ).toBe(RequestMethod.GET);
  });
});
