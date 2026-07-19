import { RequestMethod, UnauthorizedException } from "@nestjs/common";
import {
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TTL,
} from "@nestjs/throttler/dist/throttler.constants.js";
import { describe, expect, it, vi } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { FormsController } from "./forms.controller.js";
import { runtimeFormSnapshotQuerySchema } from "./forms.dto.js";
import { RuntimeFormsController } from "./runtime-forms.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("FormsController", () => {
  it("declares the authenticated form routes under /projects/:slug/forms", () => {
    expect(Reflect.getMetadata(PATH_METADATA, FormsController)).toBe(
      "projects/:slug/forms",
    );

    const routes = [
      [FormsController.prototype.list, "/", RequestMethod.GET],
      [FormsController.prototype.create, "/", RequestMethod.POST],
      [FormsController.prototype.getById, ":formId", RequestMethod.GET],
      [FormsController.prototype.update, ":formId", RequestMethod.PATCH],
      [FormsController.prototype.delete, ":formId", RequestMethod.DELETE],
      [FormsController.prototype.getDraft, ":formId/draft", RequestMethod.GET],
      [
        FormsController.prototype.saveDraft,
        ":formId/draft",
        RequestMethod.PATCH,
      ],
      [
        FormsController.prototype.publish,
        ":formId/publish",
        RequestMethod.POST,
      ],
      [
        FormsController.prototype.listVersions,
        ":formId/versions",
        RequestMethod.GET,
      ],
      [
        FormsController.prototype.getVersion,
        ":formId/versions/:version",
        RequestMethod.GET,
      ],
    ] as const;

    for (const [handler, path, method] of routes) {
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    }
  });

  it("applies the publish-surface capability guard to every authenticated form route", () => {
    for (const handler of [
      FormsController.prototype.list,
      FormsController.prototype.create,
      FormsController.prototype.getById,
      FormsController.prototype.update,
      FormsController.prototype.delete,
      FormsController.prototype.getDraft,
      FormsController.prototype.saveDraft,
      FormsController.prototype.publish,
      FormsController.prototype.listVersions,
      FormsController.prototype.getVersion,
    ]) {
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
        CapabilityGuard,
      ]);
      expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, handler)).toEqual([
        Capability.MANAGE_PUBLISH_SURFACES,
      ]);
    }
  });
});

