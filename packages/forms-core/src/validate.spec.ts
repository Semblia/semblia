import { describe, expect, it } from "vitest";
import { createFormTemplate } from "./intents.js";
import { validateAnswers } from "./validate.js";

describe("validateAnswers", () => {
  const form = createFormTemplate("TESTIMONIAL");

  it("flags required fields that are empty", () => {
    const result = validateAnswers(form, {});
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.fieldId)).toContain("rating");
    // The testimonial body is part of the record-or-write pair and is not
    // schema-required; name still is.
    expect(result.errors.map((e) => e.fieldId)).toContain("name");
  });

  it("accepts a complete valid submission", () => {
    const result = validateAnswers(form, {
      rating: 5,
      testimonial: "This product genuinely changed how our team works.",
      name: "Jane Doe",
      consent: true,
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validates rating range against the field scale", () => {
    const result = validateAnswers(form, {
      rating: 9,
      testimonial: "Long enough testimonial text here.",
      name: "Jane",
      consent: true,
    });
    expect(result.errors.some((e) => e.fieldId === "rating")).toBe(true);
  });

  it("validates email format on a feedback form", () => {
    const feedback = createFormTemplate("PRODUCT_FEEDBACK");
    const result = validateAnswers(feedback, {
      category: "bug",
      rating: 4,
      feedback: "Something broke when I clicked save.",
      email: "not-an-email",
    });
    expect(result.errors.some((e) => e.fieldId === "email")).toBe(true);
  });

  it("skips validation for fields hidden by conditional rules", () => {
    const feedback = createFormTemplate("PRODUCT_FEEDBACK");
    // improvement only shows when rating <= 3; a high rating keeps it hidden,
    // so leaving it empty must not error even though we never fill it.
    const result = validateAnswers(feedback, {
      category: "praise",
      rating: 5,
      feedback: "Everything works great, thank you!",
    });
    expect(result.errors.some((e) => e.fieldId === "improvement")).toBe(false);
  });

  it("enforces minimum length", () => {
    const result = validateAnswers(form, {
      rating: 5,
      testimonial: "too short",
      name: "Jane",
      consent: true,
    });
    expect(result.errors.some((e) => e.fieldId === "testimonial")).toBe(true);
  });
});
