"use client";

import * as React from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCollectStore, isDirty } from "@/lib/collect/form-config-store";
import { useCollectSync } from "@/lib/collect/sync";
import type { MockProject } from "@/lib/mock-data";
import { InspectorShell } from "@/components/collect/inspector/inspector-shell";
import { EditorTopbar } from "./editor-topbar";
import { EditorPreview } from "./editor-preview";

export function EditorShell({ project }: { project: MockProject }) {
  useCollectSync();
  const router = useRouter();
  const slug = project.slug;

  const ensure = useCollectStore((s) => s.ensure);
  const save = useCollectStore((s) => s.save);
  const reset = useCollectStore((s) => s.reset);
  const snap = useCollectStore((s) => s.bySlug[slug]);

  React.useEffect(() => {
    ensure(slug, project);
  }, [slug, project, ensure]);

  const handleSave = React.useCallback(() => {
    save(slug);
    toast.success("Changes saved");
  }, [save, slug]);

  const handleReset = React.useCallback(() => {
    reset(slug);
    toast("Changes reset");
  }, [reset, slug]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        const snap = useCollectStore.getState().bySlug[slug];
        if (snap && isDirty(snap)) {
          save(slug);
          toast.success("Changes saved");
        }
      }
      if (e.key === "z" && !e.shiftKey) {
        const active = document.activeElement;
        const isInput =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement;
        if (isInput) return;
        e.preventDefault();
        const snap = useCollectStore.getState().bySlug[slug];
        if (snap && isDirty(snap)) {
          reset(slug);
          toast("Changes reset");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slug, save, reset]);

  if (!snap) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-48 flex-col items-center gap-3">
          <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  const dirty = isDirty(snap);

  const handleOpenPreview = () => {
    if (typeof window === "undefined") return;
    window.open(`/projects/${slug}/collect/preview`, "_blank", "noopener");
  };

  return (
    <div
      data-slot="collect-editor"
      className="flex h-[calc(100svh-3.5rem)] flex-1 flex-col overflow-hidden"
    >
      <EditorTopbar
        projectName={project.name}
        savedAt={snap.savedAt}
        dirty={dirty}
        onSave={handleSave}
        onReset={handleReset}
        onOpenPreview={handleOpenPreview}
      />
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel
          defaultSize={42}
          minSize={32}
          maxSize={60}
          className="flex flex-col"
        >
          <InspectorShell slug={slug} config={snap.draft} className="h-full" />
        </Panel>
        <PanelResizeHandle className="group relative flex w-px items-stretch bg-border transition-colors data-[resize-handle-state=drag]:bg-primary data-[resize-handle-state=hover]:bg-primary/60">
          <span className="pointer-events-none absolute inset-y-0 -left-1.5 w-4" />
        </PanelResizeHandle>
        <Panel defaultSize={58} minSize={40} className="min-w-0">
          <EditorPreview config={snap.draft} />
        </Panel>
      </PanelGroup>
      <button
        type="button"
        className="sr-only"
        onClick={() => router.refresh()}
      >
        refresh
      </button>
    </div>
  );
}
