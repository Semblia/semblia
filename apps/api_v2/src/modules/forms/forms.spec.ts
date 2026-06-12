import {
  ForbiddenException,
  RequestMethod,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TTL,
} from "@nestjs/throttler/dist/throttler.constants.js";
import { describe, expect, it, vi } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { PublicSubmitThrottlerGuard } from "../responses/public-submit-throttler.guard.js";
import { FormsRuntimeThrottlerGuard } from "./forms-runtime-throttler.guard.js";
import {
  FormsController,
  PublicFormsController,
  RuntimeFormsController,
} from "./forms.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

function createExecutionContext(
  handler: unknown,
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handler,
    getClass: () => FormsController,
  } as unknown as ExecutionContext;
}

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

  it("declares POST /projects/:slug/forms/:formId/duplicate with manage-project capability", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.duplicate),
    ).toBe(":formId/duplicate");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.duplicate),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, FormsController.prototype.duplicate),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.duplicate,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });

  it("rejects duplicate requests from actors without MANAGE_PROJECT", async () => {
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: { id: "project_1", slug: "acme" },
        role: "VIEWER",
        capabilities: new Set([Capability.VIEW_PROJECT]),
      }),
    };
    const guard = new CapabilityGuard(
      new Reflector(),
      projectAccessService as never,
    );

    let error: unknown;
    try {
      await guard.canActivate(
        createExecutionContext(FormsController.prototype.duplicate, {
          params: { slug: "acme", formId: "form_1" },
          user: { id: "user_1" },
        }),
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getStatus()).toBe(403);
  });

  it("allows MANAGE_PROJECT actors to duplicate and returns the created form DTO", async () => {
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: { id: "project_1", slug: "acme" },
        role: "OWNER",
        capabilities: new Set([Capability.MANAGE_PROJECT]),
      }),
    };
    const guard = new CapabilityGuard(
      new Reflector(),
      projectAccessService as never,
    );
    const request = {
      params: { slug: "acme", formId: "form_1" },
      user: { id: "user_1" },
      projectAccess: undefined as { projectId: string } | undefined,
    };

    await expect(
      guard.canActivate(
        createExecutionContext(FormsController.prototype.duplicate, request),
      ),
    ).resolves.toBe(true);

    const dto = {
      id: "form_copy",
      projectId: "project_1",
      name: "Default Form (copy)",
      description: "Primary form",
      isActive: false,
      abWeight: 0,
      config: { content: { headerTitle: "Hello" } },
      submissions: 0,
      views: 0,
      responseRate: 0,
      avgRating: 0,
      lastSubmissionAt: null,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
    };
    const formsService = {
      duplicate: vi.fn().mockResolvedValue(dto),
    };
    const controller = new FormsController(formsService as never);

    await expect(
      controller.duplicate(
        "user_1",
        { slug: "acme", formId: "form_1" },
        request,
      ),
    ).resolves.toEqual(dto);
    expect(formsService.duplicate).toHaveBeenCalledWith(
      { slug: "acme", formId: "form_1" },
      request,
    );
  });

  it("declares GET and PUT /projects/:slug/forms/:formId/draft with manage-project capability", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.getDraft),
    ).toBe(":formId/draft");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.getDraft),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.getDraft,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);

    expect(
      Reflect.getMetadata(PATH_METADATA, FormsController.prototype.saveDraft),
    ).toBe(":formId/draft");
    expect(
      Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.saveDraft),
    ).toBe(RequestMethod.PUT);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.saveDraft,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        FormsController.prototype.publishDraft,
      ),
    ).toBe(":formId/draft/publish");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        FormsController.prototype.publishDraft,
      ),
    ).toBe(RequestMethod.PUT);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.publishDraft,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });

  it("declares POST /projects/:slug/forms/:formId/theme-telemetry with manage-project capability", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        FormsController.prototype.recordThemeTelemetry,
      ),
    ).toBe(":formId/theme-telemetry");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        FormsController.prototype.recordThemeTelemetry,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        FormsController.prototype.recordThemeTelemetry,
      ),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        FormsController.prototype.recordThemeTelemetry,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "analytics-events",
        FormsController.prototype.recordThemeTelemetry,
      ),
    ).toBe(240);
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

describe("RuntimeFormsController", () => {
  it("declares signed POST /runtime/forms/resolve and /runtime/forms/submit routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, RuntimeFormsController)).toBe(
      "runtime/forms",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RuntimeFormsController.prototype.resolve,
      ),
    ).toBe("resolve");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        RuntimeFormsController.prototype.resolve,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        RuntimeFormsController.prototype.resolve,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RuntimeFormsController.prototype.resolve,
      ),
    ).toEqual([FormsRuntimeThrottlerGuard]);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "forms-runtime-resolve",
        RuntimeFormsController.prototype.resolve,
      ),
    ).toBe(240);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RuntimeFormsController.prototype.submit,
      ),
    ).toBe("submit");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        RuntimeFormsController.prototype.submit,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        RuntimeFormsController.prototype.submit,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RuntimeFormsController.prototype.submit,
      ),
    ).toEqual([FormsRuntimeThrottlerGuard]);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "forms-runtime-submit",
        RuntimeFormsController.prototype.submit,
      ),
    ).toBe(30);
  });

  it("verifies runtime signatures before delegating to the forms service", () => {
    const formsService = {
      resolveRuntimeForm: vi.fn().mockReturnValue({ form: { id: "form_1" } }),
      submitRuntimeForm: vi.fn().mockReturnValue({ redirectTo: null }),
    };
    const signatureService = {
      verify: vi.fn(),
    };
    const controller = new RuntimeFormsController(
      formsService as never,
      signatureService as never,
    );
    const request = {
      method: "POST",
      headers: { "x-semblia-runtime": "forms" },
      rawBody: "{}",
    };

    expect(
      controller.resolve(
        { projectPublicSlug: "acme", formSlug: null, path: "/" },
        request,
      ),
    ).toEqual({ form: { id: "form_1" } });
    expect(signatureService.verify).toHaveBeenCalledWith(
      request,
      "/runtime/forms/resolve",
    );

    expect(
      controller.submit(
        {
          context: { projectPublicSlug: "acme", formSlug: null, path: "/" },
          contentType: "application/x-www-form-urlencoded",
          body: "answers%5Bcontent%5D=Great",
        },
        request,
      ),
    ).toEqual({ redirectTo: null });
    expect(signatureService.verify).toHaveBeenCalledWith(
      request,
      "/runtime/forms/submit",
    );
  });
});
