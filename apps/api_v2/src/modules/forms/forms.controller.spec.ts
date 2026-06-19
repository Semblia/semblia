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
import { FormsController } from "./forms.controller.js";
import {
  RuntimeFormsController,
  RuntimeSnapshotsController,
} from "./runtime-forms.controller.js";

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
});

describe("RuntimeSnapshotsController", () => {
  it("declares GET /runtime/snapshots/:snapshotId as a public throttled route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, RuntimeSnapshotsController)).toBe(
      "runtime/snapshots",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RuntimeSnapshotsController.prototype.getSnapshotById,
      ),
    ).toBe(":snapshotId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        RuntimeSnapshotsController.prototype.getSnapshotById,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        RuntimeSnapshotsController.prototype.getSnapshotById,
      ),
    ).toBe(true);
  });
});
