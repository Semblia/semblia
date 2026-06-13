"use client";

import * as React from "react";
import { DesktopIcon, DeviceMobileIcon } from "@phosphor-icons/react";
import {
  publishFormDefinition,
  renderPublishedFormPage,
  type FormDefinitionDoc,
} from "@workspace/forms-core";
import { cn } from "@/lib/utils";

type Device = "desktop" | "mobile";

/**
 * True WYSIWYG preview — renders the form through the exact production
 * forms-core renderer (publish-time derived theme + preset layout) into a
 * sandboxed iframe. The studio preview can never drift from the served form
 * because they call the same code (docs/DESIGN.md §6).
 */
export function StudioPreview({
  doc,
  showSuccess = false,
  className,
}: {
  doc: FormDefinitionDoc;
  showSuccess?: boolean;
  className?: string;
}) {
  const [device, setDevice] = React.useState<Device>("desktop");

  const result = React.useMemo<
    { ok: true; html: string } | { ok: false; error: string }
  >(() => {
    try {
      const published = publishFormDefinition(doc);
      const { html } = renderPublishedFormPage(published, {
        watermark: true,
        submitted: showSuccess,
      });
      return { ok: true, html };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "This form has a configuration error.",
      };
    }
  }, [doc, showSuccess]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Live preview
        </span>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {[
            { id: "desktop" as const, Icon: DesktopIcon, label: "Desktop" },
            { id: "mobile" as const, Icon: DeviceMobileIcon, label: "Mobile" },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className={cn(
                "flex size-7 items-center justify-center rounded transition-colors",
                device === id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-auto bg-muted/40 p-4">
        {result.ok ? (
          <iframe
            // Re-mount on device change so the document re-lays-out cleanly.
            key={device}
            title="Form preview"
            srcDoc={result.html}
            sandbox="allow-forms allow-scripts allow-popups"
            className={cn(
              "h-full rounded-lg border border-border bg-background shadow-sm",
              device === "mobile" ? "w-[390px]" : "w-full",
            )}
          />
        ) : (
          <div className="flex max-w-sm flex-col items-center justify-center gap-2 self-center text-center">
            <p className="text-sm font-medium text-foreground">
              Preview unavailable
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {result.error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
