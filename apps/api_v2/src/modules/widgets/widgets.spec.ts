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
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import {
  PublicWallsController,
  PublicWidgetEmbedsController,
  WidgetsController,
} from "./widgets.controller.js";

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
    getClass: () => WidgetsController,
  } as unknown as ExecutionContext;
}

describe("WidgetsController", () => {
  it("declares the authenticated widget routes under /projects/:slug/widgets", () => {
    expect(Reflect.getMetadata(PATH_METADATA, WidgetsController)).toBe(
      "projects/:slug/widgets",
    );

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.list),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, WidgetsController.prototype.list),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.create),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, WidgetsController.prototype.create),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.getById),
    ).toBe(":widgetId");
    expect(
      Reflect.getMetadata(METHOD_METADATA, WidgetsController.prototype.getById),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.update),
    ).toBe(":widgetId");
    expect(
      Reflect.getMetadata(METHOD_METADATA, WidgetsController.prototype.update),
    ).toBe(RequestMethod.PATCH);

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.duplicate),
    ).toBe(":widgetId/duplicate");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        WidgetsController.prototype.duplicate,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.getDraft),
    ).toBe(":widgetId/draft");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        WidgetsController.prototype.getDraft,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.saveDraft),
    ).toBe(":widgetId/draft");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        WidgetsController.prototype.saveDraft,
      ),
    ).toBe(RequestMethod.PUT);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        WidgetsController.prototype.publishDraft,
      ),
    ).toBe(":widgetId/draft/publish");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        WidgetsController.prototype.publishDraft,
      ),
    ).toBe(RequestMethod.PUT);

    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.delete),
    ).toBe(":widgetId");
    expect(
      Reflect.getMetadata(METHOD_METADATA, WidgetsController.prototype.delete),
    ).toBe(RequestMethod.DELETE);
  });

  it("applies capability guard metadata to every authenticated widget route", () => {
    for (const handler of [
      WidgetsController.prototype.list,
      WidgetsController.prototype.create,
      WidgetsController.prototype.getById,
      WidgetsController.prototype.update,
      WidgetsController.prototype.getDraft,
      WidgetsController.prototype.saveDraft,
      WidgetsController.prototype.publishDraft,
      WidgetsController.prototype.delete,
    ]) {
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
        CapabilityGuard,
      ]);
      expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, handler)).toEqual([
        Capability.MANAGE_PUBLISH_SURFACES,
      ]);
    }
  });

  it("declares POST /projects/:slug/widgets/:widgetId/duplicate with manage-project capability", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.duplicate),
    ).toBe(":widgetId/duplicate");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        WidgetsController.prototype.duplicate,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        WidgetsController.prototype.duplicate,
      ),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        WidgetsController.prototype.duplicate,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });

  it("rejects duplicate requests from actors without MANAGE_PROJECT", async () => {
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: { id: "project_1", slug: "acme" },
        role: "EDITOR",
        capabilities: new Set([Capability.MANAGE_PUBLISH_SURFACES]),
      }),
    };
    const guard = new CapabilityGuard(
      new Reflector(),
      projectAccessService as never,
    );

    let error: unknown;
    try {
      await guard.canActivate(
        createExecutionContext(WidgetsController.prototype.duplicate, {
          params: { slug: "acme", widgetId: "widget_1" },
          user: { id: "user_1" },
        }),
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getStatus()).toBe(403);
  });

  it("allows MANAGE_PROJECT actors to duplicate and returns the created widget DTO", async () => {
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
      params: { slug: "acme", widgetId: "widget_1" },
      user: { id: "user_1" },
      projectAccess: undefined as { projectId: string } | undefined,
    };

    await expect(
      guard.canActivate(
        createExecutionContext(WidgetsController.prototype.duplicate, request),
      ),
    ).resolves.toBe(true);

    const dto = {
      id: "widget_copy",
      projectId: "project_1",
      entry: {
        id: "widget_copy",
        name: "Proof Widget (copy)",
        widgetType: "EMBED",
        layoutType: "CAROUSEL",
        themeMode: "LIGHT",
        preset: "clean",
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
        totalLoads: 0,
        avgLoadMs: 0,
        lastLoadAt: null,
        isActive: false,
      },
      config: {
        name: "Proof Widget (copy)",
        widgetType: "EMBED",
        layoutType: "CAROUSEL",
        themeMode: "LIGHT",
        tokens: {},
        visibility: {},
        behavior: {},
        wall: null,
      },
    };
    const widgetsService = {
      duplicate: vi.fn().mockResolvedValue(dto),
    };
    const controller = new WidgetsController(widgetsService as never);

    await expect(
      controller.duplicate(
        "user_1",
        { slug: "acme", widgetId: "widget_1" },
        request,
      ),
    ).resolves.toEqual(dto);
    expect(widgetsService.duplicate).toHaveBeenCalledWith(
      { slug: "acme", widgetId: "widget_1" },
      request,
    );
  });
});

describe("PublicWidgetEmbedsController", () => {
  it("declares GET /widget-embeds/:widgetId as a public throttled route", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, PublicWidgetEmbedsController),
    ).toBe("widget-embeds");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicWidgetEmbedsController.prototype.getById,
      ),
    ).toBe(":widgetId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicWidgetEmbedsController.prototype.getById,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicWidgetEmbedsController.prototype.getById,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_SKIP + "default",
        PublicWidgetEmbedsController.prototype.getById,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-list",
        PublicWidgetEmbedsController.prototype.getById,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-list",
        PublicWidgetEmbedsController.prototype.getById,
      ),
    ).toBe(60000);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicWidgetEmbedsController.prototype.getFragment,
      ),
    ).toBe("projects/:slug/:widgetId/fragment");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicWidgetEmbedsController.prototype.getFragment,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicWidgetEmbedsController.prototype.getFragment,
      ),
    ).toBe(true);
  });
});

describe("PublicWallsController", () => {
  it("declares GET /walls/:wallSlug as a public throttled route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicWallsController)).toBe(
      "walls",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicWallsController.prototype.getBySlug,
      ),
    ).toBe(":wallSlug");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicWallsController.prototype.getBySlug,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicWallsController.prototype.getBySlug,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_SKIP + "default",
        PublicWallsController.prototype.getBySlug,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT + "public-list",
        PublicWallsController.prototype.getBySlug,
      ),
    ).toBe(120);
    expect(
      Reflect.getMetadata(
        THROTTLER_TTL + "public-list",
        PublicWallsController.prototype.getBySlug,
      ),
    ).toBe(60000);
  });
});
