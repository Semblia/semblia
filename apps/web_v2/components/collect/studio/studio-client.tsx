"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  defaultFormDefinition,
  formDefinitionDocSchema,
  migrateFormDoc,
  type FormDefinitionDoc,
} from "@workspace/forms-core";
import {
  useForm,
  useFormDraft,
  usePublishFormDraft,
  useSaveFormDraft,
} from "@/hooks/api/use-forms-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StudioEditor } from "./studio-editor";
import { StudioPreview } from "./studio-preview";

function seedDoc(
  draft: Record<string, unknown> | null | undefined,
  config: unknown,
): FormDefinitionDoc {
  const fromDraft = formDefinitionDocSchema.safeParse(draft);
  if (fromDraft.success) return fromDraft.data;
  try {
    return migrateFormDoc(config ?? null);
  } catch {
    return defaultFormDefinition();
  }
}

export function StudioClient({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  const draftQuery = useFormDraft(slug, formId);
  const formQuery = useForm(slug, formId);
  const formName = formQuery.data?.entry.name ?? "Form";
  const saveMutation = useSaveFormDraft(slug, formId);
  const publishMutation = usePublishFormDraft(slug, formId);

  const [doc, setDoc] = React.useState<FormDefinitionDoc | null>(null);
  const [version, setVersion] = React.useState(0);
  const [publishedVersion, setPublishedVersion] = React.useState<number | null>(
    null,
  );
  const [savedJson, setSavedJson] = React.useState("");

  const ready =
    draftQuery.isSuccess && (formQuery.isSuccess || formQuery.isError);

  // Seed the editing document once, from the saved draft, else the live config.
  React.useEffect(() => {
    if (doc !== null || !ready) return;
    const initial = seedDoc(draftQuery.data?.draft, formQuery.data?.config);
    setDoc(initial);
    setVersion(draftQuery.data?.version ?? 0);
    setPublishedVersion(draftQuery.data?.publishedVersion ?? null);
    // A draft already at this version is "saved"; an unsaved seed is dirty.
    setSavedJson(
      draftQuery.data?.draft ? JSON.stringify(initial) : "__unsaved__",
    );
  }, [doc, ready, draftQuery.data, formQuery.data]);

  const docJson = doc ? JSON.stringify(doc) : "";
  const isDirty = doc !== null && docJson !== savedJson;
  const hasUnpublished =
    isDirty ||
    (publishedVersion !== null && version > publishedVersion) ||
    (publishedVersion === null && savedJson !== "__unsaved__");
  const busy = saveMutation.isPending || publishMutation.isPending;

  async function handleSave() {
    if (!doc) return version;
    const result = await saveMutation.mutateAsync({
      draft: doc as unknown as Record<string, unknown>,
      expectedVersion: version,
    });
    setVersion(result.version);
    setPublishedVersion(result.publishedVersion);
    setSavedJson(JSON.stringify(doc));
    return result.version;
  }

  async function onSaveClick() {
    try {
      await handleSave();
      toast.success("Draft saved");
    } catch {
      toast.error("Could not save the draft. Reload and try again.");
    }
  }

  async function onPublishClick() {
    if (!doc) return;
    try {
      const v = isDirty ? await handleSave() : version;
      const result = await publishMutation.mutateAsync({ expectedVersion: v });
      setVersion(result.version);
      setPublishedVersion(result.publishedVersion ?? result.version);
      setSavedJson(JSON.stringify(doc));
      toast.success("Form published");
    } catch {
      toast.error("Could not publish. Save your draft and try again.");
    }
  }

  if (draftQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-medium text-foreground">
            Couldn&apos;t open the studio
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn&apos;t load this form&apos;s draft. Check your connection
            and try again.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => draftQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <p className="text-sm text-muted-foreground">Loading studio…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Topbar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label="Back to forms"
        >
          <Link href={`/projects/${slug}/collect`}>
            <ArrowLeftIcon className="size-4" aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {formName}
          </p>
        </div>
        <StatusPill isDirty={isDirty} hasUnpublished={hasUnpublished} />
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveClick}
          disabled={busy || !isDirty}
        >
          {saveMutation.isPending ? "Saving…" : "Save draft"}
        </Button>
        <Button
          size="sm"
          onClick={onPublishClick}
          disabled={busy || !hasUnpublished}
        >
          {publishMutation.isPending ? "Publishing…" : "Publish"}
        </Button>
      </div>

      {/* Editor + preview */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 w-full flex-col border-b border-border lg:w-[440px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <StudioEditor doc={doc} onChange={setDoc} />
        </div>
        <StudioPreview doc={doc} className="min-h-[420px]" />
      </div>
    </div>
  );
}

function StatusPill({
  isDirty,
  hasUnpublished,
}: {
  isDirty: boolean;
  hasUnpublished: boolean;
}) {
  const label = isDirty
    ? "Unsaved changes"
    : hasUnpublished
      ? "Unpublished"
      : "Published";
  const tone = isDirty
    ? "text-warning"
    : hasUnpublished
      ? "text-muted-foreground"
      : "text-success";
  return (
    <span className={cn("hidden text-xs font-medium sm:inline", tone)}>
      {label}
    </span>
  );
}
