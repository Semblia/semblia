"use client";

/**
 * FormStudioPreview — the live, true-WYSIWYG preview. Compiles the working draft
 * with forms-core and renders it through the shared FormRenderer, so the editor
 * shows exactly what a respondent will see on the hosted page or embed.
 *
 * The form is framed like the real thing: a faux browser window at the hosted
 * URL on desktop, and a phone frame on mobile, so the preview reads as a real,
 * correctly-proportioned page instead of a card floating in a void. Both frames
 * scale to the stage and scroll internally, mirroring the widget studio.
 */

import * as React from "react";
import {
  SunIcon,
  MoonStarsIcon,
  DesktopIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react";
import { FormRenderer } from "@workspace/forms-renderer";
import type { FormDefinitionDoc } from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import { compilePreviewSnapshot, type PreviewMeta } from "@/lib/forms/draft";
import { hostedFormUrl } from "@/lib/semblia-urls";
import { Segmented } from "@/components/studio/controls";
import { BrowserChrome } from "@/components/studio/browser-chrome";

type Scheme = "light" | "dark";
type Device = "desktop" | "mobile";

const CANVAS_CSS = `
.tf-canvas [data-tf-field] { position: relative; border-radius: 6px; }
.tf-canvas [data-tf-field]:hover {
  outline: 1.5px dashed color-mix(in oklab, var(--brand) 60%, transparent);
  outline-offset: 5px;
}
@media (prefers-reduced-motion: no-preference) {
  .tf-canvas [data-tf-field] { transition: outline-color 120ms ease-out; }
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

export function FormStudioPreview({
  doc,
  meta,
  showSaveHint = true,
  onFieldSelect,
}: {
  doc: FormDefinitionDoc;
  meta: PreviewMeta;
  /** The editor shows "⌘S to save"; read-only previews pass false. */
  showSaveHint?: boolean;
  /** Canvas editing: clicking a field in the preview selects it in the inspector. */
  onFieldSelect?: (fieldId: string) => void;
}) {
  const [scheme, setScheme] = React.useState<Scheme>(() =>
    doc.design.mode === "dark" ? "dark" : "light",
  );
  const [device, setDevice] = React.useState<Device>("desktop");

  // Defer compilation so keystrokes in the inspector commit immediately and the
  // (heavier) snapshot compile + preview render trails as a low-priority update.
  const deferredDoc = React.useDeferredValue(doc);

  const snapshot = React.useMemo(
    () => compilePreviewSnapshot(deferredDoc, meta),
    [deferredDoc, meta],
  );

  React.useEffect(() => {
    if (onFieldSelect) ensureCanvasCss();
  }, [onFieldSelect]);

  // Canvas selection: a capture-phase click maps the nearest field wrapper to
  // the inspector without blocking the input underneath (test + edit in one).
  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!onFieldSelect) return;
      const target = e.target as HTMLElement | null;
      const fieldEl = target?.closest?.("[data-tf-field]");
      const id = fieldEl?.getAttribute("data-tf-field");
      if (id) onFieldSelect(id);
    },
    [onFieldSelect],
  );

  // Re-mount the renderer only when the structural shape changes (fields, flow,
  // layout) so its internal controller (answers, step) resets cleanly. Copy and
  // design edits flow through props on the live mount — remounting on every
  // checksum change rebuilt the whole form DOM per keystroke.
  const structuralKey = React.useMemo(
    () =>
      [
        deferredDoc.fields.map((f) => `${f.id}:${f.type}`).join("|"),
        deferredDoc.layoutPreset,
        deferredDoc.flow.mode,
        deferredDoc.flow.consentPlacement,
      ].join("~"),
    [deferredDoc.fields, deferredDoc.layoutPreset, deferredDoc.flow],
  );
  const rendererKey = `${structuralKey}:${scheme}`;
  const contentDark = scheme === "dark";
  const pageBg = contentDark ? "#0a0a0b" : "#f4f4f5";
  const hostedUrl = hostedFormUrl(meta.slug ?? "your-form");

  const formCard = (
    <div
      className={cn(
        "mx-auto w-full max-w-xl overflow-hidden rounded-xl shadow-sm",
        contentDark ? "border border-white/10" : "border border-black/5",
      )}
    >
      <FormRenderer
        key={rendererKey}
        snapshot={snapshot}
        mode="preview"
        forcedScheme={scheme}
      />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
      {/* Stage header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-4 py-2">
        <Segmented<Device>
          ariaLabel="Preview device"
          className="w-auto"
          options={[
            { value: "desktop", label: "Desktop", icon: DesktopIcon },
            { value: "mobile", label: "Mobile", icon: DeviceMobileIcon },
          ]}
          value={device}
          onChange={setDevice}
        />
        <Segmented<Scheme>
          ariaLabel="Preview color scheme"
          className="w-auto"
          options={[
            { value: "light", label: "Light", icon: SunIcon },
            { value: "dark", label: "Dark", icon: MoonStarsIcon },
          ]}
          value={scheme}
          onChange={setScheme}
        />
      </div>

      {/* Stage */}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 justify-center overflow-hidden p-4 sm:p-6",
          onFieldSelect && "tf-canvas",
        )}
        onClickCapture={handleCanvasClick}
      >
        {device === "mobile" ? (
          <div className="flex h-full max-h-full w-[380px] max-w-full shrink-0 flex-col overflow-hidden rounded-[2.25rem] border border-zinc-700/50 bg-zinc-900 p-2.5 shadow-xl shadow-black/10">
            <div
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem]"
              style={{ background: pageBg }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
                {formCard}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl shadow-black/10">
            <BrowserChrome url={hostedUrl} contentDark={contentDark}>
              <div
                className="min-h-full px-6 py-8"
                style={{ background: pageBg }}
              >
                {formCard}
              </div>
            </BrowserChrome>
          </div>
        )}
      </div>

      {/* Stage tip */}
      <div className="px-4 pb-2 pt-1 text-center text-[11px] text-muted-foreground/70">
        {meta.slug ? (
          <>
            Hosted at <span className="font-mono">{hostedUrl}</span>
          </>
        ) : (
          "Live preview of your hosted form"
        )}
        {showSaveHint ? " · ⌘S to save" : null}
      </div>
    </div>
  );
}
