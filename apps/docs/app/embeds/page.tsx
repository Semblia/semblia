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
  title: "Embeds",
};

export default function EmbedsPage() {
  return (
    <article>
      <DocTitle>Embeds</DocTitle>
      <DocLead>
        Widgets and forms embed with one script tag each. The runtime is
        evergreen — served from Semblia&apos;s CDN, always in step with the
        API, never bundled into your build.
      </DocLead>

      <DocH2>Widget embed</DocH2>
      <DocP>
        Copy the snippet from your widget&apos;s Share panel. It defines the{" "}
        <Code>&lt;semblia-widget&gt;</Code> element and renders your published
        widget in a shadow root:
      </DocP>
      <CodeBlock>{`<script type="module" src="https://widgets.semblia.com/embed.js" async></script>
<semblia-widget project="your-project" widget="widget_id"></semblia-widget>`}</CodeBlock>
      <DocList
        items={[
          <>
            <Code>project</Code> — your project slug, exactly as in the
            snippet.
          </>,
          <>
            <Code>widget</Code> — the widget id from the Share panel.
          </>,
          <>
            <Code>api-base</Code> — optional API origin override; defaults to
            production.
          </>,
        ]}
      />
      <DocP>
        The element fires <Code>semblia:widget-load</Code> when content
        mounts and <Code>semblia:widget-error</Code> if loading fails.
      </DocP>

      <DocH2>Form embed</DocH2>
      <DocP>
        Copy the snippet from your form&apos;s share panel. It defines{" "}
        <Code>&lt;semblia-form&gt;</Code>, which renders the form in an
        iframe and sizes it to the content automatically:
      </DocP>
      <CodeBlock>{`<script src="https://forms.semblia.com/embed.js" async></script>
<semblia-form project="your-project" form="form-slug"></semblia-form>`}</CodeBlock>
      <DocList
        items={[
          <>
            <Code>project</Code> — your project slug.
          </>,
          <>
            <Code>form</Code> — the form slug from its share panel.
          </>,
          <>
            <Code>title</Code> — optional accessible title for the iframe.
          </>,
        ]}
      />
      <DocP>
        The element fires <Code>semblia:form-load</Code> and{" "}
        <Code>semblia:form-error</Code> on the host element.
      </DocP>

      <DocH2>Trusted origins — required for embedded forms</DocH2>
      <DocP>
        Embedded forms submit from <em>your</em> page&apos;s origin, and the
        API only accepts submissions from origins your project trusts. Before
        embedding a form, add your site&apos;s origin (for example{" "}
        <Code>https://www.example.com</Code>) under{" "}
        <Code>Settings → Security → Allowed origins</Code> in the app.
        Submissions from unlisted origins are rejected.
      </DocP>
      <DocP>
        Hosted forms and widgets don&apos;t need this — hosted forms serve
        from your project&apos;s own subdomain, and widgets only read
        published content.
      </DocP>

      <DocH2>In React</DocH2>
      <DocP>
        Use <Code>@semblia/react</Code> instead of hand-placing the script —
        same runtime, typed props, script injection handled once per page.
      </DocP>
    </article>
  );
}
