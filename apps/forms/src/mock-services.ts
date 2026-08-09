import {
  compileSnapshot,
  createFormTemplate,
  toPublicSnapshot,
  type PublicSnapshot,
} from "@workspace/forms-core";
import type { FormsRuntimeServices } from "./types.js";

function buildMockSnapshot(input: {
  slug: string;
  status?: PublicSnapshot["status"];
  embedAllowed?: boolean;
}): PublicSnapshot {
  const doc = createFormTemplate("TESTIMONIAL");
  doc.content.title = "Share your experience";
  doc.content.description =
    "Tell the team what felt clear, useful, and worth improving.";
  doc.content.closedMessage = "This form is no longer accepting responses.";
  doc.settings.allowedOrigins = ["https://customer.example"];
  doc.settings.embedAllowed = input.embedAllowed ?? true;

  return toPublicSnapshot(
    compileSnapshot(doc, {
      snapshotId: `snapshot_mock_${input.slug}`,
      formId: "form_mock",
      projectId: "project_mock",
      slug: input.slug,
      version: 1,
      status: input.status ?? "published",
      publishedAt: new Date("2026-06-20T00:00:00.000Z").toISOString(),
    }),
  );
}

export function createMockRuntimeServices(): FormsRuntimeServices {
  return {
    async resolveCollectionHost(hostname) {
      return {
        requestedHostname: hostname,
        canonicalHostname: hostname,
        canonicalUrl: `https://${hostname}`,
        isCanonical: true,
        projectId: "project_mock",
        feature: "COLLECTION",
      };
    },
    async getSnapshotBySlug(context) {
      if (context.slug === "missing") {
        throw new Error("mock snapshot missing");
      }
      return buildMockSnapshot({
        slug: context.slug,
        status: context.slug === "closed-form" ? "archived" : "published",
        embedAllowed: context.slug !== "no-embed",
      });
    },
    async submitForm() {
      return {
        id: "response_mock",
        projectId: "project_mock",
        formId: "form_mock",
        versionId: "snapshot_mock_customer-feedback",
        version: 1,
        reviewStatus: "PENDING",
        publishStatus: "PRIVATE",
        createdAt: new Date("2026-06-20T00:05:00.000Z").toISOString(),
      };
    },
    async presignUpload() {
      return {
        assetId: `asset_mock_${Math.random().toString(36).slice(2, 10)}`,
        uploadUrl: "/__mock-upload",
        requiredHeaders: {},
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      };
    },
  };
}
