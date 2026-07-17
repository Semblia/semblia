"use client";

/**
 * FormStudio — the full-screen form editor. Loads the form + its saved draft,
 * holds the working draft in local state, debounce-autosaves with optimistic
 * `expectedVersion` concurrency, and publishes immutable snapshots.
 *
 * Composition (2026-07-17 reorg): CONTENT lives on the left — the structure
 * outline, and, on selection, the field/header/ending editors swap into that
 * same left rail. DESIGN lives on the right (Template · Brand · Setup) and is
 * never hijacked by a selection; Esc returns the rail to the outline.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FormDefinitionDoc, FormField } from "@workspace/forms-core";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Spinner } from "@/components/ui/spinner";
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
  HeaderEditor,
  EndingEditor,
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

/** What the left content rail is editing (null = the structure outline). */
export type RailSelection =
  | { kind: "field"; id: string }
  | { kind: "header" }
  | { kind: "ending" }
  | null;

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
  const [tab, setTab] = React.useState<FormTabId>("template");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Left-rail selection: outline row or canvas click → that editor in the rail.
  const [selection, setSelection] = React.useState<RailSelection>(null);

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
    // Consent is platform furniture — never the owner's field to edit.
    const field = docRef.current?.fields.find((f) => f.id === id);
    if (field?.type === "consent") return;
    setSelection({ kind: "field", id });
  }, []);

  // Right-side design tabs are independent of the left-rail selection — the
  // whole point of the 2026-07-17 reorg is that they never fight.
  useStudioHotkeys({
    tabs: FORM_TABS,
    onTabChange: setTab,
    onPublish: () => void handlePublish(),
    onToggleHelp: () => setHelpOpen((v) => !v),
  });

  useKeyboardShortcuts([
    {
      key: "Escape",
      label: "Back to structure",
      group: "Studio",
      action: () => setSelection(null),
      enabled: () => selection != null,
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
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const status = formStatusMeta(form.status, form.open);
  // Embed-delivery forms have no hosted page — their "live" surface is the
  // embed snippet in Setup.
  const hostedLink =
    form.status === "PUBLISHED" && form.slug && doc.delivery === "hosted"
      ? hostedFormLink(form.slug)
      : null;
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
        slug={slug}
        selection={selection}
        onSelect={setSelection}
        onSelectField={handleFieldSelect}
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
  slug,
  selection,
  onSelect,
  onSelectField,
  previewMeta,
  topbar,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  tab: FormTabId;
  onTabChange: (id: FormTabId) => void;
  slug: string;
  selection: RailSelection;
  onSelect: (next: RailSelection) => void;
  onSelectField: (id: string) => void;
  previewMeta: PreviewMeta;
  topbar: React.ReactNode;
}) {
  const actions = useOutlineActions(doc, onChange);
  const selectedField =
    selection?.kind === "field"
      ? (doc.fields.find((f) => f.id === selection.id) ?? null)
      : null;

  const updateSelected = React.useCallback(
    (patch: Partial<FormField>) => {
      if (selection?.kind !== "field") return;
      onChange({
        ...doc,
        fields: doc.fields.map((f) =>
          f.id === selection.id ? ({ ...f, ...patch } as FormField) : f,
        ),
      });
    },
    [doc, onChange, selection],
  );

  const close = () => onSelect(null);
  const railEditor = selectedField ? (
    <FieldInspector
      field={selectedField}
      doc={doc}
      onChange={onChange}
      actions={actions}
      onUpdate={updateSelected}
      onClose={close}
    />
  ) : selection?.kind === "header" ? (
    <HeaderEditor doc={doc} onChange={onChange} onClose={close} />
  ) : selection?.kind === "ending" ? (
    <EndingEditor doc={doc} onChange={onChange} onClose={close} />
  ) : undefined;

  return (
    <StudioFrame<FormTabId>
      ariaLabel="Form Studio"
      topbar={topbar}
      outline={
        <FormOutline
          doc={doc}
          actions={actions}
          selectedFieldId={selectedField?.id ?? null}
          onSelectField={onSelectField}
          onSelectHeader={() => onSelect({ kind: "header" })}
          onSelectEnding={() => onSelect({ kind: "ending" })}
        />
      }
      outlineLabel="Content"
      tabs={FORM_TABS}
      activeTab={tab}
      onTabChange={onTabChange}
      renderInspector={(id) => (
        <FormInspectorPanel
          tab={id}
          doc={doc}
          onChange={onChange}
          meta={{ projectId: previewMeta.projectId, slug: previewMeta.slug }}
        />
      )}
      outlineOverride={railEditor}
      outlineOverrideKey={
        selection?.kind === "field" ? selection.id : selection?.kind
      }
      canvas={
        <FormCanvas
          doc={doc}
          meta={previewMeta}
          projectSlug={slug}
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
