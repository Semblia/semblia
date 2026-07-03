"use client";

import * as React from "react";
import { PlusIcon, TrashIcon, GlobeIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomSocialLink, PlatformKey, SocialLinks } from "./normalize";

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  placeholder: string;
  patterns: string[];
  icon: React.ReactNode;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    key: "twitter",
    label: "Twitter / X",
    placeholder: "https://x.com/yourhandle",
    patterns: ["x.com", "twitter.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/yourname",
    patterns: ["linkedin.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    key: "github",
    label: "GitHub",
    placeholder: "https://github.com/yourname",
    patterns: ["github.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourchannel",
    patterns: ["youtube.com", "youtu.be"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourhandle",
    patterns: ["instagram.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.882 0 1.441 1.441 0 0 1 2.882 0z" />
      </svg>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/yourpage",
    patterns: ["facebook.com", "fb.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

function validateSocialUrl(url: string, patterns: string[]): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const matches = patterns.some((p) => host === p || host.endsWith(`.${p}`));
    if (!matches) return `URL must be on ${patterns.join(" or ")}`;
    return null;
  } catch {
    return "Enter a valid URL (e.g. https://…)";
  }
}

function getSocialDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function validateCustomProfileUrl(link: CustomSocialLink): string | null {
  if (!link.profileUrl) return null;
  if (!link.platformUrl) return "Set the platform URL first";
  const domain = getSocialDomain(link.platformUrl);
  if (!domain) return "Platform URL is invalid";
  return validateSocialUrl(link.profileUrl, [domain]);
}

const EMPTY_CUSTOM_LINK: CustomSocialLink = {
  platformName: "",
  platformUrl: "",
  profileUrl: "",
};

const CUSTOM_LINK_SIGNATURE_SEPARATOR = "\u001f";

function customLinkSignature(link: CustomSocialLink): string {
  return [link.platformName, link.platformUrl, link.profileUrl].join(
    CUSTOM_LINK_SIGNATURE_SEPARATOR,
  );
}

function takeStoredKey(
  keysBySignature: Map<string, string[]>,
  signature: string,
): string | undefined {
  return keysBySignature.get(signature)?.shift();
}

function reconcileCustomLinkKeys(
  previousLinks: CustomSocialLink[],
  previousKeys: string[],
  nextLinks: CustomSocialLink[],
  keySeq: React.MutableRefObject<number>,
): string[] {
  const keysBySignature = new Map<string, string[]>();
  previousLinks.forEach((link, index) => {
    const key = previousKeys[index];
    if (!key) return;
    const signature = customLinkSignature(link);
    keysBySignature.set(signature, [
      ...(keysBySignature.get(signature) ?? []),
      key,
    ]);
  });

  return nextLinks.map((link, index) => {
    const signature = customLinkSignature(link);
    return (
      takeStoredKey(keysBySignature, signature) ??
      previousKeys[index] ??
      `c${keySeq.current++}`
    );
  });
}

function useCustomLinkKeys(links: CustomSocialLink[]) {
  const keySeq = React.useRef(links.length);
  const previousLinksRef = React.useRef(links);
  const [keys, setKeys] = React.useState<string[]>(() =>
    links.map((_, i) => `c${i}`),
  );

  React.useEffect(() => {
    setKeys((prev) =>
      reconcileCustomLinkKeys(previousLinksRef.current, prev, links, keySeq),
    );
    previousLinksRef.current = links;
  }, [links]);

  const addKey = React.useCallback(() => {
    setKeys((current) => [...current, `c${keySeq.current++}`]);
  }, []);

  const removeKey = React.useCallback((idx: number) => {
    setKeys((current) => current.filter((_, i) => i !== idx));
  }, []);

  return { addKey, keys, removeKey };
}

function PreconfiguredSocialField({
  config,
  value,
  onChange,
}: {
  config: PlatformConfig;
  value: string;
  onChange: (v: string) => void;
}) {
  const error = validateSocialUrl(value, config.patterns);
  const hasError = !!error && value.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
          <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
            {config.icon}
          </span>
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          type="url"
          className={cn(
            "h-8 flex-1 text-[13px]",
            hasError &&
              "border-destructive/60 focus-visible:ring-destructive/30",
          )}
          aria-label={config.label}
        />
      </div>
      {hasError && (
        <p className="pl-[3.75rem] text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}

function CustomLinksEditor({
  links,
  onChange,
}: {
  links: CustomSocialLink[];
  onChange: (v: CustomSocialLink[]) => void;
}) {
  const { addKey, keys, removeKey } = useCustomLinkKeys(links);

  function update(idx: number, patch: Partial<CustomSocialLink>) {
    onChange(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function remove(idx: number) {
    removeKey(idx);
    onChange(links.filter((_, i) => i !== idx));
  }

  function add() {
    addKey();
    onChange([...links, EMPTY_CUSTOM_LINK]);
  }

  return (
    <div className="space-y-3">
      {links.map((link, idx) => {
        const domain = getSocialDomain(link.platformUrl);
        const faviconUrl = domain
          ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
          : null;
        const profileError = validateCustomProfileUrl(link);
        const hasProfileError = !!profileError && link.profileUrl.length > 0;

        return (
          <div
            key={keys[idx] ?? idx}
            className="relative space-y-2.5 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                {faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faviconUrl}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 rounded-[2px]"
                  />
                ) : (
                  <GlobeIcon className="size-3.5 text-muted-foreground" />
                )}
              </span>
              <Input
                value={link.platformName}
                onChange={(e) => update(idx, { platformName: e.target.value })}
                placeholder="Platform name (e.g. Dribbble)"
                className="h-7 flex-1 text-[12.5px]"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${link.platformName || "custom link"}`}
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
            <Input
              value={link.platformUrl}
              onChange={(e) => update(idx, { platformUrl: e.target.value })}
              placeholder="Platform URL (e.g. https://dribbble.com)"
              type="url"
              className="h-7 text-[12.5px]"
            />
            <Input
              value={link.profileUrl}
              onChange={(e) => update(idx, { profileUrl: e.target.value })}
              placeholder="Your profile link"
              type="url"
              className={cn(
                "h-7 text-[12.5px]",
                hasProfileError &&
                  "border-destructive/60 focus-visible:ring-destructive/30",
              )}
            />
            {hasProfileError && (
              <p className="text-[11px] text-destructive">{profileError}</p>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={add}
      >
        <PlusIcon className="size-3.5" /> Add custom link
      </Button>
    </div>
  );
}

export function SocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLinks;
  onChange: (v: SocialLinks) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {PLATFORM_CONFIGS.map((cfg) => (
          <PreconfiguredSocialField
            key={cfg.key}
            config={cfg}
            value={value[cfg.key] ?? ""}
            onChange={(url) =>
              onChange({ ...value, [cfg.key]: url || undefined })
            }
          />
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[11px] font-medium text-muted-foreground">
            Other platforms
          </span>
        </div>
      </div>

      <CustomLinksEditor
        links={value.custom ?? []}
        onChange={(custom) => onChange({ ...value, custom })}
      />
    </div>
  );
}
