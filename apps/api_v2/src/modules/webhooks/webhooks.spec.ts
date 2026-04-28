import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("WebhooksController", () => {
  it("is defined", () => {
    expect(WebhooksController).toBeDefined();
  });

  it("declares POST /webhooks/clerk", () => {
    expect(Reflect.getMetadata(PATH_METADATA, WebhooksController)).toBe("webhooks");
    expect(
      Reflect.getMetadata(PATH_METADATA, WebhooksController.prototype.handleClerkWebhook),
    ).toBe("clerk");
    expect(
      Reflect.getMetadata(METHOD_METADATA, WebhooksController.prototype.handleClerkWebhook),
    ).toBe(RequestMethod.POST);
  });
});
