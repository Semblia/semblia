"use client";

import { FormStudio } from "@/components/forms/studio/form-studio";

export function FormStudioClient({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  return <FormStudio slug={slug} formId={formId} />;
}
