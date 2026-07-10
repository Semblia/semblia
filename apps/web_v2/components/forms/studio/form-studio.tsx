"use client";

/**
 * FormStudio — the full-screen form editor. Loads the form + its saved draft,
 * holds the working draft in local state, debounce-autosaves with optimistic
 * `expectedVersion` concurrency, and publishes immutable snapshots.
 *
 * Composition (2026-07 rebuild): outline (structure) on the left, controlled
 * canvas in the middle, contextual inspector on the right. Selecting a field —
 * from the outline or by clicking it on the canvas — swaps the inspector to
 * that field's editor; Esc returns.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FormDefinitionDoc, FormField } from "@workspace/forms-core";
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
import { StudioFrame } from "@/components/studio/studio-frame";
import {
  StudioTopbar,
  type SaveState,
} from "@/components/studio/studio-topbar";
import { Button } from "@/components/ui/button";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  FORM_TABS,
  FormInspectorPanel,
  FieldInspector,
  type FormTabId,
} from "./form-inspector";
import { FormOutline, useOutlineActions } from "./form-outline";
import { FormCanvas } from "./form-canvas";
import { hostedFormLink } from "@/lib/semblia-urls";
import {
  useStudioHotkeys,
  useStudioSaveGuards,
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
  const [tab, setTab] = React.useState<FormTabId>("content");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Selection: outline row or canvas click → the field's editor.
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(
    null,
  );

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
  // The in-flight promise is shared: callers that must wait for the draft to
  // land (the Preview button) await the CURRENT save instead of skipping.
  const saveInFlightRef = React.useRef<Promise<void> | null>(null);
  const doSave = React.useCallback((): Promise<void> => {
    if (saveInFlightRef.current) return saveInFlightRef.current;
    const current = docRef.current;
    if (!current || !dirtyRef.current) return Promise.resolve();
    const snapshot = JSON.stringify(current);
    const run = (async () => {
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
      } finally {
        saveInFlightRef.current = null;
      }
    })();
    saveInFlightRef.current = run;
    return run;
  }, [saveMutation, draftQuery]);

  // Debounced autosave on every edit.
  React.useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => void doSave(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [dirty, doc, doSave]);

  // ⌘S + dirty-unload warning.
  useStudioSaveGuards(doSave, dirtyRef);

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

  const handleFieldSelect = React.useCallback((id: string) => {
    setSelectedFieldId(id);
  }, []);

  useStudioHotkeys({
    tabs: FORM_TABS,
    onTabChange: (id) => {
      setSelectedFieldId(null);
      setTab(id);
    },
    onPublish: () => void handlePublish(),
    onToggleHelp: () => setHelpOpen((v) => !v),
  });

  useKeyboardShortcuts([
    {
      key: "Escape",
      label: "Deselect field",
      group: "Studio",
      action: () => setSelectedFieldId(null),
      enabled: () => selectedFieldId != null,
    },
  ]);

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

      <FormStudioBody
        doc={doc}
        onChange={setDoc}
        tab={tab}
        onTabChange={setTab}
        selectedFieldId={selectedFieldId}
        onSelectField={handleFieldSelect}
        onClearSelection={() => setSelectedFieldId(null)}
        previewMeta={previewMeta}
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
              shortcuts: studioHotkeyHelp(FORM_TABS.length),
              tip: "Click any field on the canvas to edit it. Edits autosave.",
              open: helpOpen,
              onOpenChange: setHelpOpen,
            }}
            secondaryActions={
              hostedLink ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 text-xs text-muted-foreground"
                >
                  <a href={hostedLink} target="_blank" rel="noreferrer">
                    <ArrowSquareOutIcon className="size-3.5" aria-hidden />
                    <span className="hidden md:inline">Live</span>
                  </a>
                </Button>
              ) : null
            }
            preview={{
              href: `/projects/${slug}/forms/${formId}/preview`,
              // Awaited by the topbar before the tab navigates — the preview
              // route renders the SAVED draft.
              onBeforeOpen: doSave,
            }}
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

/** Frame composition, split out so selection derivations stay tidy. */
function FormStudioBody({
  doc,
  onChange,
  tab,
  onTabChange,
  selectedFieldId,
  onSelectField,
  onClearSelection,
  previewMeta,
  topbar,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  tab: FormTabId;
  onTabChange: (id: FormTabId) => void;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onClearSelection: () => void;
  previewMeta: PreviewMeta;
  topbar: React.ReactNode;
}) {
  const actions = useOutlineActions(doc, onChange);
  const selectedField =
    selectedFieldId != null
      ? (doc.fields.find((f) => f.id === selectedFieldId) ?? null)
      : null;

  const updateSelected = React.useCallback(
    (patch: Partial<FormField>) => {
      if (!selectedFieldId) return;
      onChange({
        ...doc,
        fields: doc.fields.map((f) =>
          f.id === selectedFieldId ? ({ ...f, ...patch } as FormField) : f,
        ),
      });
    },
    [doc, onChange, selectedFieldId],
  );

  return (
    <StudioFrame<FormTabId>
      ariaLabel="Form Studio"
      topbar={topbar}
      outline={
        <FormOutline
          doc={doc}
          actions={actions}
          selectedFieldId={selectedFieldId}
          onSelectField={onSelectField}
          onSelectContent={() => {
            onClearSelection();
            onTabChange("content");
          }}
        />
      }
      outlineLabel="Fields"
      tabs={FORM_TABS}
      activeTab={tab}
      onTabChange={(id) => {
        onClearSelection();
        onTabChange(id);
      }}
      renderInspector={(id) => (
        <FormInspectorPanel tab={id} doc={doc} onChange={onChange} />
      )}
      override={
        selectedField ? (
          <FieldInspector
            field={selectedField}
            actions={actions}
            onUpdate={updateSelected}
            onClose={onClearSelection}
          />
        ) : undefined
      }
      overrideKey={selectedField?.id}
      canvas={
        <FormCanvas
          doc={doc}
          meta={previewMeta}
          onFieldSelect={onSelectField}
        />
      }
    />
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
