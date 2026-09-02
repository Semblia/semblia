# @semblia/node

Typed Node.js client for the Semblia v2 API.

## Install

```sh
npm install @semblia/node
```

Requires Node.js 20+.

## Authenticate

Create an API key (`tsk_live_…`) or agent key (`tag_live_…`) in your
project's **Developers** section. Both authenticate the same way; they differ
only in the capabilities your project grants them.

```ts
import { SembliaClient } from "@semblia/node";

const semblia = new SembliaClient({ apiKey: process.env.SEMBLIA_API_KEY! });
```

## Read your projects and responses

```ts
const projects = await semblia.projects.list();

const responses = await semblia.responses.list(projects.items[0].slug, {
  status: "APPROVED",
  page: 1,
});

for (const response of responses.items) {
  console.log(response.authorName, response.ratingValue);
}
```

## Ask for a testimonial

```ts
const forms = await semblia.forms.list("acme");
const hosted = forms.find((form) => form.publishedDelivery === "hosted");

await semblia.formRequests.create("acme", {
  formId: hosted!.id,
  emails: ["customer@example.com"],
  note: "Would love to hear how the rollout went!",
});
```

## Errors

Every non-2xx response throws a `SembliaApiError` carrying the HTTP `status`,
the API's machine-readable `code`, and the raw `body`:

```ts
import { SembliaApiError } from "@semblia/node";

try {
  await semblia.responses.moderate("acme", "resp_1", { status: "APPROVED" });
} catch (error) {
  if (error instanceof SembliaApiError && error.status === 409) {
    console.log(error.code, error.message);
  } else {
    throw error;
  }
}
```

## Beyond the typed surface

Any v2 endpoint is reachable through the low-level helpers — `request`
returns the payload, `requestRaw` the full `{ success, data, meta }`
envelope:

```ts
const summary = await semblia.request("/projects/acme/analytics/summary");
```

## Docs

https://docs.semblia.com
