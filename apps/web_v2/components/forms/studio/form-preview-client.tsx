"use client";

/**
 * FormPreviewClient — the form's true full-page preview (its own route,
 * opened in a new tab from the studio). Renders the CURRENT SAVED DRAFT as a
 * real, answerable page — no scaling, no frames. State (device/scheme) lives
 * in query params so a specific view is shareable.
 */

import * as React from "react";
import { FormRenderer } from "@workspace/forms-renderer";
import type { FormDefinitionDoc, PublicSnapshot } from "@workspace/forms-core";
import type { V2FormDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
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
  return doc?.design.mode === "dark" ? "dark" : "light";
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
  const [restartKey, setRestartKey] = React.useState(0);

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

  if (!snapshot || !doc) {
    return (
      <main
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        aria-busy
      >
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </main>
    );
  }

  const contentDark = scheme === "dark";
  const pageBg = contentDark ? "#0a0a0b" : "#f4f4f5";

  return (
    <main
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: pageBg }}
    >
      {/* Fonts for the theme's typography options. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Fraunces:ital,wght@0,300..900;1,300..900&display=swap"
      />

      <PreviewChrome<Device>
        backHref={`/projects/${slug}/forms/${formId}`}
        devices={DEVICES}
        device={device}
        onDeviceChange={(d) => setQuery({ device: d === "desktop" ? null : d })}
        scheme={scheme}
        onSchemeChange={(s) => setQuery({ scheme: s })}
        onRestart={() => setRestartKey((k) => k + 1)}
      />

      <div
        className={cn(
          "mx-auto",
          device === "mobile" ? "max-w-[393px] px-4 py-14" : "px-6 py-16",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full max-w-xl overflow-hidden rounded-xl shadow-sm",
            contentDark ? "border border-white/10" : "border border-black/5",
          )}
        >
          <FormRenderer
            key={`${restartKey}:${device}:${scheme}`}
            snapshot={snapshot}
            mode="preview"
            forcedScheme={scheme}
          />
        </div>
      </div>
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
