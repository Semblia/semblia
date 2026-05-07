import { RequestMethod } from "@nestjs/common";
import {
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TTL,
} from "@nestjs/throttler/dist/throttler.constants.js";
import { describe, expect, it } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { PublicSubmitThrottlerGuard } from "./public-submit-throttler.guard.js";
import {
  PublicTestimonialsController,
  TestimonialsController,
} from "./testimonials.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("TestimonialsController", () => {
  it("declares the authenticated testimonial routes under /projects/:slug/testimonials", () => {
    expect(Reflect.getMetadata(PATH_METADATA, TestimonialsController)).toBe(
      "projects/:slug/testimonials",
    );

    expect(
      Reflect.getMetadata(PATH_METADATA, TestimonialsController.prototype.list),
    ).toBe("/");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.list,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TestimonialsController.prototype.getById,
      ),
    ).toBe(":testimonialId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.getById,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TestimonialsController.prototype.approve,
      ),
    ).toBe(":testimonialId/approve");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.approve,
      ),
    ).toBe(RequestMethod.PATCH);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TestimonialsController.prototype.reject,
      ),
    ).toBe(":testimonialId/reject");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.reject,
      ),
    ).toBe(RequestMethod.PATCH);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TestimonialsController.prototype.publish,
      ),
    ).toBe(":testimonialId/publish");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.publish,
      ),
    ).toBe(RequestMethod.PATCH);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TestimonialsController.prototype.createDisplaySuggestion,
      ),
    ).toBe(":testimonialId/display-suggestions");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.createDisplaySuggestion,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TestimonialsController.prototype.approveDisplaySuggestion,
      ),
    ).toBe(":testimonialId/display-suggestions/:revisionId/approve");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.approveDisplaySuggestion,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TestimonialsController.prototype.rejectDisplaySuggestion,
      ),
    ).toBe(":testimonialId/display-suggestions/:revisionId/reject");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TestimonialsController.prototype.rejectDisplaySuggestion,
      ),
    ).toBe(RequestMethod.POST);
  });

  it("applies capability guard metadata to authenticated routes", () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        TestimonialsController.prototype.list,
      ),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.list,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.getById,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.approve,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.reject,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.publish,
      ),
    ).toEqual([Capability.PUBLISH_TESTIMONIALS]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.createDisplaySuggestion,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.approveDisplaySuggestion,
      ),
    ).toEqual([Capability.PUBLISH_TESTIMONIALS]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        TestimonialsController.prototype.rejectDisplaySuggestion,
      ),
    ).toEqual([Capability.REVIEW_TESTIMONIALS]);
  });
});

describe("PublicTestimonialsController", () => {
  it("declares the public testimonial routes as public metadata", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, PublicTestimonialsController),
    ).toBe("testimonials");

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe("/public/projects/:slug");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe(true);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicTestimonialsController.prototype.listPublic,
      ),
    ).toBe("/public/projects/:slug");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicTestimonialsController.prototype.listPublic,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicTestimonialsController.prototype.listPublic,
      ),
    ).toBe(true);
  });

  it("wires custom throttling metadata for the public routes", () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toEqual([PublicSubmitThrottlerGuard]);
    expect(
      Reflect.getMetadata(
        THROTTLER_SKIP + "default",
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-list",
        PublicTestimonialsController.prototype.listPublic,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-list",
        PublicTestimonialsController.prototype.listPublic,
      ),
    ).toBe(60000);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-submit-browser",
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe(10);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-submit-browser",
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe(60000);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-submit-hmac",
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-submit-hmac",
        PublicTestimonialsController.prototype.createPublic,
      ),
    ).toBe(60000);
  });
});
