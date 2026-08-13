import { describe, expect, it } from "vitest";
import { createFormRequestBodySchema } from "./form-requests.dto.js";

describe("createFormRequestBodySchema", () => {
  it("normalizes and deduplicates recipient addresses before compose", () => {
    expect(
      createFormRequestBodySchema.parse({
        formId: " form_1 ",
        emails: [" Ada@Example.com ", "ada@example.com", "BOB@example.com"],
        note: "  Please share what changed.  ",
      }),
    ).toEqual({
      formId: "form_1",
      emails: ["ada@example.com", "bob@example.com"],
      note: "Please share what changed.",
    });
  });

  it("rejects malformed addresses and more than 50 unique recipients", () => {
    expect(
      createFormRequestBodySchema.safeParse({
        formId: "form_1",
        emails: ["not-an-email"],
      }).success,
    ).toBe(false);

    expect(
      createFormRequestBodySchema.safeParse({
        formId: "form_1",
        emails: Array.from(
          { length: 51 },
          (_, index) => `person-${index}@example.com`,
        ),
      }).success,
    ).toBe(false);
  });

  it("accepts 50 unique recipients, nulls a blank note, and rejects extra keys", () => {
    const emails = Array.from(
      { length: 50 },
      (_, index) => `person-${index}@example.com`,
    );
    expect(
      createFormRequestBodySchema.parse({
        formId: "form_1",
        emails,
        note: "   ",
      }),
    ).toEqual({ formId: "form_1", emails, note: null });

    expect(
      createFormRequestBodySchema.safeParse({
        formId: "form_1",
        emails: ["ada@example.com"],
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
