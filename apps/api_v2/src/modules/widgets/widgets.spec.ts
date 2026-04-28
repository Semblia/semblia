import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { WidgetsController } from "./widgets.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("WidgetsController", () => {
  it("is defined", () => {
    expect(WidgetsController).toBeDefined();
  });

  it("declares GET /widgets/project/:projectId", () => {
    expect(Reflect.getMetadata(PATH_METADATA, WidgetsController)).toBe("widgets");
    expect(Reflect.getMetadata(PATH_METADATA, WidgetsController.prototype.list)).toBe(
      "project/:projectId",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, WidgetsController.prototype.list)).toBe(
      RequestMethod.GET,
    );
  });
});
