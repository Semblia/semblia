import { describe, expect, it } from "vitest";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import {
  matchSourceByUrl,
  urlHost,
} from "@/components/imports/use-method-sources";

function source(
  overrides: Partial<V2ImportCatalogSourceDTO>,
): V2ImportCatalogSourceDTO {
  return {
    key: "reddit",
    label: "Reddit",
    group: "Public social/community",
    modes: ["PUBLIC_URL"],
    availability: "AVAILABLE",
    reasonCode: null,
    reason: null,
    publicHosts: [],
    publicHostSuffixes: [],
    oauthStrategy: null,
    requiredScopes: [],
    ...overrides,
  };
}

describe("import source detection", () => {
  const reddit = source({ publicHostSuffixes: ["reddit.com"] });

  it("matches the suffix host itself and dot-delimited subdomains", () => {
    expect(matchSourceByUrl([reddit], "https://reddit.com/r/x")?.key).toBe(
      "reddit",
    );
    expect(matchSourceByUrl([reddit], "https://old.reddit.com/r/x")?.key).toBe(
      "reddit",
    );
  });

  it("never attributes a look-alike host to the suffix source", () => {
    expect(matchSourceByUrl([reddit], "https://evilreddit.com/r/x")).toBeNull();
    expect(
      matchSourceByUrl([reddit], "https://reddit.com.attacker.example/x"),
    ).toBeNull();
  });

  it("prefers an exact public host over a suffix match", () => {
    const exact = source({
      key: "reddit-exact",
      publicHosts: ["www.reddit.com"],
    });
    expect(
      matchSourceByUrl([reddit, exact], "https://www.reddit.com/r/x")?.key,
    ).toBe("reddit-exact");
  });

  it("returns null while the URL is not parseable", () => {
    expect(urlHost("")).toBeNull();
    expect(urlHost("www.reddit.com/r/x")).toBeNull();
    expect(matchSourceByUrl([reddit], "reddit")).toBeNull();
  });
});
