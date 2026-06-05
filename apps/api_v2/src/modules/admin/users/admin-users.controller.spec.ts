import { RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator.js";
import { ClerkAdminAuthGuard } from "../../../common/guards/clerk-admin-auth.guard.js";
import { AdminLookupInterceptor } from "../../../common/interceptors/admin-lookup.interceptor.js";
import { AdminUsersController } from "./admin-users.controller.js";

const GUARDS_METADATA = "__guards__";
const INTERCEPTORS_METADATA = "__interceptors__";
const METHOD_METADATA = "method";
const PATH_METADATA = "path";

describe("AdminUsersController", () => {
  it("declares secure admin-user management routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminUsersController)).toBe(
      "admin/users",
    );
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AdminUsersController)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminUsersController)).toEqual([
      ClerkAdminAuthGuard,
    ]);
    expect(
      Reflect.getMetadata(INTERCEPTORS_METADATA, AdminUsersController),
    ).toEqual([AdminLookupInterceptor]);

    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AdminUsersController.prototype.listAdmins,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AdminUsersController.prototype.grantAdmin,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AdminUsersController.prototype.deactivateAdmin,
      ),
    ).toBe(":id/deactivate");
  });
});
