import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { AlertsController } from "./alerts.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("AlertsController", () => {
  it("is defined", () => {
    expect(AlertsController).toBeDefined();
  });

  it("declares GET /alerts/_status", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AlertsController)).toBe("alerts");
    expect(Reflect.getMetadata(PATH_METADATA, AlertsController.prototype.getStatus)).toBe(
      "_status",
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, AlertsController.prototype.getStatus),
    ).toBe(RequestMethod.GET);
  });
});
