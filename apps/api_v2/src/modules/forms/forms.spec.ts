import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { FormsController } from "./forms.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("FormsController", () => {
  it("is defined", () => {
    expect(FormsController).toBeDefined();
  });

  it("declares GET /forms/project/:projectId", () => {
    expect(Reflect.getMetadata(PATH_METADATA, FormsController)).toBe("forms");
    expect(Reflect.getMetadata(PATH_METADATA, FormsController.prototype.list)).toBe(
      "project/:projectId",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, FormsController.prototype.list)).toBe(
      RequestMethod.GET,
    );
  });
});
