import { describe, it, expect } from "vitest";
import {
  formDefinitionDocSchema,
  publishFormDefinition,
} from "@workspace/forms-core/schema";
import { FORM_STARTERS } from "@/lib/collect/form-starters";

describe("form starters", () => {
  it("every starter builds a doc the publish pipeline accepts (no 422 at create)", () => {
    for (const starter of FORM_STARTERS) {
      const doc = starter.build();
      // The studio/runtime schema and the API's write-time validation.
      expect(() => formDefinitionDocSchema.parse(doc)).not.toThrow();
      expect(() => publishFormDefinition(doc)).not.toThrow();
      // Thumbnail keying stays truthful to the produced layout.
      expect(doc.layout.preset).toBe(starter.layout);
      expect(doc.structure.questions.length).toBeGreaterThan(0);
    }
  });

  it("has unique starter ids", () => {
    const ids = FORM_STARTERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("seeds the provided brand color and stays valid", () => {
    const doc = FORM_STARTERS[0]!.build({ brandColor: "#123456" });
    expect(doc.theme.inputs.brandColor).toBe("#123456");
    expect(() => publishFormDefinition(doc)).not.toThrow();
  });

  it("covers a range of layout presets", () => {
    const presets = new Set(FORM_STARTERS.map((s) => s.layout));
    // At least card + one guided/inline/split variant — not all one preset.
    expect(presets.size).toBeGreaterThanOrEqual(3);
  });
});
