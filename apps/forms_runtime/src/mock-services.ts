import {
  defaultFormDefinition,
  publishFormDefinition,
} from "@workspace/forms-core/schema";
import type { FormsRuntimeServices } from "./types.js";

// Local dev serves a published v4 document; the renderer is currently the
// loud forms-v4 stub, so the mock only needs a valid publishable doc.
const mockDefinition = defaultFormDefinition({
  brandName: "Acme Launchpad",
  brandColor: "#0f766e",
});
mockDefinition.content.headline = "How was your experience?";
mockDefinition.content.subhead =
  "Your note helps the team understand what felt clear, useful, and worth improving.";

const mockConfig = publishFormDefinition(mockDefinition);

export function createMockRuntimeServices(): FormsRuntimeServices {
  return {
    async resolveForm(context) {
      return {
        project: {
          id: "project_mock",
          slug: context.projectPublicSlug,
          name: "Acme Launchpad",
          publicSlug: context.projectPublicSlug,
          brandColorPrimary: mockConfig.theme.inputs.brandColor,
        },
        form: {
          id: "form_mock",
          slug: context.formSlug,
          name: "Customer feedback",
          description: mockConfig.content.subhead,
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
