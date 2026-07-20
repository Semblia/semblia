"use client";

/**
 * FormPreviewClient — the form's true full-page preview (its own route,
 * opened in a new tab from the studio). Renders the CURRENT SAVED DRAFT as a
 * display-only showcase — the viewer sees exactly how the form looks and can
 * browse its steps, but never fills it in. Hosted forms render full-bleed;
 * embed forms render inside a believable host site (the delivery is the
 * form's own property, not a toggle). State (device/scheme) lives in query
 * params so a specific view is shareable.
 */

import * as React from "react";
import { FormRenderer } from "@workspace/forms-renderer";
import type { FormDefinitionDoc, PublicSnapshot } from "@workspace/forms-core";
import type { V2FormDTO, V2ProjectDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useForm, useFormDraft, useProject } from "@/hooks/api";
import { parseDraftDoc, compilePreviewSnapshot } from "@/lib/forms/draft";
import { faviconForUrl } from "@/lib/favicon";
import { HostPageChrome } from "@/components/widgets/preview-renderers/host-page-chrome";
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
  form: V2FormDTO | undefined,
  draft: Record<string, unknown> | undefined,
): { doc: FormDefinitionDoc | null; snapshot: PublicSnapshot | null } {
  return React.useMemo(() => {
    if (!form || !draft) return { doc: null, snapshot: null };
    const doc = parseDraftDoc(draft, form.intent);
    const snapshot = compilePreviewSnapshot(doc, {
      formId: form.id,
      projectId: form.projectId,
      slug: form.slug,
    });
    return { doc, snapshot };
  }, [form, draft]);
}

/** An explicit `?scheme=` param forces the scheme; anything else defers. */
const FORCED_SCHEMES: Record<string, CanvasScheme> = {
  dark: "dark",
  light: "light",
};

function resolveScheme(
  schemeParam: string | null,
  doc: FormDefinitionDoc | null,
): CanvasScheme {
  const forced = FORCED_SCHEMES[String(schemeParam)];
  if (forced) return forced;
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
  const project = useProject(slug).data;

  const device: Device =
    searchParams.get("device") === "mobile" ? "mobile" : "desktop";

  const { doc, snapshot } = useDraftSnapshot(
    formQuery.data,
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

  if (!doc || !snapshot) {
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
      delivery={doc.delivery}
      snapshot={snapshot}
      project={project}
      setQuery={setQuery}
    />
  );
}

/** The stage backdrop behind the previewed page, per scheme. */
const HOST_BG: Record<CanvasScheme, string> = {
  dark: "#0a0a0b",
  light: "#f4f4f5",
};

/** The rendered page once the snapshot is ready. */
function FormPreviewSurface({
  backHref,
  device,
  scheme,
  delivery,
  snapshot,
  project,
  setQuery,
}: {
  backHref: string;
  device: Device;
  scheme: CanvasScheme;
  delivery: FormDefinitionDoc["delivery"];
  snapshot: PublicSnapshot;
  project: V2ProjectDTO | undefined;
  setQuery: (patch: Record<string, string | null>) => void;
}) {
  const [restartKey, setRestartKey] = React.useState(0);
  const contentDark = scheme === "dark";
  const hostBg = HOST_BG[scheme];
  const rendererKey = `${restartKey}:${device}:${scheme}:${delivery}`;

  const renderer = (
    <FormRenderer
      key={rendererKey}
      snapshot={snapshot}
      mode="showcase"
      forcedScheme={scheme}
      surface={delivery}
      className={delivery === "hosted" ? "min-h-svh" : undefined}
    />
  );

  const embedInSite = (
    <EmbedHostSite project={project} contentDark={contentDark}>
      {renderer}
    </EmbedHostSite>
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

      <PreviewStage
        device={device}
        delivery={delivery}
        contentDark={contentDark}
        renderer={renderer}
        embedInSite={embedInSite}
      />
    </main>
  );
}

/** The believable host site an embed-delivery form previews inside. */
function EmbedHostSite({
  project,
  contentDark,
  children,
}: {
  project: V2ProjectDTO | undefined;
  contentDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <HostPageChrome
      hostName={project?.name ?? "Your site"}
      projectType={project?.projectType}
      accent={project?.brandColorPrimary}
      favicon={faviconForUrl(project?.websiteUrl)}
      contentDark={contentDark}
      className="min-h-svh"
    >
      <div className="py-4">{children}</div>
    </HostPageChrome>
  );
}

/** Device × delivery composition: phone frame, host-site embed, or full-bleed. */
function PreviewStage({
  device,
  delivery,
  contentDark,
  renderer,
  embedInSite,
}: {
  device: Device;
  delivery: FormDefinitionDoc["delivery"];
  contentDark: boolean;
  renderer: React.ReactNode;
  embedInSite: React.ReactNode;
}) {
  // An embed form previews where it will live: inside a host site.
  const content = delivery === "embed" ? embedInSite : renderer;
  if (device !== "mobile") {
    // Desktop shows the page exactly as it ships: full-bleed, real viewport.
    return content;
  }
  // A phone frame; the composition treats the frame as its viewport.
  return (
    <div className="mx-auto max-w-[393px] px-0 py-14">
      <div
        className={cn(
          "h-[780px] overflow-y-auto overflow-x-hidden rounded-[28px] shadow-sm",
          contentDark ? "border border-white/10" : "border border-black/5",
        )}
        style={{ "--tf-viewport": "100%" } as React.CSSProperties}
      >
        {content}
      </div>
    </div>
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
