import { describe, expect, it } from "vitest";
import {
  assertDeliveryPublishable,
  checkEmbedFit,
  EMBED_MAX_FIELDS,
  FormDeliveryError,
} from "./delivery.js";
import { createFormTemplate, FORM_INTENTS } from "./intents.js";
import { formDefinitionDocSchema } from "./schema/definition.js";
import { formFieldSchema, type FormField } from "./schema/fields.js";

const field = (f: Partial<FormField> & Pick<FormField, "id" | "type">) =>
  formFieldSchema.parse(f);

describe("embed delivery constraints", () => {
  it("old docs parse with delivery defaulting to hosted", () => {
    const doc = formDefinitionDocSchema.parse({});
    expect(doc.delivery).toBe("hosted");
  });

  it("flags upload fields as embed-incompatible", () => {
    const doc = formDefinitionDocSchema.parse({
      delivery: "embed",
      fields: [
        field({ id: "q1", type: "rating" }),
        field({ id: "q2", type: "videoUpload", label: "Record a video" }),
      ],
    });
    const fit = checkEmbedFit(doc);
    expect(fit.ok).toBe(false);
    expect(fit.incompatibleFields.map((f) => f.id)).toEqual(["q2"]);
    expect(() => assertDeliveryPublishable(doc)).toThrow(FormDeliveryError);
    expect(() => assertDeliveryPublishable(doc)).toThrow(/Record a video/);
  });

  it("caps countable asks but never counts consent/hidden", () => {
    const asks = Array.from({ length: EMBED_MAX_FIELDS + 1 }, (_, i) =>
      field({ id: `q${i}`, type: "shortText" }),
    );
    const doc = formDefinitionDocSchema.parse({
      delivery: "embed",
      fields: [
        ...asks,
        field({ id: "consent", type: "consent" }),
        field({ id: "utm", type: "hidden" }),
      ],
    });
    expect(checkEmbedFit(doc).overCap).toBe(1);

    const withinCap = formDefinitionDocSchema.parse({
      delivery: "embed",
      fields: [
        ...asks.slice(0, EMBED_MAX_FIELDS),
        field({ id: "consent", type: "consent" }),
        field({ id: "utm", type: "hidden" }),
      ],
    });
    expect(checkEmbedFit(withinCap).ok).toBe(true);
    expect(() => assertDeliveryPublishable(withinCap)).not.toThrow();
  });

  it("hosted docs are never gated", () => {
    const doc = formDefinitionDocSchema.parse({
      fields: [field({ id: "v", type: "videoUpload" })],
    });
    expect(() => assertDeliveryPublishable(doc)).not.toThrow();
  });

  it("every intent seeds a publishable embed doc", () => {
    for (const intent of FORM_INTENTS) {
      const doc = createFormTemplate(intent, "embed");
      expect(doc.delivery).toBe("embed");
      expect(() => assertDeliveryPublishable(doc)).not.toThrow();
    }
  });
});
