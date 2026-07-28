import { describe, expect, it } from "vitest";
import type { V2ProjectDTO } from "@workspace/types";
import {
  canManageMembers,
  canManageProject,
  validateAllowedOrigin,
  validateInviteEmail,
  validateProjectName,
  validateProjectSlug,
  validateWebsiteUrl,
} from "@/components/settings/shared/normalize";
import { collectSocialLinkErrors } from "@/components/settings/shared/social-links-editor";

/**
 * These pin the rule "never offer an action the API will refuse". Each guard
 * below mirrors a schema in `apps/api_v2/src/modules/projects/projects.dto.ts`;
 * if one drifts, a settings page starts offering a Save that returns 400/403
 * and the user learns about it from a red toast instead of the field.
 */

function projectWith(
  capabilities: V2ProjectDTO["access"]["capabilities"],
): V2ProjectDTO {
  return {
    access: { role: "EDITOR", capabilities, isPrimaryOwner: false },
  } as V2ProjectDTO;
}

describe("project name", () => {
  it("rejects blank and over-length names", () => {
    expect(validateProjectName("")).toBeTruthy();
    expect(validateProjectName("   ")).toBeTruthy();
    expect(validateProjectName("x".repeat(61))).toBeTruthy();
  });

  it("accepts a normal name", () => {
    expect(validateProjectName("Launchpad")).toBeNull();
  });
});

describe("project slug", () => {
  it("accepts a valid DNS label", () => {
    expect(validateProjectSlug("acme-2026")).toBeNull();
  });

  it("rejects shapes the hosted address can't take", () => {
    expect(validateProjectSlug("")).toBeTruthy();
    expect(validateProjectSlug("Acme")).toBeTruthy();
    expect(validateProjectSlug("-acme")).toBeTruthy();
    expect(validateProjectSlug("acme-")).toBeTruthy();
    expect(validateProjectSlug("acme.co")).toBeTruthy();
    expect(validateProjectSlug("a".repeat(64))).toBeTruthy();
  });

  it("rejects slugs reserved by the dashboard's own routes", () => {
    // Shadowing a root segment would make the project unreachable.
    expect(validateProjectSlug("account")).toBeTruthy();
    expect(validateProjectSlug("settings")).toBeTruthy();
    expect(validateProjectSlug("sign-in")).toBeTruthy();
  });

  it("rejects slugs reserved by the hosted-address namespace", () => {
    expect(validateProjectSlug("www")).toBeTruthy();
    expect(validateProjectSlug("forms")).toBeTruthy();
    expect(validateProjectSlug("walls")).toBeTruthy();
  });
});

describe("website url", () => {
  it("treats blank as 'unset', not as invalid", () => {
    expect(validateWebsiteUrl("")).toBeNull();
    expect(validateWebsiteUrl("   ")).toBeNull();
  });

  it("accepts http and https only", () => {
    expect(validateWebsiteUrl("https://example.com")).toBeNull();
    expect(validateWebsiteUrl("http://localhost:3000")).toBeNull();
    expect(validateWebsiteUrl("javascript:alert(1)")).toBeTruthy();
    expect(validateWebsiteUrl("data:text/html,<b>x</b>")).toBeTruthy();
    expect(validateWebsiteUrl("example.com")).toBeTruthy();
  });
});

describe("invite email", () => {
  it("rejects anything the invite schema would reject", () => {
    expect(validateInviteEmail("")).toBeTruthy();
    expect(validateInviteEmail("teammate")).toBeTruthy();
    expect(validateInviteEmail("teammate@company")).toBeTruthy();
    expect(validateInviteEmail("teammate @company.com")).toBeTruthy();
    expect(validateInviteEmail(`${"a".repeat(320)}@company.com`)).toBeTruthy();
  });

  it("accepts a complete address", () => {
    expect(validateInviteEmail("teammate@company.com")).toBeNull();
    expect(validateInviteEmail(" teammate@company.co.uk ")).toBeNull();
  });
});

describe("allowed origins", () => {
  it("keeps the security rules the public submit endpoint depends on", () => {
    expect(validateAllowedOrigin("https://example.com")).toBeNull();
    expect(validateAllowedOrigin("http://localhost:3000")).toBeNull();

    expect(validateAllowedOrigin("http://example.com")).toBeTruthy();
    expect(validateAllowedOrigin("https://*.example.com")).toBeTruthy();
    expect(validateAllowedOrigin("https://user:pw@example.com")).toBeTruthy();
    expect(validateAllowedOrigin("https://example.com/path")).toBeTruthy();
    expect(validateAllowedOrigin("https://example.com/")).toBeTruthy();
    expect(validateAllowedOrigin("https://example.com?a=1")).toBeTruthy();
    expect(validateAllowedOrigin("https://example.com#a")).toBeTruthy();
  });
});

describe("social links", () => {
  it("reports nothing for an empty or well-formed set", () => {
    expect(collectSocialLinkErrors({})).toEqual([]);
    expect(
      collectSocialLinkErrors({
        twitter: "https://x.com/semblia",
        github: "https://github.com/semblia",
      }),
    ).toEqual([]);
  });

  it("flags a profile URL that isn't on its platform", () => {
    const errors = collectSocialLinkErrors({
      linkedin: "https://example.com/in/someone",
    });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("LinkedIn");
  });

  it("flags a custom link whose profile is off its platform domain", () => {
    const errors = collectSocialLinkErrors({
      custom: [
        {
          platformName: "Dribbble",
          platformUrl: "https://dribbble.com",
          profileUrl: "https://example.com/semblia",
        },
      ],
    });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Dribbble");
  });

  it("flags a half-filled custom link, which the API would silently drop", () => {
    const errors = collectSocialLinkErrors({
      custom: [{ platformName: "Dribbble", platformUrl: "", profileUrl: "" }],
    });
    expect(errors.length).toBe(1);
  });
});

describe("capabilities", () => {
  it("derives write permission from the project's own capability list", () => {
    expect(canManageProject(projectWith(["VIEW_PROJECT"]))).toBe(false);
    expect(
      canManageProject(projectWith(["VIEW_PROJECT", "MANAGE_PROJECT"])),
    ).toBe(true);

    expect(canManageMembers(projectWith(["MANAGE_PROJECT"]))).toBe(false);
    expect(canManageMembers(projectWith(["MANAGE_MEMBERS"]))).toBe(true);
  });
});
