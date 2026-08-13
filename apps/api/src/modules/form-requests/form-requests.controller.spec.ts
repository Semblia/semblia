import { RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { FormRequestsController } from "./form-requests.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("FormRequestsController", () => {
  it("declares the project form-request routes under one capability guard", () => {
    expect(Reflect.getMetadata(PATH_METADATA, FormRequestsController)).toBe(
      "projects/:slug/form-requests",
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, FormRequestsController),
    ).toEqual([CapabilityGuard]);

    for (const [handler, method] of [
      [FormRequestsController.prototype.create, RequestMethod.POST],
      [FormRequestsController.prototype.list, RequestMethod.GET],
    ] as const) {
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe("/");
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
      expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, handler)).toEqual([
        Capability.REVIEW_RESPONSES,
      ]);
    }
  });
});
