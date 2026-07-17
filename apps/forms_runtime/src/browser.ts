import { mountForm } from "@workspace/forms-renderer/client";
import type { PublicSnapshot } from "@workspace/forms-core";

function readSnapshot(): PublicSnapshot {
  const el = document.getElementById("semblia-form-snapshot");
  if (!el?.textContent) {
    throw new Error("Missing Semblia form snapshot");
  }
  return JSON.parse(el.textContent) as PublicSnapshot;
}

function sourceMetadata() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: "forms_runtime",
    referrer: document.referrer || undefined,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    externalId: params.get("external_id") ?? undefined,
  };
}

function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `form_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

interface PresignedUpload {
  assetId: string;
  uploadUrl: string;
  requiredHeaders?: Record<string, string>;
}

/** Presign + PUT one file; returns the media asset id the answer becomes. */
async function uploadFile(presignUrl: string, file: File): Promise<string> {
  const intentResponse = await fetch(presignUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      purpose: "SUBMISSION_ATTACHMENT",
      contentType: file.type || "application/octet-stream",
      byteSize: file.size,
    }),
  });
  if (!intentResponse.ok) {
    throw new Error("Your attachment could not be uploaded. Please try again.");
  }
  const intent = (await intentResponse.json()) as PresignedUpload;
  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: intent.requiredHeaders ?? {},
    body: file,
  });
  if (!put.ok) {
    throw new Error("Your attachment could not be uploaded. Please try again.");
  }
  return intent.assetId;
}

/**
 * Upload every captured/picked file and rewrite its answer from the display
 * name to the resulting asset id(s) — the canonical value the API activates
 * (`collectUploadAssetIds`) and the moderation/derivative pipeline consumes.
 */
async function resolveFileAnswers(
  presignUrl: string | undefined,
  answers: Record<string, unknown>,
  files: Record<string, File[]>,
): Promise<Record<string, unknown>> {
  const entries = Object.entries(files);
  if (entries.length === 0) return answers;
  if (!presignUrl) {
    throw new Error("Uploads are not available for this form.");
  }
  const resolved = { ...answers };
  for (const [fieldId, fieldFiles] of entries) {
    const assetIds = await Promise.all(
      fieldFiles.map((file) => uploadFile(presignUrl, file)),
    );
    resolved[fieldId] = assetIds.length === 1 ? assetIds[0] : assetIds;
  }
  return resolved;
}

const root = document.getElementById("semblia-form-root");
if (root instanceof HTMLElement) {
  const snapshot = readSnapshot();
  const submitUrl = root.dataset.submitUrl;
  const presignUrl = root.dataset.presignUrl;
  if (!submitUrl) throw new Error("Missing Semblia form submit URL");

  mountForm(root, snapshot, {
    hydrate: true,
    onSubmit: async (payload) => {
      const answers = await resolveFileAnswers(
        presignUrl,
        payload.answers,
        payload.files,
      );
      const response = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey(),
        },
        body: JSON.stringify({
          answers,
          consent: payload.consent,
          elapsedMs: payload.elapsedMs,
          honeypot: payload.honeypot,
          sourceMetadata: sourceMetadata(),
        }),
      });

      if (!response.ok) {
        throw new Error("Submission could not be saved. Please try again.");
      }
    },
  });
}
