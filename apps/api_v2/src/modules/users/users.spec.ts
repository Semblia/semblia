import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { UsersController } from "./users.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("UsersController", () => {
  it("is defined", () => {
    expect(UsersController).toBeDefined();
  });

  it("declares GET /users/me", () => {
    expect(Reflect.getMetadata(PATH_METADATA, UsersController)).toBe("users");
    expect(Reflect.getMetadata(PATH_METADATA, UsersController.prototype.getMe)).toBe("me");
    expect(Reflect.getMetadata(METHOD_METADATA, UsersController.prototype.getMe)).toBe(
      RequestMethod.GET,
    );
  });
});
