import { RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { SubmissionsController } from "./submissions.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("SubmissionsController", () => {
  it("declares project-scoped private submission routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubmissionsController)).toBe(
      "projects/:slug/submissions",
    );

    expect(
      Reflect.getMetadata(PATH_METADATA, SubmissionsController.prototype.list),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, SubmissionsController.prototype.list),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        SubmissionsController.prototype.getById,
      ),
    ).toBe(":submissionId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        SubmissionsController.prototype.getById,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        SubmissionsController.prototype.createAnnotation,
      ),
    ).toBe(":submissionId/annotations");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        SubmissionsController.prototype.createAnnotation,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        SubmissionsController.prototype.moderate,
      ),
    ).toBe(":submissionId/moderation");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        SubmissionsController.prototype.moderate,
      ),
    ).toBe(RequestMethod.POST);
  });

  it("keeps reads and workflow writes behind the expected capabilities", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SubmissionsController)).toEqual(
      [CapabilityGuard],
    );
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        SubmissionsController.prototype.list,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        SubmissionsController.prototype.getById,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        SubmissionsController.prototype.createAnnotation,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        SubmissionsController.prototype.moderate,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);
  });
});
