import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { ProjectsController } from "./projects.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("ProjectsController", () => {
  it("is defined", () => {
    expect(ProjectsController).toBeDefined();
  });

  it("declares GET /projects", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProjectsController)).toBe("projects");
    expect(Reflect.getMetadata(PATH_METADATA, ProjectsController.prototype.list)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, ProjectsController.prototype.list)).toBe(
      RequestMethod.GET,
    );
  });
});
