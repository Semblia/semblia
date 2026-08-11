import { describe, expect, it } from "vitest";
import { invitationPath, safeReturnPath } from "@/lib/routes";

describe("invitationPath", () => {
  it("addresses the invite by id, encoded", () => {
    expect(invitationPath("inv_1")).toBe("/invitations/inv_1");
    expect(invitationPath("inv 1/2")).toBe("/invitations/inv%201%2F2");
  });
});

describe("safeReturnPath", () => {
  it("accepts a same-app relative path", () => {
    expect(safeReturnPath("/invitations/inv_1")).toBe("/invitations/inv_1");
    expect(safeReturnPath("/")).toBe("/");
  });

  // `redirect_url` is attacker-controllable input carried in a URL — an
  // absolute or protocol-relative value must never become an open redirect
  // out of a signed-in session.
  it("rejects an absolute or protocol-relative url", () => {
    expect(safeReturnPath("https://evil.example")).toBeNull();
    expect(safeReturnPath("//evil.example")).toBeNull();
    expect(safeReturnPath("evil.example")).toBeNull();
    // WHATWG parsing reads `\` as `/` — this is `//evil.example` in disguise.
    expect(safeReturnPath("/\\evil.example")).toBeNull();
  });

  it("treats missing or empty input as no return path", () => {
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath("")).toBeNull();
  });
});
