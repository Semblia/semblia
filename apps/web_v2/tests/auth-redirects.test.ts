import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { homePath, ssoCallbackPath, welcomePath } from "@/lib/routes";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("auth redirects", () => {
  it("pins the post-auth landing routes", () => {
    expect(welcomePath()).toBe("/welcome");
    expect(homePath()).toBe("/");
    expect(ssoCallbackPath()).toBe("/sso-callback");
  });

  it("sends completed sign-ups to the standalone welcome setup route", () => {
    const signUpForm = read("app/(auth)/sign-up/[[...sign-up]]/_form.tsx");
    const ssoCallback = read("app/(auth)/sso-callback/page.tsx");

    // Both the in-app navigation and the two Clerk hand-off URLs must agree,
    // and all three go through the route map so a restructure moves them once.
    expect(signUpForm).toContain("router.push(welcomePath())");
    expect(signUpForm).toContain("redirectUrl: welcomePath()");
    expect(signUpForm).toContain("${ssoCallbackPath()}");
    expect(ssoCallback).toContain("signUpFallbackRedirectUrl={welcomePath()}");
    expect(ssoCallback).toContain("signInFallbackRedirectUrl={homePath()}");
  });
});
