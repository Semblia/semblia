import { RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { ImportsController } from "./imports.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("ImportsController", () => {
  it("declares project-scoped view and operating routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ImportsController)).toBe(
      "projects/:slug/imports",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ImportsController)).toEqual([
      CapabilityGuard,
    ]);

    for (const method of ["catalog", "list", "get"] as const) {
      expect(
        Reflect.getMetadata(
          REQUIRED_CAPABILITIES_KEY,
          ImportsController.prototype[method],
        ),
      ).toEqual([Capability.VIEW_PROJECT]);
    }
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ImportsController.prototype.createManual,
      ),
    ).toEqual([Capability.OPERATE_PROJECT]);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ImportsController.prototype.createManual,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ImportsController.prototype.createManual,
      ),
    ).toBe("jobs/manual");
  });
});
