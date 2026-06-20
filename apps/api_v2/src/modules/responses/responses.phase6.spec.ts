import { RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import {
  RuntimeFormSubmissionsController,
  ResponsesController,
} from "./responses.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("Responses Phase 6 route contract", () => {
  it("restores authenticated response review and publish routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ResponsesController)).toBe(
      "projects/:slug/responses",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ResponsesController)).toEqual([
      CapabilityGuard,
    ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ResponsesController.prototype.list,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ResponsesController.prototype.updateStatus,
      ),
    ).toEqual([Capability.REVIEW_RESPONSES]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ResponsesController.prototype.updatePublish,
      ),
    ).toEqual([Capability.PUBLISH_RESPONSES]);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ResponsesController.prototype.updateStatus,
      ),
    ).toBe(RequestMethod.PATCH);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ResponsesController.prototype.updatePublish,
      ),
    ).toBe(":responseId/publish");
  });

  it("restores public runtime submission and upload routes", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, RuntimeFormSubmissionsController),
    ).toBe("runtime/forms");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        RuntimeFormSubmissionsController.prototype.submit,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RuntimeFormSubmissionsController.prototype.submit,
      ),
    ).toBe(":slug/submissions");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RuntimeFormSubmissionsController.prototype.presignUpload,
      ),
    ).toBe(":slug/uploads/presign");
  });
});
