"use client";

import { StudioShell } from "@/components/collect/studio/studio-shell";

export function StudioEditorClient({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  return <StudioShell slug={slug} formId={formId} />;
}
