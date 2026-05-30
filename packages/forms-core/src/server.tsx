import { renderToStaticMarkup } from "react-dom/server";
import { HOSTED_FORM_CSS, HostedForm } from "./react.js";
import type { FormViewModel } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderHostedFormHtml(input: {
  model: FormViewModel;
  actionPath: string;
  submitted?: boolean;
}): string {
  const body = renderToStaticMarkup(
    <HostedForm
      model={input.model}
      actionPath={input.actionPath}
      submitted={input.submitted}
    />,
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.model.headline)} - ${escapeHtml(input.model.brandName)}</title>
    <style>${HOSTED_FORM_CSS}</style>
  </head>
  <body>${body}</body>
</html>`;
}
