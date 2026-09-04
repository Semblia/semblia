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
  title: "API & agent keys",
};

export default function ApiKeysPage() {
  return (
    <article>
      <DocTitle>API &amp; agent keys</DocTitle>
      <DocLead>
        Two credential kinds, one authentication mechanism. Create both in
        your project&apos;s Developers section; send either as a bearer
        token.
      </DocLead>

      <DocH2>The two kinds</DocH2>
      <DocList
        items={[
          <>
            <strong>API keys</strong> (<Code>tsk_live_…</Code>) — for your own
            integrations and servers.
          </>,
          <>
            <strong>Agent keys</strong> (<Code>tag_live_…</Code>) — for AI
            agents and tools acting on your project, scoped to the
            capabilities you grant under Agent access.
          </>,
        ]}
      />
      <DocP>
        Both authenticate the same way; the project decides what each key can
        do. The secret is shown once at creation — store it like a password.
      </DocP>

      <DocH2>Authentication</DocH2>
      <CodeBlock>{`curl https://api.semblia.com/v2/projects \\
  -H "Authorization: Bearer tsk_live_xxxxxxxx.your-secret"`}</CodeBlock>
      <DocP>
        All endpoints live under <Code>https://api.semblia.com/v2</Code> and
        return a <Code>{`{ success, data, meta }`}</Code> envelope; errors
        carry <Code>{`{ error: { code, message } }`}</Code>. From Node, use{" "}
        <Code>@semblia/node</Code> instead of raw fetch.
      </DocP>

      <DocH2>MCP server</DocH2>
      <DocP>
        Semblia ships an MCP server so agents can read and curate responses
        through their own tools. Configure it with an agent key:
      </DocP>
      <CodeBlock>{`SEMBLIA_API_BASE_URL=https://api.semblia.com/v2
SEMBLIA_AGENT_KEY=tag_live_xxxxxxxx.your-secret`}</CodeBlock>

      <DocH2>Good hygiene</DocH2>
      <DocList
        items={[
          "One key per integration, named for what uses it.",
          "Grant agent keys the narrowest capabilities that work.",
          "Revoke keys you no longer use from the same panel.",
          "Keys never belong in client-side code — embeds don't need them.",
        ]}
      />
    </article>
  );
}
