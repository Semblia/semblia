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
  PublicResponsesController,
  ResponsesController,
} from "./responses.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("ResponsesController", () => {
  it("declares project-scoped private response routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ResponsesController)).toBe(
      "projects/:slug/responses",
    );

    expect(
      Reflect.getMetadata(PATH_METADATA, ResponsesController.prototype.list),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ResponsesController.prototype.list),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(PATH_METADATA, ResponsesController.prototype.getById),
    ).toBe(":responseId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ResponsesController.prototype.getById,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ResponsesController.prototype.createAnnotation,
      ),
    ).toBe(":responseId/annotations");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ResponsesController.prototype.createAnnotation,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ResponsesController.prototype.moderate,
      ),
    ).toBe(":responseId/moderation");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ResponsesController.prototype.moderate,
      ),
    ).toBe(RequestMethod.POST);
  });

  it("keeps reads and workflow writes behind the expected capabilities", () => {
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
        ResponsesController.prototype.getById,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ResponsesController.prototype.createAnnotation,
      ),
    ).toEqual([Capability.REVIEW_RESPONSES]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ResponsesController.prototype.moderate,
      ),
    ).toEqual([Capability.REVIEW_RESPONSES]);
  });
});

describe("PublicResponsesController", () => {
  it("declares the public response routes as public metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicResponsesController)).toBe(
      "responses",
    );

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe("/public/projects/:slug");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe(true);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicResponsesController.prototype.listPublic,
      ),
    ).toBe("/public/projects/:slug");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicResponsesController.prototype.listPublic,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicResponsesController.prototype.listPublic,
      ),
    ).toBe(true);
  });

  it("wires custom throttling metadata for the public routes", () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PublicResponsesController.prototype.createPublic,
      ),
    ).toEqual([PublicSubmitThrottlerGuard]);
    expect(
      Reflect.getMetadata(
        THROTTLER_SKIP + "default",
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-list",
        PublicResponsesController.prototype.listPublic,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-list",
        PublicResponsesController.prototype.listPublic,
      ),
    ).toBe(60000);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-submit-browser",
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe(10);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-submit-browser",
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe(60000);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-submit-hmac",
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-submit-hmac",
        PublicResponsesController.prototype.createPublic,
      ),
    ).toBe(60000);
  });
});
