import { DEFAULT_FORM_CONFIG, type FormConfig } from "@workspace/forms-core";
import type { FormsRuntimeServices } from "./types.js";

const mockConfig: FormConfig = {
  ...DEFAULT_FORM_CONFIG,
  brandName: "Acme Launchpad",
  headline: "How was your experience?",
  subhead:
    "Your note helps the team understand what felt clear, useful, and worth improving.",
  tokens: {
    ...DEFAULT_FORM_CONFIG.tokens,
    accent: "#0f766e",
    background: "#eef7f4",
    surface: "#ffffff",
    radius: 18,
  },
};

export function createMockRuntimeServices(): FormsRuntimeServices {
  return {
    async resolveForm(context) {
      return {
        project: {
          id: "project_mock",
          slug: context.projectPublicSlug,
          name: "Acme Launchpad",
          publicSlug: context.projectPublicSlug,
          brandColorPrimary: mockConfig.tokens.accent,
        },
        form: {
          id: "form_mock",
          slug: context.formSlug,
          name: "Customer feedback",
          description: mockConfig.subhead,
          config: mockConfig,
          publishedAt: new Date("2026-05-30T00:00:00.000Z").toISOString(),
        },
      };
    },
    async submitForm() {
      return { redirectTo: "/?submitted=1" };
    },
  };
}
