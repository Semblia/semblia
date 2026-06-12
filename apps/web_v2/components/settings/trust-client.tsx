"use client";

import * as React from "react";
import { toast } from "sonner";
import type { V2ProjectDTO } from "@workspace/types";
import {
  PlusIcon,
  XIcon,
  ShieldCheckIcon,
  KeyIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBody, SettingsSection } from "@/components/shared";
import {
  useAllowedOrigins,
  useReplaceAllowedOrigins,
  useGenerateSigningSecret,
  useClearSigningSecret,
} from "@/hooks/api";
import { RevealPanel } from "@/components/developers/shared/reveal-step";
import { validateAllowedOrigin } from "./shared/normalize";

function AllowedOriginsCard({ slug }: { slug: string }) {
  const allowedOrigins = useAllowedOrigins(slug);
  const replaceMut = useReplaceAllowedOrigins(slug);
  const [draft, setDraft] = React.useState<string[] | null>(null);
  const [input, setInput] = React.useState("");
  const [inputError, setInputError] = React.useState<string | null>(null);

  const baseline = allowedOrigins.data ?? [];
  const current = draft ?? baseline;
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(baseline);

  function addOrigin() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const err = validateAllowedOrigin(trimmed);
    if (err) {
      setInputError(err);
      return;
    }
    if (current.includes(trimmed)) {
      setInputError("Already added");
      return;
    }
    setInputError(null);
    setDraft([...current, trimmed]);
    setInput("");
  }

  function removeOrigin(origin: string) {
    setDraft(current.filter((o) => o !== origin));
  }

  async function handleSave() {
    if (draft === null) return;
    try {
      await replaceMut.mutateAsync(draft);
      toast.success("Allowed origins updated");
      setDraft(null);
    } catch {
      toast.error("Failed to save allowed origins");
    }
  }

  function handleDiscard() {
    setDraft(null);
    setInput("");
    setInputError(null);
  }

  return (
    <SettingsSection
      id="allowed-origins"
      title="Allowed origins"
      description="Browsers submitting from these origins are trusted by the public submit endpoint. Add the production domain plus any staging/local origins."
    >
      {allowedOrigins.isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-3">
            {current.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No origins yet. Add one below to enable browser submits.
              </p>
            ) : (
              current.map((origin) => (
                <span
                  key={origin}
                  className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 font-mono text-[11.5px]"
                >
                  {origin}
                  <button
                    type="button"
                    onClick={() => removeOrigin(origin)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${origin}`}
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-origin">Add origin</Label>
            <div className="flex gap-2">
              <Input
                id="t-origin"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (inputError) setInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOrigin();
                  }
                }}
                placeholder="https://example.com"
                className={cn(
                  "font-mono",
                  inputError &&
                    "border-destructive/60 focus-visible:ring-destructive/30",
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOrigin}
                className="shrink-0 gap-1.5"
                disabled={!input.trim()}
              >
                <PlusIcon className="size-3.5" /> Add
              </Button>
            </div>
            {inputError ? (
              <p className="text-[11px] text-destructive">{inputError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Must be a full <code className="font-mono">scheme://host</code>{" "}
                with no path. https only (except http on localhost).
              </p>
            )}
          </div>

          {dirty && (
            <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={replaceMut.isPending}
                className="text-muted-foreground"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={replaceMut.isPending}
                className="tactile"
              >
                {replaceMut.isPending ? "Saving…" : "Save origins"}
              </Button>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  );
}

function SigningSecretCard({ slug }: { slug: string }) {
  const generateMut = useGenerateSigningSecret(slug);
  const clearMut = useClearSigningSecret(slug);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(
    null,
  );
  const [confirmClear, setConfirmClear] = React.useState(false);

  async function handleGenerate() {
    try {
      const result = await generateMut.mutateAsync();
      setRevealedSecret(result.secret);
      toast.success("Signing secret generated");
    } catch {
      toast.error("Failed to generate signing secret");
    }
  }

  async function handleClear() {
    try {
      await clearMut.mutateAsync();
      toast.success("Signing secret cleared");
      setConfirmClear(false);
    } catch {
      toast.error("Failed to clear signing secret");
    }
  }

  return (
    <SettingsSection
      id="signing-secret"
      title="Server-submit signing secret"
      description="HMAC-signs requests from your backend so the public submit endpoint trusts them without an Origin header. Required for server-to-server feedback collection."
    >
      {revealedSecret ? (
        <div className="rounded-lg border border-border p-4">
          <RevealPanel
            plaintext={revealedSecret}
            onDone={() => setRevealedSecret(null)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/50">
              <KeyIcon
                className="size-3.5 text-muted-foreground"
                weight="bold"
                aria-hidden
              />
            </span>
            <div className="text-[13px] leading-relaxed">
              <p className="font-medium text-foreground">Signing secret</p>
              <p className="text-muted-foreground">
                Generating creates a new secret. If one already exists, this
                rotates it — the previous value stops working immediately.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {confirmClear ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                  disabled={clearMut.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  disabled={clearMut.isPending}
                >
                  {clearMut.isPending ? "Clearing…" : "Confirm clear"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                  disabled={generateMut.isPending}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generateMut.isPending}
                  className="tactile"
                >
                  {generateMut.isPending ? "Generating…" : "Generate / Rotate"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}

export function TrustClient({ project }: { project: V2ProjectDTO }) {
  return (
    <PageBody padding="default">
      <div className="space-y-8 pb-8">
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background">
              <ShieldCheckIcon
                className="size-3.5 text-muted-foreground"
                weight="bold"
                aria-hidden
              />
            </span>
            <div className="text-[12.5px] leading-relaxed text-muted-foreground">
              Semblia accepts public submissions via two trust paths: a browser
              <em> Origin </em>
              check (for embedded widgets) and an
              <em> HMAC signature </em>
              (for backend integrations). Configure both here.
            </div>
          </div>
        </div>

        <AllowedOriginsCard slug={project.slug} />
        <SigningSecretCard slug={project.slug} />
      </div>
    </PageBody>
  );
}
