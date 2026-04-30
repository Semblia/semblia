import { RequestMethod } from "@nestjs/common";
import {
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TTL,
} from "@nestjs/throttler/dist/throttler.constants.js";
import { describe, expect, it } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { PublicSubmitThrottlerGuard } from "../testimonials/public-submit-throttler.guard.js";
import { FormsController, PublicFormsController } from "./forms.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("FormsController", () => {
  it("declares GET /projects/:slug/forms with manage-project capability", () => {
    expect(Reflect.getMetadata(PATH_METADATA, FormsController)).toBe(
      "projects/:slug/forms",
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.list),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.list),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, FormsController.prototype.list),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.list,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });

  it("declares POST /projects/:slug/forms with manage-project capability", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.create),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.create),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.create,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });

  it("declares GET /projects/:slug/forms/:formId with manage-project capability", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.getById),
    ).toBe(":formId");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.getById),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.getById,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });

  it("declares PATCH /projects/:slug/forms/:formId with manage-project capability", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.update),
    ).toBe(":formId");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.update),
    ).toBe(RequestMethod.PATCH);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.update,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });

  it("declares DELETE /projects/:slug/forms/:formId with manage-project capability", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.delete),
    ).toBe(":formId");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.delete),
    ).toBe(RequestMethod.DELETE);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.delete,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });
});

describe("PublicFormsController", () => {
  it("declares GET /forms/public/projects/:slug as a public route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicFormsController)).toBe(
      "forms",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicFormsController.prototype.listPublic,
      ),
    ).toBe("/public/projects/:slug");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicFormsController.prototype.listPublic,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicFormsController.prototype.listPublic,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_SKIP + "default",
        PublicFormsController.prototype.listPublic,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-list",
        PublicFormsController.prototype.listPublic,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-list",
        PublicFormsController.prototype.listPublic,
      ),
    ).toBe(60000);
  });

  it("declares POST /forms/public/projects/:slug/:formId/submissions with public trust throttling", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe("/public/projects/:slug/:formId/submissions");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PublicFormsController.prototype.submitPublic,
      ),
    ).toEqual([PublicSubmitThrottlerGuard]);
    expect(
      Reflect.getMetadata(
        THROTTLER_SKIP + "default",
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-submit-browser",
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe(10);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-submit-browser",
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe(60000);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-submit-hmac",
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-submit-hmac",
        PublicFormsController.prototype.submitPublic,
      ),
    ).toBe(60000);
  });
});
