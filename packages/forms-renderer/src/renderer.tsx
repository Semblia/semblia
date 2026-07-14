import { useEffect, useMemo } from "react";
import { buildFormStylesheet, rootDataAttributes } from "./css.js";
import { resolveTemplatePack } from "./templates/registry.js";
import type { FormRendererProps } from "./types.js";
import { useFormController } from "./use-form-controller.js";

/**
 * The single React renderer for a published (or preview) snapshot. It routes
 * `snapshot.template.templateId` to the matching template pack — the pack owns
 * the entire visual world (composition, motion, success/closed moments); this
 * component owns only the state machine plumbing shared by every template.
 * The same component backs the dashboard preview, hosted pages (via
 * renderFormToString), iframe embeds, and native injection — it never cares
 * about the snapshot's origin.
 */
export function FormRenderer({
  snapshot,
  onSubmit,
  mode = "live",
  forcedScheme,
  surface = "hosted",
  initialAnswers,
  forceClosed,
  className,
}: FormRendererProps) {
  const ctrl = useFormController({ snapshot, initialAnswers, onSubmit, mode });
  const css = useMemo(() => buildFormStylesheet(snapshot), [snapshot]);
  const scheme = forcedScheme ?? snapshot.template.appearance;
  const rootAttrs = rootDataAttributes(snapshot, scheme, surface);
  const preview = mode === "preview";
  const closed = Boolean(forceClosed) || snapshot.status !== "published";

  // Honor the "redirect" success action on live submissions. The pack's
  // success moment still renders as the fallback while navigating (and for
  // previews, which never leave the page). `redirectUrl` is schema-validated
  // as http(s), so it can't carry a javascript: URL.
  const { successAction, redirectUrl } = snapshot.content;
  useEffect(() => {
    if (preview || ctrl.submitState !== "success") return;
    if (successAction === "redirect" && redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }, [preview, ctrl.submitState, successAction, redirectUrl]);

  const pack = resolveTemplatePack(snapshot.template.templateId);
  const Composition = pack.Composition;

  return (
    <div
      className={className ? `tf-root ${className}` : "tf-root"}
      {...rootAttrs}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Composition
        snapshot={snapshot}
        ctrl={ctrl}
        preview={preview}
        closed={closed}
        surface={surface}
      />
    </div>
  );
}

/**
 * The template's branded loading moment — hosts render this while fetching a
 * snapshot so the wait carries the brand instead of an unstyled fallback.
 */
export function FormLoader({
  templateId,
  logoUrl,
  name,
}: {
  templateId: string;
  logoUrl?: string | null;
  name?: string;
}) {
  const pack = resolveTemplatePack(templateId);
  const Loader = pack.Loader;
  return <Loader logoUrl={logoUrl} name={name} />;
}
