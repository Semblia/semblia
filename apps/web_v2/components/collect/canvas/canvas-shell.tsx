"use client";

import * as React from "react";
import { toast } from "sonner";
import { useCollectStore, isDirty } from "@/lib/collect/form-config-store";
import { useCollectSync } from "@/lib/collect/sync";
import type { MockProject } from "@/lib/mock-data";
import { DeviceFrame, type DeviceSize } from "@/components/collect/device-frame";
import { FormPreview } from "@/components/collect/form-preview";
import { CanvasTopbar } from "./canvas-topbar";
import { FloatingInspector } from "./floating-inspector";

const SESSION_KEY_PREFIX = "tresta:collect:canvas-device:";

function loadDevice(slug: string): DeviceSize {
  if (typeof window === "undefined") return "mobile";
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY_PREFIX + slug);
    if (raw === "mobile" || raw === "tablet" || raw === "desktop" || raw === "fill") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "mobile";
}

function persistDevice(slug: string, device: DeviceSize) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY_PREFIX + slug, device);
  } catch {
    // ignore
  }
}

export function CanvasShell({ project }: { project: MockProject }) {
  useCollectSync();
  const slug = project.slug;

  const ensure = useCollectStore((s) => s.ensure);
  const save = useCollectStore((s) => s.save);
  const snap = useCollectStore((s) => s.bySlug[slug]);

  const [device, setDevice] = React.useState<DeviceSize>("mobile");
  const [inspectorOpen, setInspectorOpen] = React.useState(true);

  React.useEffect(() => {
    ensure(slug, project);
    setDevice(loadDevice(slug));
  }, [slug, project, ensure]);

  const handleDeviceChange = (d: DeviceSize) => {
    setDevice(d);
    persistDevice(slug, d);
  };

  const handleSave = React.useCallback(() => {
    save(slug);
    toast.success("Changes saved");
  }, [save, slug]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key !== "s") return;
      e.preventDefault();
      const snap = useCollectStore.getState().bySlug[slug];
      if (snap && isDirty(snap)) {
        save(slug);
        toast.success("Changes saved");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slug, save]);

  if (!snap) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="flex w-48 flex-col items-center gap-3">
          <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  const dirty = isDirty(snap);

  return (
    <div
      data-slot="collect-canvas"
      className="relative flex h-svh flex-col overflow-hidden bg-background"
    >
      <CanvasTopbar
        slug={slug}
        projectName={project.name}
        device={device}
        onDeviceChange={handleDeviceChange}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        dirty={dirty}
        onSave={handleSave}
      />

      <div
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, currentColor 10%, transparent) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          color: "hsl(var(--muted-foreground) / 0.35)",
        }}
      >
        <div
          className="flex h-full items-center justify-center p-8"
          data-testid="canvas-stage"
        >
          {device === "fill" ? (
            <div className="size-full max-w-[1600px]">
              <DeviceFrame device={device}>
                <FormPreview config={snap.draft} density="cozy" showPreviewToggle />
              </DeviceFrame>
            </div>
          ) : (
            <DeviceFrame device={device}>
              <FormPreview config={snap.draft} density="cozy" showPreviewToggle />
            </DeviceFrame>
          )}
        </div>

        <FloatingInspector
          slug={slug}
          config={snap.draft}
          open={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
        />
      </div>
    </div>
  );
}
