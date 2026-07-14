"use client";

/**
 * FormPreviewClient — the form's true full-page preview (its own route,
 * opened in a new tab from the studio). Renders the CURRENT SAVED DRAFT as a
 * real, answerable page — no scaling, no frames. State (device/scheme) lives
 * in query params so a specific view is shareable.
 */

import * as React from "react";
import { FormRenderer, type RenderSurface } from "@workspace/forms-renderer";
import type { FormDefinitionDoc, PublicSnapshot } from "@workspace/forms-core";
import type { V2FormDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useForm, useFormDraft } from "@/hooks/api";
import { parseDraftDoc, compilePreviewSnapshot } from "@/lib/forms/draft";
import {
  PreviewChrome,
  usePreviewQuery,
} from "@/components/studio/preview-chrome";
import {
  CANVAS_DEVICES,
  type CanvasScheme,
} from "@/components/studio/studio-canvas";

type Device = "desktop" | "mobile";

const DEVICES = [CANVAS_DEVICES.desktop, CANVAS_DEVICES.mobile];

/** Parse + compile the saved draft once both queries land. */
function useDraftSnapshot(
  form: V2FormDTO | null,
  draft: Record<string, unknown> | undefined,
): { doc: FormDefinitionDoc | null; snapshot: PublicSnapshot | null } {
  const doc = React.useMemo(() => {
    if (!form || !draft) return null;
    return parseDraftDoc(draft, form.intent);
  }, [form, draft]);

  const snapshot = React.useMemo(() => {
    if (!doc || !form) return null;
    return compilePreviewSnapshot(doc, {
      formId: form.id,
      projectId: form.projectId,
      slug: form.slug,
    });
  }, [doc, form]);

  return { doc, snapshot };
}

function resolveScheme(
  schemeParam: string | null,
  doc: FormDefinitionDoc | null,
): CanvasScheme {
  if (schemeParam === "dark" || schemeParam === "light") return schemeParam;
  return doc?.brand.appearance === "dark" ? "dark" : "light";
}

export function FormPreviewClient({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  const { searchParams, setQuery } = usePreviewQuery();

  const formQuery = useForm(slug, formId);
  const draftQuery = useFormDraft(slug, formId);
  const form = formQuery.data ?? null;

  const device: Device =
    searchParams.get("device") === "mobile" ? "mobile" : "desktop";
  const surface: RenderSurface =
    searchParams.get("surface") === "embed" ? "embed" : "hosted";

  const { doc, snapshot } = useDraftSnapshot(
    form,
    draftQuery.data?.draft as Record<string, unknown> | undefined,
  );
  const scheme = resolveScheme(searchParams.get("scheme"), doc);

  // fixed inset-0 z-50: the route lives inside the (app) shell — cover it,
  // same escape the StudioFrame uses.
  if (formQuery.isError) {
    return <PreviewNotice message="This form no longer exists." />;
  }

  if (draftQuery.isError) {
    return (
      <PreviewNotice
        message="Couldn't load the draft for this preview."
        onRetry={() => void draftQuery.refetch()}
      />
    );
  }

  if (!snapshot) {
    return (
      <main
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        aria-busy
      >
        <Spinner className="size-6 text-muted-foreground" />
      </main>
    );
  }

  return (
    <FormPreviewSurface
      backHref={`/projects/${slug}/forms/${formId}`}
      device={device}
      scheme={scheme}
      surface={surface}
      snapshot={snapshot}
      setQuery={setQuery}
    />
  );
}

/** The rendered page once the snapshot is ready. */
function FormPreviewSurface({
  backHref,
  device,
  scheme,
  surface,
  snapshot,
  setQuery,
}: {
  backHref: string;
  device: Device;
  scheme: CanvasScheme;
  surface: RenderSurface;
  snapshot: PublicSnapshot;
  setQuery: (patch: Record<string, string | null>) => void;
}) {
  const [restartKey, setRestartKey] = React.useState(0);
  const contentDark = scheme === "dark";
  const hostBg = contentDark ? "#0a0a0b" : "#f4f4f5";
  const rendererKey = `${restartKey}:${device}:${scheme}:${surface}`;

  const renderer = (
    <FormRenderer
      key={rendererKey}
      snapshot={snapshot}
      mode="preview"
      forcedScheme={scheme}
      surface={surface}
      className={surface === "hosted" ? "min-h-svh" : undefined}
    />
  );

  return (
    <main
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: hostBg }}
    >
      {/* Fonts for the theme's typography options. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Fraunces:ital,wght@0,300..900;1,300..900&display=swap"
      />

      <PreviewChrome<Device>
        backHref={backHref}
        devices={DEVICES}
        device={device}
        onDeviceChange={(d) => setQuery({ device: d === "desktop" ? null : d })}
        scheme={scheme}
        onSchemeChange={(s) => setQuery({ scheme: s })}
        onRestart={() => setRestartKey((k) => k + 1)}
      />

      {device === "mobile" ? (
        // A phone frame; the composition treats the frame as its viewport.
        <div className="mx-auto max-w-[393px] px-0 py-14">
          <div
            className={cn(
              "h-[780px] overflow-y-auto overflow-x-hidden rounded-[28px] shadow-sm",
              contentDark ? "border border-white/10" : "border border-black/5",
            )}
            style={{ "--tf-viewport": "100%" } as React.CSSProperties}
          >
            {surface === "embed" ? (
              <div className="px-4 py-8" style={{ background: hostBg }}>
                {renderer}
              </div>
            ) : (
              renderer
            )}
          </div>
        </div>
      ) : surface === "embed" ? (
        // Embeds preview against a neutral host page.
        <div className="px-6 py-20">{renderer}</div>
      ) : (
        // The hosted page, exactly as it ships: full-bleed, real viewport.
        renderer
      )}
    </main>
  );
}

function PreviewNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-foreground underline-offset-2 hover:underline"
        >
          Try again
        </button>
      ) : null}
    </main>
  );
}
