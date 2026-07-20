"use client";

/**
 * FormCanvas — the Form Studio's editing stage.
 *
 * Compiles the working draft with forms-core and renders it through the shared
 * FormRenderer inside the controlled StudioCanvas. The surface follows the
 * form's own delivery (2026-07-17): hosted forms fill the device frame as a
 * page; embed forms sit inside a believable host site (HostPageChrome — the
 * same mock the widget studio uses). The render is a showcase — clicking a
 * field selects it for editing; nothing on the canvas is fillable.
 */

import * as React from "react";
import { FormRenderer } from "@workspace/forms-renderer";
import type { FormDefinitionDoc } from "@workspace/forms-core";
import type { V2ProjectDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { compilePreviewSnapshot, type PreviewMeta } from "@/lib/forms/draft";
import { hostedFormUrl } from "@/lib/semblia-urls";
import { faviconForUrl } from "@/lib/favicon";
import { useProject } from "@/hooks/api";
import { HostPageChrome } from "@/components/widgets/preview-renderers/host-page-chrome";
import {
  StudioCanvas,
  CANVAS_DEVICES,
  type CanvasScheme,
} from "@/components/studio/studio-canvas";

type Device = "desktop" | "mobile";

const DEVICES = [CANVAS_DEVICES.desktop, CANVAS_DEVICES.mobile];

const CANVAS_CSS = `
.tf-canvas [data-tf-field] { position: relative; border-radius: 6px; cursor: default; }
.tf-canvas [data-tf-field]:hover {
  outline: 1px solid color-mix(in oklab, var(--brand) 55%, transparent);
  outline-offset: 4px;
}
@media (prefers-reduced-motion: no-preference) {
  .tf-canvas [data-tf-field] { transition: outline-color 80ms ease-out; }
}
`;

let _canvasCssInjected = false;
function ensureCanvasCss() {
  if (_canvasCssInjected || typeof document === "undefined") return;
  _canvasCssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-tf-canvas", "");
  style.textContent = CANVAS_CSS;
  document.head.appendChild(style);
}

/** Canvas editing: inject the hover CSS and map clicks to field ids. */
function useCanvasFieldSelect(onFieldSelect?: (fieldId: string) => void) {
  React.useEffect(() => {
    if (onFieldSelect) ensureCanvasCss();
  }, [onFieldSelect]);

  return React.useCallback(
    (e: React.MouseEvent) => {
      if (!onFieldSelect) return;
      const target = e.target as HTMLElement | null;
      const fieldEl = target?.closest?.("[data-tf-field]");
      const id = fieldEl?.getAttribute("data-tf-field");
      if (id) onFieldSelect(id);
    },
    [onFieldSelect],
  );
}

// Re-mount the renderer only when the structural shape changes (fields,
// template) so its internal controller (answers, step) resets cleanly. Copy and
// design edits flow through props on the live mount — remounting on every
// checksum change rebuilt the whole form DOM per keystroke.
function structuralKeyOf(doc: FormDefinitionDoc): string {
  return [
    doc.fields.map((f) => `${f.id}:${f.type}`).join("|"),
    doc.templateId,
  ].join("~");
}

export function FormCanvas({
  doc,
  meta,
  projectSlug,
  onFieldSelect,
}: {
  doc: FormDefinitionDoc;
  meta: PreviewMeta;
  /** For the embed host-site mock (name, type, brand color, favicon). */
  projectSlug?: string;
  /** Canvas editing: clicking a field in the preview selects it. */
  onFieldSelect?: (fieldId: string) => void;
}) {
  // Scheme follows the brand's appearance; the dock toggle is a manual
  // override that wins once used (same model as the preview route).
  const [schemeOverride, setSchemeOverride] =
    React.useState<CanvasScheme | null>(null);
  const scheme: CanvasScheme =
    schemeOverride ?? (doc.brand.appearance === "dark" ? "dark" : "light");
  const [device, setDevice] = React.useState<Device>("desktop");
  const project = useProject(projectSlug ?? "").data ?? null;

  // Defer compilation so keystrokes in the inspector commit immediately and the
  // (heavier) snapshot compile + preview render trails as a low-priority update.
  const deferredDoc = React.useDeferredValue(doc);

  // Keyed on meta's primitives: call sites build `meta` inline, so the object
  // identity changes on every parent render even when nothing did.
  const { formId, projectId, slug } = meta;
  const snapshot = React.useMemo(
    () => compilePreviewSnapshot(deferredDoc, { formId, projectId, slug }),
    [deferredDoc, formId, projectId, slug],
  );

  const handleCanvasClick = useCanvasFieldSelect(onFieldSelect);

  const structuralKey = React.useMemo(
    () => structuralKeyOf(deferredDoc),
    [deferredDoc],
  );
  const delivery = deferredDoc.delivery;
  const rendererKey = `${structuralKey}:${scheme}:${delivery}`;
  const contentDark = scheme === "dark";
  const hostedUrl = hostedFormUrl(slug ?? "your-form");

  return (
    <StudioCanvas<Device>
      devices={DEVICES}
      device={device}
      onDeviceChange={setDevice}
      scheme={scheme}
      onSchemeChange={setSchemeOverride}
      frameLabel={frameLabelFor(delivery, hostedUrl, project)}
      onClickCapture={handleCanvasClick}
      stageClassName={onFieldSelect ? "tf-canvas" : undefined}
      // Embed forms are in-flow elements of the host page — the frame hugs
      // the mock site's natural height instead of scrolling inside itself.
      fitHeight={delivery === "embed"}
    >
      {delivery === "hosted" ? (
        <HostedPageFrame
          device={device}
          rendererKey={rendererKey}
          snapshot={snapshot}
          scheme={scheme}
        />
      ) : (
        <EmbeddedSiteFrame
          project={project}
          contentDark={contentDark}
          device={device}
          rendererKey={rendererKey}
          snapshot={snapshot}
          scheme={scheme}
        />
      )}
    </StudioCanvas>
  );
}

/** Honest frame label: the hosted URL, or the embed's host-site descriptor. */
function frameLabelFor(
  delivery: FormDefinitionDoc["delivery"],
  hostedUrl: string,
  project: V2ProjectDTO | null,
): string {
  return delivery === "hosted"
    ? hostedUrl.replace(/^https?:\/\//, "")
    : `${project?.name ?? "your site"} · embedded`;
}

/**
 * The hosted composition owns the whole page — render it full-bleed and size
 * its "viewport" to the device frame, not the browser. Pixel height, not a
 * percentage: the frame's inner wrapper has no definite height for a % chain
 * to resolve against.
 */
function HostedPageFrame({
  device,
  rendererKey,
  snapshot,
  scheme,
}: {
  device: Device;
  rendererKey: string;
  snapshot: ReturnType<typeof compilePreviewSnapshot>;
  scheme: CanvasScheme;
}) {
  return (
    <div
      className="h-full overflow-y-auto"
      style={
        {
          "--tf-viewport": `${(DEVICES.find((d) => d.id === device) ?? DEVICES[0]!).h}px`,
        } as React.CSSProperties
      }
    >
      <FormRenderer
        key={rendererKey}
        snapshot={snapshot}
        mode="showcase"
        forcedScheme={scheme}
        surface="hosted"
        className="h-full"
      />
    </div>
  );
}

/**
 * An embed form lives inside someone else's page — preview it there, with the
 * same believable host-site mock the widget studio uses.
 */
function EmbeddedSiteFrame({
  project,
  contentDark,
  device,
  rendererKey,
  snapshot,
  scheme,
}: {
  project: V2ProjectDTO | null;
  contentDark: boolean;
  device: Device;
  rendererKey: string;
  snapshot: ReturnType<typeof compilePreviewSnapshot>;
  scheme: CanvasScheme;
}) {
  return (
    <HostPageChrome
      hostName={project?.name ?? "Your site"}
      projectType={project?.projectType}
      accent={project?.brandColorPrimary}
      favicon={faviconForUrl(project?.websiteUrl)}
      contentDark={contentDark}
      fitContent
    >
      <div className={cn(device === "mobile" ? "py-2" : "py-4")}>
        <FormRenderer
          key={rendererKey}
          snapshot={snapshot}
          mode="showcase"
          forcedScheme={scheme}
          surface="embed"
        />
      </div>
    </HostPageChrome>
  );
}
