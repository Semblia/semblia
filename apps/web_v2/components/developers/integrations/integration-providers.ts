import type { V2IntegrationProvider } from "@workspace/types";
import {
  SlackIcon,
  NotionIcon,
  LinearIcon,
  GithubIcon,
  type BrandIcon,
} from "./provider-icons";

export interface ProviderConfigField {
  key: string;
  label: string;
  placeholder: string;
  helper?: string;
}

export interface ProviderSpec {
  id: V2IntegrationProvider;
  label: string;
  icon: BrandIcon;
  /** Short description shown on the connect picker. */
  blurb: string;
  /** Destination config fields the user fills when connecting. */
  fields: ProviderConfigField[];
  /**
   * `true` when only one of the listed fields is required (Notion's
   * page-vs-data-source choice). Otherwise every field is required.
   */
  oneOf?: boolean;
  /** Human-readable summary of where exports land, for the row subtitle. */
  summarize: (config: Record<string, unknown> | null) => string | null;
}

function str(config: Record<string, unknown> | null, key: string): string {
  const value = config?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export const PROVIDERS: ProviderSpec[] = [
  {
    id: "SLACK",
    label: "Slack",
    icon: SlackIcon,
    blurb: "Post new responses to a Slack channel.",
    fields: [
      {
        key: "channelId",
        label: "Channel ID",
        placeholder: "C0123456789",
        helper:
          "Open the channel in Slack → channel name → About → copy the ID at the bottom.",
      },
    ],
    summarize: (config) => {
      const id = str(config, "channelId");
      return id ? `#${id}` : null;
    },
  },
  {
    id: "NOTION",
    label: "Notion",
    icon: NotionIcon,
    blurb: "Append responses to a Notion page or database.",
    oneOf: true,
    fields: [
      {
        key: "parentPageId",
        label: "Parent page ID",
        placeholder: "e.g. 1a2b3c4d5e6f7890abcd1234ef567890",
      },
      {
        key: "dataSourceId",
        label: "Data source ID",
        placeholder: "Database / data source id",
        helper:
          "Provide a parent page or a database — one is required. The 32-character ID is in the page or database URL.",
      },
    ],
    summarize: (config) => {
      const page = str(config, "parentPageId");
      const ds = str(config, "dataSourceId");
      if (ds) return `Data source ${ds.slice(0, 8)}`;
      if (page) return `Page ${page.slice(0, 8)}`;
      return null;
    },
  },
  {
    id: "LINEAR",
    label: "Linear",
    icon: LinearIcon,
    blurb: "Create Linear issues from responses.",
    fields: [
      {
        key: "teamId",
        label: "Team ID",
        placeholder: "e.g. ENG",
        helper:
          "New issues land in this team. Find it in Linear under Settings → Teams.",
      },
    ],
    summarize: (config) => {
      const id = str(config, "teamId");
      return id ? `Team ${id.slice(0, 8)}` : null;
    },
  },
  {
    id: "GITHUB",
    label: "GitHub",
    icon: GithubIcon,
    blurb: "Open GitHub issues from responses.",
    fields: [
      {
        key: "owner",
        label: "Owner",
        placeholder: "org-or-user",
        helper: "The org or user that owns the repository.",
      },
      {
        key: "repo",
        label: "Repository",
        placeholder: "repo-name",
        helper: "Issues are opened in this repository.",
      },
    ],
    summarize: (config) => {
      const owner = str(config, "owner");
      const repo = str(config, "repo");
      return owner && repo ? `${owner}/${repo}` : null;
    },
  },
];

export function getProviderSpec(id: V2IntegrationProvider): ProviderSpec {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

/** Validate filled config against a provider's field requirements. */
export function isProviderConfigValid(
  spec: ProviderSpec,
  config: Record<string, string>,
): boolean {
  const filled = (key: string) => (config[key] ?? "").trim().length > 0;
  if (spec.oneOf) {
    return spec.fields.some((f) => filled(f.key));
  }
  return spec.fields.every((f) => filled(f.key));
}

/** Drop empty values so the API only receives provided config keys. */
export function cleanConfig(
  config: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value.trim()) out[key] = value.trim();
  }
  return out;
}
