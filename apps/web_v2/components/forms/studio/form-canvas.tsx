"use client";

/**
 * FormCanvas — the Form Studio's editing stage.
 *
 * Compiles the working draft with forms-core and renders it through the shared
 * FormRenderer inside the controlled StudioCanvas (true device width, visible
 * zoom, honest frame). Clicking a field on the canvas selects it in the
 * inspector (capture-phase, so the input underneath still works).
 */

import * as React from "react";
import { FormRenderer, type RenderSurface } from "@workspace/forms-renderer";
import type { FormDefinitionDoc } from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import { compilePreviewSnapshot, type PreviewMeta } from "@/lib/forms/draft";
import { hostedFormUrl } from "@/lib/semblia-urls";
import { Segmented } from "@/components/studio/controls";
import {
  StudioCanvas,
  CANVAS_DEVICES,
  type CanvasScheme,
} from "@/components/studio/studio-canvas";

type Device = "desktop" | "mobile";

const SURFACE_OPTIONS = [
  { value: "hosted", label: "Page" },
  { value: "embed", label: "Embed" },
] as const;

const DEVICES = [CANVAS_DEVICES.desktop, CANVAS_DEVICES.mobile];

const CANVAS_CSS = `
.tf-canvas [data-tf-field] { position: relative; border-radius: 6px; }
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
  onFieldSelect,
}: {
  doc: FormDefinitionDoc;
  meta: PreviewMeta;
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
  // Both deliveries are first-class designs; the dock switches between the
  // hosted page composition and the embed composition a host page receives.
  const [surface, setSurface] = React.useState<RenderSurface>("hosted");

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
  const rendererKey = `${structuralKey}:${scheme}:${surface}`;
  const contentDark = scheme === "dark";
  const hostBg = contentDark ? "#0a0a0b" : "#f4f4f5";
  const hostedUrl = hostedFormUrl(slug ?? "your-form");

  return (
    <StudioCanvas<Device>
      devices={DEVICES}
      device={device}
      onDeviceChange={setDevice}
      scheme={scheme}
      onSchemeChange={setSchemeOverride}
      frameLabel={
        surface === "hosted"
          ? hostedUrl.replace(/^https?:\/\//, "")
          : "embedded in your site"
      }
      dockExtras={
        <Segmented
          options={SURFACE_OPTIONS}
          value={surface}
          onChange={setSurface}
          ariaLabel="Preview surface"
        />
      }
      onClickCapture={handleCanvasClick}
      stageClassName={onFieldSelect ? "tf-canvas" : undefined}
    >
      {surface === "hosted" ? (
        // The hosted composition owns the whole page — render it full-bleed
        // and size its "viewport" to the device frame, not the browser.
        // Pixel height, not a percentage: the frame's inner wrapper has no
        // definite height for a % chain to resolve against.
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
            mode="preview"
            forcedScheme={scheme}
            surface="hosted"
            className="h-full"
          />
        </div>
      ) : (
        // Embeds live inside someone else's page: preview against a neutral
        // host so the pack's earned boundary reads honestly.
        <div className="h-full overflow-y-auto" style={{ background: hostBg }}>
          <div className={cn(device === "mobile" ? "px-4 py-8" : "px-8 py-12")}>
            <FormRenderer
              key={rendererKey}
              snapshot={snapshot}
              mode="preview"
              forcedScheme={scheme}
              surface="embed"
            />
          </div>
        </div>
      )}
    </StudioCanvas>
  );
}
