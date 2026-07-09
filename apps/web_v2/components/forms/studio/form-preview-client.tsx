"use client";

/**
 * FormPreviewClient — the form's true full-page preview (its own route,
 * opened in a new tab from the studio). Renders the CURRENT SAVED DRAFT as a
 * real, answerable page — no scaling, no frames. State (device/scheme) lives
 * in query params so a specific view is shareable.
 */

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FormRenderer } from "@workspace/forms-renderer";
import { cn } from "@/lib/utils";
import { useForm, useFormDraft } from "@/hooks/api";
import { parseDraftDoc, compilePreviewSnapshot } from "@/lib/forms/draft";
import { PreviewChrome } from "@/components/studio/preview-chrome";
import {
  CANVAS_DEVICES,
  type CanvasScheme,
} from "@/components/studio/studio-canvas";

type Device = "desktop" | "mobile";

const DEVICES = [CANVAS_DEVICES.desktop, CANVAS_DEVICES.mobile];

export function FormPreviewClient({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const formQuery = useForm(slug, formId);
  const draftQuery = useFormDraft(slug, formId);
  const form = formQuery.data ?? null;

  const device: Device =
    searchParams.get("device") === "mobile" ? "mobile" : "desktop";
  const schemeParam = searchParams.get("scheme");
  const [restartKey, setRestartKey] = React.useState(0);

  const setQuery = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const doc = React.useMemo(() => {
    if (!form || !draftQuery.data) return null;
    return parseDraftDoc(
      draftQuery.data.draft as Record<string, unknown>,
      form.intent,
    );
  }, [form, draftQuery.data]);

  const scheme: CanvasScheme =
    schemeParam === "dark" || schemeParam === "light"
      ? schemeParam
      : doc?.design.mode === "dark"
        ? "dark"
        : "light";

  const snapshot = React.useMemo(() => {
    if (!doc || !form) return null;
    return compilePreviewSnapshot(doc, {
      formId: form.id,
      projectId: form.projectId,
      slug: form.slug,
    });
  }, [doc, form]);

  if (formQuery.isError) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          This form no longer exists.
        </p>
      </main>
    );
  }

  if (!snapshot || !doc) {
    return (
      <main
        className="flex min-h-svh items-center justify-center bg-background"
        aria-busy
      >
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </main>
    );
  }

  const contentDark = scheme === "dark";
  const pageBg = contentDark ? "#0a0a0b" : "#f4f4f5";

  return (
    <main className="min-h-svh" style={{ background: pageBg }}>
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
        onDeviceChange={(d) =>
          setQuery({ device: d === "desktop" ? null : d })
        }
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
