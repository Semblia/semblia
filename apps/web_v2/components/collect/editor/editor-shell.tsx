"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, SlidersHorizontalIcon } from "lucide-react";
import { useCollectStore, isDirty } from "@/lib/collect/form-config-store";
import { useCollectSync } from "@/lib/collect/sync";
import type { MockProject } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { InspectorShell } from "@/components/collect/inspector/inspector-shell";
import { EditorTopbar } from "./editor-topbar";
import { EditorPreview } from "./editor-preview";

type MobileView = "inspector" | "preview";

export function EditorShell({ project }: { project: MockProject }) {
  useCollectSync();
  const router = useRouter();
  const slug = project.slug;

  const ensure = useCollectStore((s) => s.ensure);
  const save = useCollectStore((s) => s.save);
  const reset = useCollectStore((s) => s.reset);
  const snap = useCollectStore((s) => s.bySlug[slug]);
  const [mobileView, setMobileView] = React.useState<MobileView>("inspector");

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

  const mobileToggle = (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 lg:hidden">
      <button
        type="button"
        onClick={() => setMobileView("inspector")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
          mobileView === "inspector"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <SlidersHorizontalIcon className="size-3.5" />
        Inspector
      </button>
      <button
        type="button"
        onClick={() => setMobileView("preview")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
          mobileView === "preview"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <EyeIcon className="size-3.5" />
        Preview
      </button>
    </div>
  );

  return (
    <div
      data-slot="collect-editor"
      className="flex h-[calc(100svh-3.5rem)] flex-col overflow-hidden"
    >
      <EditorTopbar
        projectName={project.name}
        savedAt={snap.savedAt}
        dirty={dirty}
        onSave={handleSave}
        onReset={handleReset}
        onOpenPreview={handleOpenPreview}
        mobileToggle={mobileToggle}
      />
      <div className="flex min-h-0 flex-1">
        {/* Inspector — fills available space on desktop, toggled on mobile */}
        <div
          className={cn(
            "flex w-full min-w-0 flex-1 flex-col border-r border-border",
            mobileView === "inspector" ? "flex" : "hidden lg:flex"
          )}
        >
          <InspectorShell slug={slug} config={snap.draft} className="h-full" />
        </div>
        {/* Preview — fixed width on desktop, toggled on mobile */}
        <div
          className={cn(
            "w-full shrink-0 lg:w-[400px]",
            mobileView === "preview" ? "flex" : "hidden lg:flex"
          )}
        >
          <EditorPreview config={snap.draft} />
        </div>
      </div>
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
