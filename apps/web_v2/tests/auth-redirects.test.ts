import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  continuePath,
  homePath,
  ssoCallbackPath,
  welcomePath,
} from "@/lib/routes";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("auth redirects", () => {
  it("pins the post-auth landing routes", () => {
    expect(welcomePath()).toBe("/welcome");
    expect(homePath()).toBe("/");
    expect(continuePath()).toBe("/continue");
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
  });

  it("sends every completed sign-in through the last-used-project resolver", () => {
    // Three separate ways into the app. They previously agreed on `/` and so
    // all three ignored the recorded last-used project; if one of them drifts
    // back, an owner lands on the project list from that path only — the kind
    // of split behaviour nobody reproduces on the first try.
    expect(read("app/(auth)/sign-in/[[...sign-in]]/_form.tsx")).toContain(
      "decorateUrl(continuePath())",
    );
    expect(read("app/(auth)/sso-callback/page.tsx")).toContain(
      "signInFallbackRedirectUrl={continuePath()}",
    );
    expect(read("proxy.ts")).toContain('new URL("/continue", request.url)');
  });

  it("keeps the resolver reachable as a route, never as a project slug", () => {
    expect(fs.existsSync(path.join(root, "app/continue/page.tsx"))).toBe(true);
    // Project slugs live at the URL root, so an unreserved `continue` slug
    // would be permanently shadowed by this route.
    expect(continuePath()).toBe("/continue");
  });
});
