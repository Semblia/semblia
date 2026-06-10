import { renderToStaticMarkup } from "react-dom/server";
import { googleFontsHref } from "./fonts.js";
import { HOSTED_RUNTIME_JS } from "./generated/runtime-js.js";
import { HOSTED_FORM_CSS, HostedForm } from "./react.js";
import type { FormViewModel } from "./types.js";

export { HOSTED_RUNTIME_SHA256 } from "./generated/runtime-js.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** JSON safe to embed in a <script> tag (cannot break out of the element). */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");
}

function runtimeConfig(model: FormViewModel): string {
  return scriptJson({
    flow: model.layout.flow,
    mobileFlow: model.layout.mobileFlow,
    loaderMs: model.loader.enabled ? model.loader.durationMs : 0,
    questions: model.questions.map((q) => ({
      id: q.id,
      type: q.type,
      required: q.required,
      showIf: q.showIf,
    })),
  });
}

export function renderHostedFormHtml(input: {
  model: FormViewModel;
  actionPath: string;
  submitted?: boolean;
}): string {
  const { model, submitted } = input;
  const body = renderToStaticMarkup(
    <HostedForm
      model={model}
      actionPath={input.actionPath}
      submitted={submitted}
    />,
  );

  const fontsHref = googleFontsHref(model.webFonts);
  const fontLinks = fontsHref
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="${escapeHtml(fontsHref)}">`
    : "";

  // No-JS-friendly redirect once the success screen has had a beat on screen.
  const redirectMeta =
    submitted &&
    model.success.action === "redirect" &&
    model.success.redirectUrl
      ? `<meta http-equiv="refresh" content="1.4;url=${escapeHtml(model.success.redirectUrl)}">`
      : "";

  const scripts = submitted
    ? ""
    : `<script type="application/json" id="hf-config">${runtimeConfig(model)}</script>
  <script>${HOSTED_RUNTIME_JS}</script>`;

  const title = `${escapeHtml(model.headline)} - ${escapeHtml(model.brandName)}`;
  const description = escapeHtml(model.subhead);
  const themeColor = model.cssVars["--f-bg"] ?? "#ffffff";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="${model.colorScheme}">
    <meta name="theme-color" content="${escapeHtml(themeColor)}">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    ${redirectMeta}
    ${fontLinks}
    <style>${HOSTED_FORM_CSS}</style>
  </head>
  <body>${body}
  ${scripts}</body>
</html>`;
}
