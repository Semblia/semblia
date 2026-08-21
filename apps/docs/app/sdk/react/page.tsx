import type { Metadata } from "next";
import {
  Code,
  CodeBlock,
  DocH2,
  DocLead,
  DocList,
  DocP,
  DocTitle,
} from "@/components/doc";

export const metadata: Metadata = {
  title: "@semblia/react",
};

export default function ReactSdkPage() {
  return (
    <article>
      <DocTitle>@semblia/react</DocTitle>
      <DocLead>
        Typed React components for embedding Semblia widgets and forms. Thin
        wrappers over the CDN embed runtime — no rendering logic ships on
        npm, so the package never goes stale against the API.
      </DocLead>

      <DocH2>Install</DocH2>
      <CodeBlock>{`npm install @semblia/react`}</CodeBlock>
      <DocP>Requires React 19.</DocP>

      <DocH2>Embed a widget</DocH2>
      <CodeBlock>{`import { SembliaWidget } from "@semblia/react";

export function Testimonials() {
  return <SembliaWidget project="acme" widget="widget_123" />;
}`}</CodeBlock>

      <DocH2>Embed a form</DocH2>
      <CodeBlock>{`import { SembliaForm } from "@semblia/react";

export function FeedbackForm() {
  return <SembliaForm project="acme" form="customer-feedback" />;
}`}</CodeBlock>
      <DocP>
        Embedded forms submit from your page&apos;s origin — add it under{" "}
        <Code>Settings → Security → Allowed origins</Code> first (see the
        Embeds guide).
      </DocP>

      <DocH2>Props</DocH2>
      <DocList
        items={[
          <>
            <Code>SembliaWidget</Code>: <Code>project</Code>,{" "}
            <Code>widget</Code>, optional <Code>apiBase</Code>,{" "}
            <Code>className</Code>, <Code>style</Code>, <Code>onLoad</Code>,{" "}
            <Code>onError</Code>.
          </>,
          <>
            <Code>SembliaForm</Code>: <Code>project</Code>, <Code>form</Code>,
            optional <Code>title</Code>, <Code>className</Code>,{" "}
            <Code>style</Code>, <Code>onLoad</Code>, <Code>onError</Code>.
          </>,
        ]}
      />
      <DocP>
        <Code>onLoad</Code>/<Code>onError</Code> are wired to the
        runtime&apos;s <Code>semblia:*</Code> DOM events. Both components are
        client components (<Code>&quot;use client&quot;</Code> built in),
        render their custom element on the server, and inject the CDN script
        once per page no matter how many embeds you render.
      </DocP>
    </article>
  );
}
