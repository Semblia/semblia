import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { OpsAdminController } from "./ops-admin.controller.js";
import { OpsAdminService } from "./ops-admin.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("OpsAdminController", () => {
  it("is defined", () => {
    expect(OpsAdminController).toBeDefined();
  });

  it("declares GET /ops-admin/_status", () => {
    expect(Reflect.getMetadata(PATH_METADATA, OpsAdminController)).toBe(
      "ops-admin",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OpsAdminController.prototype.getStatus,
      ),
    ).toBe("_status");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        OpsAdminController.prototype.getStatus,
      ),
    ).toBe(RequestMethod.GET);
  });

  it("keeps ops-admin status placeholder-only and non-sensitive", () => {
    const service = new OpsAdminService();

    expect(service.getStatus()).toEqual({
      status: "ready",
      surface: "internal-only",
    });
  });
});
