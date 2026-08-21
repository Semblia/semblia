import type { Metadata } from "next";
import {
  Code,
  CodeBlock,
  DocH2,
  DocLead,
  DocP,
  DocTitle,
} from "@/components/doc";

export const metadata: Metadata = {
  title: "@semblia/node",
};

export default function NodeSdkPage() {
  return (
    <article>
      <DocTitle>@semblia/node</DocTitle>
      <DocLead>
        Typed Node.js client for the Semblia v2 API. Authenticate with an API
        key or an agent key from your project&apos;s Developers section.
      </DocLead>

      <DocH2>Install</DocH2>
      <CodeBlock>{`npm install @semblia/node`}</CodeBlock>
      <DocP>Requires Node.js 20+.</DocP>

      <DocH2>Authenticate</DocH2>
      <CodeBlock>{`import { SembliaClient } from "@semblia/node";

const semblia = new SembliaClient({ apiKey: process.env.SEMBLIA_API_KEY! });`}</CodeBlock>
      <DocP>
        Both credential kinds work here — API keys (<Code>tsk_live_…</Code>)
        and agent keys (<Code>tag_live_…</Code>). They differ only in the
        capabilities your project grants them; see API &amp; agent keys.
      </DocP>

      <DocH2>Read projects and responses</DocH2>
      <CodeBlock>{`const projects = await semblia.projects.list();

const responses = await semblia.responses.list(projects.items[0].slug, {
  status: "APPROVED",
  page: 1,
});

for (const response of responses.items) {
  console.log(response.authorName, response.ratingValue);
}`}</CodeBlock>

      <DocH2>Ask for a testimonial</DocH2>
      <CodeBlock>{`const forms = await semblia.forms.list("acme");
const hosted = forms.find((form) => form.publishedDelivery === "hosted");

await semblia.formRequests.create("acme", {
  formId: hosted!.id,
  emails: ["customer@example.com"],
  note: "Would love to hear how the rollout went!",
});`}</CodeBlock>

      <DocH2>Errors</DocH2>
      <CodeBlock>{`import { SembliaApiError } from "@semblia/node";

try {
  await semblia.responses.moderate("acme", "resp_1", { status: "APPROVED" });
} catch (error) {
  if (error instanceof SembliaApiError && error.status === 409) {
    console.log(error.code, error.message);
  } else {
    throw error;
  }
}`}</CodeBlock>
      <DocP>
        Every non-2xx response throws <Code>SembliaApiError</Code> with the
        HTTP <Code>status</Code>, the API&apos;s machine-readable{" "}
        <Code>code</Code>, and the raw <Code>body</Code>.
      </DocP>

      <DocH2>Beyond the typed surface</DocH2>
      <CodeBlock>{`const summary = await semblia.request("/projects/acme/analytics/summary");`}</CodeBlock>
      <DocP>
        <Code>request()</Code> returns the payload for any v2 endpoint;{" "}
        <Code>requestRaw()</Code> returns the full{" "}
        <Code>{`{ success, data, meta }`}</Code> envelope.
      </DocP>
    </article>
  );
}
