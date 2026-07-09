"use client";

/**
 * FormStudio — the full-screen form editor. Loads the form + its saved draft,
 * holds the working draft in local state, debounce-autosaves with optimistic
 * `expectedVersion` concurrency, and publishes immutable snapshots. The left
 * inspector edits the draft; the right pane is a true-WYSIWYG live preview.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FormDefinitionDoc } from "@workspace/forms-core";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  useForm,
  useFormDraft,
  useSaveFormDraft,
  usePublishForm,
  useUpdateForm,
} from "@/hooks/api";
import { parseDraftDoc, type PreviewMeta } from "@/lib/forms/draft";
import { formStatusMeta } from "@/lib/forms/intents";
import { StudioShell } from "@/components/studio/studio-shell";
import {
  StudioTopbar,
  type SaveState,
} from "@/components/studio/studio-topbar";
import { Button } from "@/components/ui/button";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import {
  FORM_SECTIONS,
  FormInspectorPanel,
  type FieldSelection,
  type FormSectionId,
} from "./form-inspector";
import { FormStudioPreview } from "./form-studio-preview";
import { hostedFormLink } from "@/lib/semblia-urls";
import {
  useStudioHotkeys,
  studioHotkeyHelp,
} from "@/components/studio/use-studio-hotkeys";

const AUTOSAVE_MS = 1200;

function isConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err != null &&
    (err as { status?: number }).status === 409
  );
}

export function FormStudio({ slug, formId }: { slug: string; formId: string }) {
  const router = useRouter();

  const formQuery = useForm(slug, formId);
  const draftQuery = useFormDraft(slug, formId);
  const saveMutation = useSaveFormDraft(slug, formId);
  const publishMutation = usePublishForm(slug, formId);
  const renameMutation = useUpdateForm(slug, formId);

  const form = formQuery.data ?? null;

  // ── Working draft state ─────────────────────────────────────────────────
  const [doc, setDoc] = React.useState<FormDefinitionDoc | null>(null);
  const [baseline, setBaseline] = React.useState<string>("");
  const versionRef = React.useRef<number>(1);
  const [section, setSection] = React.useState<FormSectionId>("content");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Canvas → inspector: clicking a field in the preview lands on its editor.
  const [fieldSelection, setFieldSelection] =
    React.useState<FieldSelection | null>(null);
  const handleFieldSelect = React.useCallback((id: string) => {
    setSection("fields");
    setFieldSelection((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  // Seed once from the server draft (saved draft preferred). Falls back to a
  // template for the form's intent if the stored doc is malformed.
  React.useEffect(() => {
    if (doc) return;
    if (!form || draftQuery.isLoading || !draftQuery.data) return;
    const parsed = parseDraftDoc(
      draftQuery.data.draft as Record<string, unknown>,
      form.intent,
    );
    setDoc(parsed);
    setBaseline(JSON.stringify(parsed));
    versionRef.current = draftQuery.data.draftVersion;
  }, [doc, form, draftQuery.isLoading, draftQuery.data]);

  const dirty = doc != null && JSON.stringify(doc) !== baseline;
  const dirtyRef = React.useRef(dirty);
  const docRef = React.useRef(doc);

  // Keep the latest dirty/doc reachable from timeouts + key handlers without
  // making every callback depend on them. Synced after each render (refs must
  // not be mutated during render).
  React.useEffect(() => {
    dirtyRef.current = dirty;
    docRef.current = doc;
  });

  // ── Save (manual + autosave) ────────────────────────────────────────────
  const doSave = React.useCallback(async () => {
    const current = docRef.current;
    if (!current || !dirtyRef.current || saveMutation.isPending) return;
    const snapshot = JSON.stringify(current);
    try {
      const result = await saveMutation.mutateAsync({
        draft: current as unknown as Record<string, unknown>,
        expectedVersion: versionRef.current,
      });
      versionRef.current = result.draftVersion;
      setBaseline(snapshot);
    } catch (err) {
      if (isConflict(err)) {
        toast.error(
          "This form changed elsewhere — reloading the latest draft.",
        );
        setDoc(null); // triggers re-hydrate from a fresh fetch
        draftQuery.refetch();
      } else {
        toast.error("Couldn't save. Retrying shortly.");
      }
    }
  }, [saveMutation, draftQuery]);

  // Debounced autosave on every edit.
  React.useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => void doSave(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [dirty, doc, doSave]);

  // Cmd/Ctrl+S.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirtyRef.current) void doSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doSave]);

  // Warn on hard unload while dirty.
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Publish ─────────────────────────────────────────────────────────────
  const handlePublish = React.useCallback(async () => {
    if (dirtyRef.current) await doSave();
    try {
      await publishMutation.mutateAsync();
      toast.success("Published — your form is live.");
    } catch {
      toast.error("Couldn't publish. Check your form and try again.");
    }
  }, [doSave, publishMutation]);

  // ── Leave guard ─────────────────────────────────────────────────────────
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const handleClose = React.useCallback(() => {
    if (dirtyRef.current) {
      setLeaveOpen(true);
      return;
    }
    router.push(`/projects/${slug}/forms`);
  }, [router, slug]);

  const handleRename = React.useCallback(
    (name: string) => renameMutation.mutate({ name }),
    [renameMutation],
  );

  useStudioHotkeys({
    tabs: FORM_SECTIONS,
    onTabChange: setSection,
    onPublish: () => void handlePublish(),
    onToggleHelp: () => setHelpOpen((v) => !v),
  });

  // ── Loading / error ─────────────────────────────────────────────────────
  if (formQuery.isError) {
    return (
      <CenteredNotice
        message="This form no longer exists."
        actionLabel="Back to forms"
        onAction={() => router.push(`/projects/${slug}/forms`)}
      />
    );
  }

  if (!form || !doc) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        aria-busy
      >
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  const status = formStatusMeta(form.status, form.open);
  const hostedLink =
    form.status === "PUBLISHED" && form.slug ? hostedFormLink(form.slug) : null;
  const previewMeta: PreviewMeta = {
    formId: form.id,
    projectId: form.projectId,
    slug: form.slug,
  };

  const saveState: SaveState = saveMutation.isPending
    ? "saving"
    : dirty
      ? "unsaved"
      : "saved";

  return (
    <>
      <ConfirmationDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        intent="warning"
        size="sm"
        title="Leave the studio?"
        description="You have unsaved changes. They'll be lost if you leave now."
        cancelLabel="Keep editing"
        confirmLabel="Leave anyway"
        onConfirm={() => {
          setLeaveOpen(false);
          router.push(`/projects/${slug}/forms`);
        }}
      />

      {/* Fonts for the preview typography options. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Fraunces:ital,wght@0,300..900;1,300..900&display=swap"
      />

      <StudioShell
        ariaLabel="Form Studio"
        sections={FORM_SECTIONS}
        activeSection={section}
        onSectionChange={setSection}
        renderInspector={(id) => (
          <FormInspectorPanel
            section={id}
            doc={doc}
            onChange={setDoc}
            selection={fieldSelection}
          />
        )}
        preview={
          <FormStudioPreview
            doc={doc}
            meta={previewMeta}
            onFieldSelect={handleFieldSelect}
          />
        }
        topbar={
          <StudioTopbar
            backLabel="Forms"
            onBack={handleClose}
            name={form.name}
            onRename={handleRename}
            dirty={dirty}
            status={status}
            saveState={saveState}
            help={{
              shortcuts: studioHotkeyHelp(FORM_SECTIONS.length),
              tip: "Edits autosave as you type. Click any field in the preview to jump to its editor.",
              open: helpOpen,
              onOpenChange: setHelpOpen,
            }}
            secondaryActions={
              hostedLink ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <a href={hostedLink} target="_blank" rel="noreferrer">
                    <ArrowSquareOutIcon className="size-3.5" aria-hidden />
                    View
                  </a>
                </Button>
              ) : null
            }
            publish={{
              onPublish: () => void handlePublish(),
              publishing: publishMutation.isPending,
              label: form.currentVersion != null ? "Republish" : "Publish",
            }}
          />
        }
      />
    </>
  );
}

function CenteredNotice({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-3 text-xs text-foreground underline-offset-2 hover:underline"
      >
        {actionLabel}
      </button>
    </div>
  );
}
