import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { ImportsController } from "./imports.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

type ControllerMethod = keyof ImportsController;

function expectCapability(method: ControllerMethod, capability: Capability) {
  expect(
    Reflect.getMetadata(
      REQUIRED_CAPABILITIES_KEY,
      ImportsController.prototype[method],
    ),
  ).toEqual([capability]);
}

function expectRoute(input: {
  method: ControllerMethod;
  requestMethod: RequestMethod;
  path: string;
}) {
  expect(
    Reflect.getMetadata(
      METHOD_METADATA,
      ImportsController.prototype[input.method],
    ),
  ).toBe(input.requestMethod);
  expect(
    Reflect.getMetadata(
      PATH_METADATA,
      ImportsController.prototype[input.method],
    ),
  ).toBe(input.path);
}

describe("ImportsController", () => {
  it("declares its project-scoped controller guard", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ImportsController)).toBe(
      "projects/:slug/imports",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ImportsController)).toEqual([
      CapabilityGuard,
    ]);
  });

  it("requires view access for read routes", () => {
    for (const method of [
      "catalog",
      "listConnections",
      "list",
      "get",
    ] as const) {
      expectCapability(method, Capability.VIEW_PROJECT);
    }
  });

  it("requires operating access for mutating routes", () => {
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
      expectCapability(method, Capability.OPERATE_PROJECT);
  });

  it("declares the direct import job routes", () => {
    for (const route of [
      {
        method: "createManual",
        requestMethod: RequestMethod.POST,
        path: "jobs/manual",
      },
      {
        method: "createPublicUrl",
        requestMethod: RequestMethod.POST,
        path: "jobs/public-url",
      },
      {
        method: "createMigration",
        requestMethod: RequestMethod.POST,
        path: "jobs/migration",
      },
    ] as const)
      expectRoute(route);
  });

  it("declares connection management routes", () => {
    for (const route of [
      {
        method: "listConnections",
        requestMethod: RequestMethod.GET,
        path: "connections",
      },
      {
        method: "listProviderResources",
        requestMethod: RequestMethod.GET,
        path: "providers/:provider/resources",
      },
      {
        method: "createConnection",
        requestMethod: RequestMethod.POST,
        path: "connections",
      },
      {
        method: "updateConnection",
        requestMethod: RequestMethod.PATCH,
        path: "connections/:connectionId",
      },
      {
        method: "syncConnection",
        requestMethod: RequestMethod.POST,
        path: "connections/:connectionId/sync",
      },
      {
        method: "enableConnection",
        requestMethod: RequestMethod.POST,
        path: "connections/:connectionId/enable",
      },
      {
        method: "disableConnection",
        requestMethod: RequestMethod.POST,
        path: "connections/:connectionId/disable",
      },
      {
        method: "deleteConnection",
        requestMethod: RequestMethod.DELETE,
        path: "connections/:connectionId",
      },
    ] as const)
      expectRoute(route);
  });

  it("declares spreadsheet operating routes", () => {
    for (const method of ["previewSpreadsheet", "createSpreadsheet"] as const) {
      expectCapability(method, Capability.OPERATE_PROJECT);
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          ImportsController.prototype[method],
        ),
      ).toBe(RequestMethod.POST);
    }
    expectRoute({
      method: "previewSpreadsheet",
      requestMethod: RequestMethod.POST,
      path: "spreadsheet/preview",
    });
    expectRoute({
      method: "createSpreadsheet",
      requestMethod: RequestMethod.POST,
      path: "jobs/spreadsheet",
    });
  });

  it("passes the explicitly selected preview sheet to the service", async () => {
    const previewSpreadsheet = vi.fn().mockResolvedValue({ sheets: [] });
    const controller = new ImportsController({ previewSpreadsheet } as never);
    await controller.previewSpreadsheet(
      { assetId: "asset_1", sheetName: "Second" } as never,
      { projectAccess: { projectId: "project_1" } },
    );
    expect(previewSpreadsheet).toHaveBeenCalledWith({
      projectId: "project_1",
      assetId: "asset_1",
      sheetName: "Second",
    });
  });
});
