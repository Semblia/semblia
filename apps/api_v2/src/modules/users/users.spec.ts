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
    expect(
      Reflect.getMetadata(PATH_METADATA, UsersController.prototype.getMe),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, UsersController.prototype.getMe),
    ).toBe(RequestMethod.GET);
  });

  it("declares PATCH /me", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        UsersController.prototype.updateProfile,
      ),
    ).toBe("/");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        UsersController.prototype.updateProfile,
      ),
    ).toBe(RequestMethod.PATCH);
  });

  it("declares GET /me/last-used-project", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        UsersController.prototype.getLastUsedProject,
      ),
    ).toBe("last-used-project");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        UsersController.prototype.getLastUsedProject,
      ),
    ).toBe(RequestMethod.GET);
  });

  it("declares PUT /me/last-used-project", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        UsersController.prototype.setLastUsedProject,
      ),
    ).toBe("last-used-project");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        UsersController.prototype.setLastUsedProject,
      ),
    ).toBe(RequestMethod.PUT);
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

  it("declares PATCH /me/onboarding", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        UsersController.prototype.updateOnboardingProgress,
      ),
    ).toBe("onboarding");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        UsersController.prototype.updateOnboardingProgress,
      ),
    ).toBe(RequestMethod.PATCH);
  });
});
