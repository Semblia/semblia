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
import {
  PublicWallsController,
  PublicWidgetEmbedsController,
  WidgetsController,
} from "./widgets.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

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
