"use client";

/**
 * FormPreviewDialog — a full-page preview of the real form, shown exactly as a
 * respondent sees it on the hosted page. Reuses the studio's FormStudioPreview
 * (device + light/dark toggles, browser/phone chrome) so there's a single
 * source of truth for "what the form looks like live".
 */

import * as React from "react";
import type { V2FormIntent } from "@workspace/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseDraftDoc } from "@/lib/forms/draft";
import { FormStudioPreview } from "./studio/form-studio-preview";

export interface FormPreviewDialogForm {
  id: string;
  projectId: string;
  slug: string | null;
  intent: V2FormIntent;
  name: string;
  draft: Record<string, unknown>;
}

export function FormPreviewDialog({
  open,
  onOpenChange,
  form,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormPreviewDialogForm;
}) {
  const doc = React.useMemo(
    () => parseDraftDoc(form.draft, form.intent),
    [form.draft, form.intent],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="flex-row items-center gap-2 border-b border-border px-4 py-3 pr-12">
          <div className="min-w-0">
            <DialogTitle className="truncate">{form.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Exactly what respondents see on the hosted page.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          {open ? (
            <FormStudioPreview
              doc={doc}
              meta={{
                formId: form.id,
                projectId: form.projectId,
                slug: form.slug,
              }}
              showSaveHint={false}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
