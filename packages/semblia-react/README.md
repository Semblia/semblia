# @semblia/react

React components for embedding Semblia widgets and forms. Thin typed
wrappers over the evergreen CDN embed runtime — the rendering logic lives at
`widgets.semblia.com` / `forms.semblia.com` and never goes stale against the
API, so this package stays tiny and update-free.

## Install

```sh
npm install @semblia/react
```

Requires React 19+.

## Embed a widget

Copy the `project` and `widget` values from your widget's Share panel in the
Studio.

```tsx
import { SembliaWidget } from "@semblia/react";

export function Testimonials() {
  return <SembliaWidget project="acme" widget="widget_123" />;
}
```

## Embed a collection form

Copy the `project` and `form` values from your form's share panel. The embed
runtime sizes the iframe to the form automatically.

```tsx
import { SembliaForm } from "@semblia/react";

export function FeedbackForm() {
  return <SembliaForm project="acme" form="customer-feedback" />;
}
```

Embedded forms submit from your page's origin, so add your site to the
project's **Settings → Security → Allowed origins** first — otherwise
submissions are rejected.

## Events

Both components accept `onLoad` and `onError` callbacks, fired from the embed
runtime's `semblia:*` DOM events:

```tsx
<SembliaWidget
  project="acme"
  widget="widget_123"
  onLoad={() => console.log("widget mounted")}
  onError={() => console.log("widget failed to load")}
/>
```

## Server components / SSR

Both components are client components (`"use client"` is built in). They
render their custom element on the server and load the embed script on the
client, injecting it once per page no matter how many embeds you render.

## Docs

https://docs.semblia.com