describe("RuntimeFormsController", () => {
  it("requires exactly a hosted or embed signed surface while keeping projectId optional", () => {
    expect(runtimeFormSnapshotQuerySchema.parse({ surface: "hosted" })).toEqual({
      surface: "hosted",
    });
    expect(runtimeFormSnapshotQuerySchema.parse({ surface: "embed" })).toEqual({
      surface: "embed",
    });
    expect(runtimeFormSnapshotQuerySchema.safeParse({}).success).toBe(false);
    expect(
      runtimeFormSnapshotQuerySchema.safeParse({ surface: "iframe" }).success,
    ).toBe(false);
  });

  it("declares GET /runtime/forms/:slug/snapshot as a public throttled route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, RuntimeFormsController)).toBe(
      "runtime/forms",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RuntimeFormsController.prototype.getSnapshotBySlug,
      ),
    ).toBe(":slug/snapshot");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        RuntimeFormsController.prototype.getSnapshotBySlug,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        RuntimeFormsController.prototype.getSnapshotBySlug,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_SKIP + "default",
        RuntimeFormsController.prototype.getSnapshotBySlug,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-list",
        RuntimeFormsController.prototype.getSnapshotBySlug,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-list",
        RuntimeFormsController.prototype.getSnapshotBySlug,
      ),
    ).toBe(60000);
  });

  it("verifies wildcard hosted snapshots before reading without a browser project ID", async () => {
    const formsService = {
      getRuntimeSnapshotBySlug: vi.fn().mockResolvedValue({ snapshotId: "snapshot_1" }),
    };
    const runtimeTrust = {
      verifyAndResolve: vi.fn().mockResolvedValue({ projectId: "project_wildcard" }),
    };
    const controller = new RuntimeFormsController(
      formsService as never,
      runtimeTrust as never,
    );
    const request = {
      method: "GET",
      originalUrl: "/v2/runtime/forms/contact/snapshot?surface=hosted",
      headers: { "x-semblia-runtime-host": "acme.forms.semblia.com" },
      rawBody: Buffer.alloc(0),
    };

    await expect(
      controller.getSnapshotBySlug(
        { slug: "contact" },
        { surface: "hosted" },
        request,
      ),
    ).resolves.toEqual({ snapshotId: "snapshot_1" });
    expect(runtimeTrust.verifyAndResolve).toHaveBeenCalledWith(request, {
      operation: "HOSTED_PAGE",
      legacyProjectId: undefined,
    });
    expect(formsService.getRuntimeSnapshotBySlug).toHaveBeenCalledWith(
      { slug: "contact" },
      "project_wildcard",
      "hosted",
    );
  });

  it("passes exact-host hosted and embed compatibility through the signed trust boundary", async () => {
    const formsService = {
      getRuntimeSnapshotBySlug: vi.fn().mockResolvedValue({ snapshotId: "snapshot_1" }),
    };
    const runtimeTrust = {
      verifyAndResolve: vi.fn().mockResolvedValue({ projectId: "project_exact" }),
    };
    const controller = new RuntimeFormsController(
      formsService as never,
      runtimeTrust as never,
    );
    const hostedRequest = {
      method: "GET",
      originalUrl: "/v2/runtime/forms/contact/snapshot?projectId=project_exact&surface=hosted",
      headers: { "x-semblia-runtime-host": "forms.semblia.com" },
      rawBody: Buffer.alloc(0),
    };
    const embedRequest = {
      method: "GET",
      originalUrl: "/v2/runtime/forms/contact/snapshot?projectId=project_exact&surface=embed",
      headers: { "x-semblia-runtime-host": "forms.semblia.com" },
      rawBody: Buffer.alloc(0),
    };

    await controller.getSnapshotBySlug(
      { slug: "contact" },
      { projectId: "project_exact", surface: "hosted" },
      hostedRequest,
    );
    await controller.getSnapshotBySlug(
      { slug: "contact" },
      { projectId: "project_exact", surface: "embed" },
      embedRequest,
    );

    expect(runtimeTrust.verifyAndResolve).toHaveBeenNthCalledWith(1, hostedRequest, {
      operation: "HOSTED_PAGE",
      legacyProjectId: "project_exact",
    });
    expect(runtimeTrust.verifyAndResolve).toHaveBeenNthCalledWith(2, embedRequest, {
      operation: "EMBED_PAGE",
      legacyProjectId: "project_exact",
    });
    expect(formsService.getRuntimeSnapshotBySlug).toHaveBeenCalledWith(
      { slug: "contact" }, "project_exact", "hosted",
    );
    expect(formsService.getRuntimeSnapshotBySlug).toHaveBeenLastCalledWith(
      { slug: "contact" }, "project_exact", "embed",
    );
  });

  it("rejects a wildcard legacy project ID through trust before accessing forms", async () => {
    const formsService = { getRuntimeSnapshotBySlug: vi.fn() };
    const runtimeTrust = {
      verifyAndResolve: vi
        .fn()
        .mockRejectedValue(new UnauthorizedException("Unauthorized runtime request")),
    };
    const controller = new RuntimeFormsController(
      formsService as never,
      runtimeTrust as never,
    );
    const request = {
      method: "GET",
      originalUrl: "/v2/runtime/forms/contact/snapshot?projectId=project_other&surface=hosted",
      headers: { "x-semblia-runtime-host": "acme.forms.semblia.com" },
      rawBody: Buffer.alloc(0),
    };

    await expect(
      controller.getSnapshotBySlug(
        { slug: "contact" },
        { projectId: "project_other", surface: "hosted" },
        request,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(runtimeTrust.verifyAndResolve).toHaveBeenCalledWith(request, {
      operation: "HOSTED_PAGE",
      legacyProjectId: "project_other",
    });
    expect(formsService.getRuntimeSnapshotBySlug).not.toHaveBeenCalled();
  });

  it("hard-rejects invalid runtime headers before accessing forms", async () => {
    const formsService = { getRuntimeSnapshotBySlug: vi.fn() };
    const runtimeTrust = {
      verifyAndResolve: vi
        .fn()
        .mockRejectedValue(new UnauthorizedException("Unauthorized runtime request")),
    };
    const controller = new RuntimeFormsController(
      formsService as never,
      runtimeTrust as never,
    );

    await expect(
      controller.getSnapshotBySlug(
        { slug: "contact" },
        { surface: "hosted" },
        {
          method: "GET",
          originalUrl: "/v2/runtime/forms/contact/snapshot?surface=hosted",
          headers: { "x-semblia-runtime-host": "acme.forms.semblia.com" },
          rawBody: Buffer.alloc(0),
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(formsService.getRuntimeSnapshotBySlug).not.toHaveBeenCalled();
  });

  it("removes the global snapshot-ID handler", () => {
    expect("getSnapshotById" in RuntimeFormsController.prototype).toBe(false);
  });
});
