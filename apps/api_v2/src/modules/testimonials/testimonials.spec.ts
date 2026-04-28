import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { TestimonialsController } from "./testimonials.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("TestimonialsController", () => {
  it("is defined", () => {
    expect(TestimonialsController).toBeDefined();
  });

  it("declares GET /testimonials", () => {
    expect(Reflect.getMetadata(PATH_METADATA, TestimonialsController)).toBe(
      "testimonials",
    );
    expect(Reflect.getMetadata(PATH_METADATA, TestimonialsController.prototype.list)).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, TestimonialsController.prototype.list),
    ).toBe(RequestMethod.GET);
  });
});
