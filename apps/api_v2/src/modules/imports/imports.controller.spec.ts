import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { ImportsController } from "./imports.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("ImportsController", () => {
  it("declares project-scoped view and operating routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ImportsController)).toBe(
      "projects/:slug/imports",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ImportsController)).toEqual([
      CapabilityGuard,
    ]);

    for (const method of [
      "catalog",
      "listConnections",
      "list",
      "get",
    ] as const) {
      expect(
        Reflect.getMetadata(
          REQUIRED_CAPABILITIES_KEY,
          ImportsController.prototype[method],
        ),
      ).toEqual([Capability.VIEW_PROJECT]);
    }
    for (const method of [
      "createManual",
      "createPublicUrl",
      "createMigration",
      "listProviderResources",
      "createConnection",
      "updateConnection",
      "syncConnection",
      "enableConnection",
      "disableConnection",
      "deleteConnection",
    ] as const)
      expect(
        Reflect.getMetadata(
          REQUIRED_CAPABILITIES_KEY,
          ImportsController.prototype[method],
        ),
      ).toEqual([Capability.OPERATE_PROJECT]);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ImportsController.prototype.createManual,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ImportsController.prototype.createManual,
      ),
    ).toBe("jobs/manual");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ImportsController.prototype.createPublicUrl,
      ),
    ).toBe("jobs/public-url");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ImportsController.prototype.createMigration,
      ),
    ).toBe("jobs/migration");
    for (const [method, httpMethod, path] of [
      ["listConnections", RequestMethod.GET, "connections"],
      [
        "listProviderResources",
        RequestMethod.GET,
        "providers/:provider/resources",
      ],
      ["createConnection", RequestMethod.POST, "connections"],
      ["updateConnection", RequestMethod.PATCH, "connections/:connectionId"],
      ["syncConnection", RequestMethod.POST, "connections/:connectionId/sync"],
      [
        "enableConnection",
        RequestMethod.POST,
        "connections/:connectionId/enable",
      ],
      [
        "disableConnection",
        RequestMethod.POST,
        "connections/:connectionId/disable",
      ],
      ["deleteConnection", RequestMethod.DELETE, "connections/:connectionId"],
    ] as const) {
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          ImportsController.prototype[method],
        ),
      ).toBe(httpMethod);
      expect(
        Reflect.getMetadata(PATH_METADATA, ImportsController.prototype[method]),
      ).toBe(path);
    }
    for (const method of ["previewSpreadsheet", "createSpreadsheet"] as const) {
      expect(
        Reflect.getMetadata(
          REQUIRED_CAPABILITIES_KEY,
          ImportsController.prototype[method],
        ),
      ).toEqual([Capability.OPERATE_PROJECT]);
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          ImportsController.prototype[method],
        ),
      ).toBe(RequestMethod.POST);
    }
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ImportsController.prototype.previewSpreadsheet,
      ),
    ).toBe("spreadsheet/preview");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ImportsController.prototype.createSpreadsheet,
      ),
    ).toBe("jobs/spreadsheet");
  });

  it("passes the explicitly selected preview sheet to the service", async () => {
    const previewSpreadsheet = vi.fn().mockResolvedValue({ sheets: [] });
    const controller = new ImportsController({ previewSpreadsheet } as never);
    await controller.previewSpreadsheet(
      { assetId: "asset_1", sheetName: "Second" } as never,
      { projectAccess: { projectId: "project_1" } },
    );
    expect(previewSpreadsheet).toHaveBeenCalledWith(
      "project_1",
      "asset_1",
      "Second",
    );
  });
});
