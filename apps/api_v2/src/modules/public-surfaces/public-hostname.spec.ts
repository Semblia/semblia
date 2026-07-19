import { describe, expect, it } from "vitest";
import {
  buildSembliaFreeHostnames,
  isValidDnsHostname,
  isValidSembliaFreeHostLabel,
  SEMBLIA_FREE_HOST_RESERVED_LABELS,
} from "./public-hostname.js";

describe("public hostname policy", () => {
  it("accepts DNS hostnames whose labels are lowercase ASCII and 1 through 63 characters", () => {
    expect(isValidDnsHostname("a.example.com")).toBe(true);
    expect(isValidDnsHostname(`${"a".repeat(63)}.example.com`)).toBe(true);
    expect(isValidDnsHostname(`${"a".repeat(64)}.example.com`)).toBe(false);
    expect(isValidDnsHostname("Upper.example.com")).toBe(false);
    expect(isValidDnsHostname("-start.example.com")).toBe(false);
    expect(isValidDnsHostname("end-.example.com")).toBe(false);
  });

  it("rejects DNS hostnames with ports, trailing dots, or a total length above 253", () => {
    expect(isValidDnsHostname("acme.forms.semblia.com:443")).toBe(false);
    expect(isValidDnsHostname("acme.forms.semblia.com.")).toBe(false);
    expect(isValidDnsHostname(`${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`)).toBe(false);
  });

  it("allows only non-reserved free-host labels", () => {
    expect(isValidSembliaFreeHostLabel("acme-2026")).toBe(true);
    expect(isValidSembliaFreeHostLabel("Acme")).toBe(false);
    expect(isValidSembliaFreeHostLabel("-acme")).toBe(false);
    expect(isValidSembliaFreeHostLabel("acme-")).toBe(false);
    expect(isValidSembliaFreeHostLabel("www")).toBe(false);
    expect([...SEMBLIA_FREE_HOST_RESERVED_LABELS]).toEqual([
      "www", "app", "api", "admin", "assets", "static", "cdn", "status",
      "support", "help", "mail", "autodiscover", "forms", "walls",
    ]);
  });

  it("builds normalized immutable forms and wall hostnames", () => {
    expect(buildSembliaFreeHostnames({
      label: "acme",
      formsBaseDomain: "FORMS.SEMBLIA.COM",
      wallsBaseDomain: "WALLS.SEMBLIA.COM",
    })).toEqual({
      collection: "acme.forms.semblia.com",
      wall: "acme.walls.semblia.com",
    });
  });
});
