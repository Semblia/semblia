import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { UsersController } from "./users.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("UsersController", () => {
  it("is defined", () => {
    expect(UsersController).toBeDefined();
  });

  it("declares GET /me", () => {
    expect(Reflect.getMetadata(PATH_METADATA, UsersController)).toBe("me");
    expect(Reflect.getMetadata(PATH_METADATA, UsersController.prototype.getMe)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, UsersController.prototype.getMe)).toBe(
      RequestMethod.GET,
    );
  });

  it("declares PATCH /me", () => {
    expect(Reflect.getMetadata(PATH_METADATA, UsersController.prototype.updateProfile)).toBe(
      "/",
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, UsersController.prototype.updateProfile),
    ).toBe(RequestMethod.PATCH);
  });

  it("declares POST /me/onboarding/complete", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        UsersController.prototype.completeOnboarding,
      ),
    ).toBe("onboarding/complete");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        UsersController.prototype.completeOnboarding,
      ),
    ).toBe(RequestMethod.POST);
  });
});
