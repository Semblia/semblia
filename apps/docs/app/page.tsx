import {
  Code,
  CodeBlock,
  DocH2,
  DocLead,
  DocList,
  DocP,
  DocTitle,
} from "@/components/doc";

export default function QuickstartPage() {
  return (
    <article>
      <DocTitle>Quickstart</DocTitle>
      <DocLead>
        From nothing to a published testimonial in one sitting: create a
        project, collect a response, approve it, and put it on your site.
      </DocLead>

      <DocH2>1. Create a project</DocH2>
      <DocP>
        Sign up at <Code>app.semblia.com</Code> and create a project. The
        project is the container for everything — forms, responses, widgets,
        walls, and credentials all live under it.
      </DocP>

      <DocH2>2. Collect responses</DocH2>
      <DocP>Three ways in, use any or all of them:</DocP>
      <DocList
        items={[
          <>
            <strong>Hosted form</strong> — publish a collection form from the
            Forms section; it serves on your project&apos;s own subdomain and
            needs no code on your site.
          </>,
          <>
            <strong>Request by email</strong> — from Requests, compose a note
            and send your form to a list of addresses. Semblia tracks who
            submitted, and suppression/unsubscribe are handled for you.
          </>,
          <>
            <strong>Import</strong> — bring existing testimonials from
            Testimonial.to, Senja, Famewall, or any CSV/XLSX spreadsheet via
            the Import section.
          </>,
        ]}
      />

      <DocH2>3. Moderate</DocH2>
      <DocP>
        Every submission lands in Responses with its consent recorded.
        Approve what represents you — nothing is published until you do, and
        publishing is refused where consent does not permit it.
      </DocP>

      <DocH2>4. Publish</DocH2>
      <DocP>
        Approved responses can serve three ways: a hosted wall on your
        project&apos;s <Code>walls.semblia.com</Code> subdomain, an embedded
        widget on any site, or an embedded form to keep collecting in place.
        The embed is one script tag:
      </DocP>
      <CodeBlock>{`<script type="module" src="https://widgets.semblia.com/embed.js" async></script>
<semblia-widget project="your-project" widget="widget_id"></semblia-widget>`}</CodeBlock>
      <DocP>
        See the Embeds guide for the trusted-origin requirement and the full
        attribute reference, or the SDK pages if you are in React or Node.
      </DocP>
    </article>
  );
}
