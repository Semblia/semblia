"use client";

/**
 * ProjectCreateClient — the only project-creation form in the product.
 *
 * It used to be built out of the *sign-in shell's* components: `AuthField`
 * hand-rolls a raw `<input>` with its own `focus:ring-brand/15`, and
 * `AuthPrimaryBtn` hand-rolls a raw `<button>` without `ink-raised`. The result
 * was the one surface in the dashboard with a different focus ring, firing on
 * mouse click rather than keyboard focus, and the one primary CTA without the
 * house material. It is now `ui/label` + `ui/input` + `ui/button`.
 *
 * The bigger repair is that the form no longer offers a submit the API will
 * refuse. Three refusals were reachable and none of them was pre-checked:
 *
 *   • **Plan limit.** The API answers a create over the cap with a flat 403,
 *     surfaced raw in a toast. On the Free plan (limit 1) that was the default
 *     experience of the second project.
 *   • **Reserved address.** The slug is derived from the name, and a project
 *     named "Settings" derives a slug the API permanently reserves.
 *   • **Duplicate address.** "Acme" and "acme" derive the same slug. The user
 *     never typed a slug, so the server's "Project slug already exists" named a
 *     concept absent from the screen and offered no remedy.
 *
 * The first two are checked before submit. The third is checked against the
 * projects already loaded (best effort — the server stays the authority) and,
 * when the server does refuse, the refusal lands on the *name* field with a
 * stated remedy instead of as raw API text in a toast.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { isReservedProjectSlug } from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DefinitionList,
  PageBody,
  PageHeader,
  Section,
  SectionStack,
} from "@/components/shared";
import { useCreateProject, useProjectsList } from "@/hooks/api";
import { useSiteMetadata } from "@/hooks/use-site-metadata";
import { hostnameFromUrl } from "@/lib/favicon";
import {
  getDefaultProjectCollectionUrl,
  slugifyProjectName,
} from "@/lib/project-utils";
import { accountBillingPath, homePath, projectPath } from "@/lib/routes";
import { ProjectAvatar } from "./project-avatar";
import { useProjectLimit } from "./project-limit";

const NAME_MAX_LENGTH = 48;

export function ProjectCreateClient() {
  const router = useRouter();
  const createProject = useCreateProject();
  const limit = useProjectLimit();

  const [name, setName] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [serverNameError, setServerNameError] = React.useState<string | null>(
    null,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const { metadata, loading: metaLoading } = useSiteMetadata(websiteUrl);
  const host = hostnameFromUrl(websiteUrl);

  // Already cached by the projects home in the common case, so this is usually
  // free. It only ever *adds* a pre-check; a failure leaves the server as the
  // sole authority, exactly as before.
  const knownProjects = useProjectsList({ pageSize: 100 });
  const takenSlugs = React.useMemo(
    () => new Set((knownProjects.data?.items ?? []).map((p) => p.slug)),
    [knownProjects.data],
  );

  const trimmedName = name.trim();
  const slug = trimmedName ? slugifyProjectName(trimmedName) : "";
  const nameError =
    serverNameError ?? localNameError(trimmedName, slug, takenSlugs, submitted);

  /**
   * The submit button is only ever disabled for a reason the screen already
   * states: the plan limit (rendered above it, with a route to billing), a
   * name the address rules reject (rendered under the field), or a create
   * already in flight.
   *
   * An *empty* name is deliberately not one of them. Disabling on it made the
   * page open with an inert primary CTA and no explanation — and, because the
   * form could then never be submitted while the name was blank, the
   * "Give the project a name." message was unreachable. Pressing submit now
   * surfaces that message on the field it belongs to.
   */
  const blockedReason = limit.atLimit ? limit.reason : nameError;
  const canSubmit = !blockedReason && !createProject.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setServerNameError(null);
    setFormError(null);
    // Re-validate as if submitted: `nameError` above is still the pre-submit
    // value on this render, which hides the empty-name case.
    if (!canSubmit || localNameError(trimmedName, slug, takenSlugs, true)) {
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        name: trimmedName,
        slug,
        websiteUrl: websiteUrl.trim() || undefined,
        // Seed the brand from the site's own theme colour and description so a
        // new project starts pre-branded rather than blank.
        brandColorPrimary: metadata?.themeColor ?? undefined,
        shortDescription: metadata?.description ?? undefined,
      });
      toast.success("Project created");
      router.push(projectPath(project.slug));
    } catch (error) {
      const refusal = describeCreateFailure(error, slug);
      if (refusal.field === "name") setServerNameError(refusal.message);
      else setFormError(refusal.message);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="New project"
        actions={
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link href={homePath()}>
              <ArrowLeftIcon className="size-3.5" weight="bold" aria-hidden />
              Back to projects
            </Link>
          </Button>
        }
      />

      <PageBody className="grid min-h-0 items-start gap-10 overflow-y-auto lg:grid-cols-[minmax(0,32rem)_minmax(0,18rem)]">
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={createProject.isPending}
        >
          <Section
            title="Project details"
            description="Start with the name your customers recognise. Collection forms, widgets, and trust settings are all tuned inside the project afterwards."
          >
            <div className="space-y-5">
              <Field
                id="project-name"
                label="Project name"
                value={name}
                onChange={(next) => {
                  setName(next);
                  setServerNameError(null);
                }}
                placeholder="Acme"
                maxLength={NAME_MAX_LENGTH}
                autoComplete="organization"
                error={nameError}
                hint={
                  slug && !nameError
                    ? `Public address: ${slug}`
                    : `Up to ${NAME_MAX_LENGTH} characters.`
                }
              />

              <Field
                id="project-website"
                label="Website"
                // Deliberately not `type="url"`: the site preview below accepts
                // a bare host, and a native URL input would block submit on the
                // very value the page had just validated on screen.
                inputMode="url"
                value={websiteUrl}
                onChange={setWebsiteUrl}
                placeholder="acme.com"
                autoComplete="url"
                hint="Optional. Used to set the project icon and brand colour."
              />

              {limit.atLimit && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {limit.reason}{" "}
                  <Link
                    href={accountBillingPath()}
                    className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    See plans
                  </Link>
                </p>
              )}

              {/* Feedback caused by an action inside a region belongs to that
                  region, not to a toast that disappears. */}
              {formError && (
                <p
                  role="alert"
                  className="text-xs leading-relaxed text-destructive"
                >
                  {formError}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={!canSubmit}>
                  {createProject.isPending
                    ? "Creating project…"
                    : "Create project"}
                </Button>
              </div>
            </div>
          </Section>
        </form>

        <aside className="min-w-0">
          <SectionStack>
            {host && (
              <Section title="Detected site" density="tight">
                <DetectedSite
                  host={host}
                  websiteUrl={websiteUrl}
                  siteName={metadata?.siteName ?? null}
                  themeColor={metadata?.themeColor ?? null}
                  loading={metaLoading}
                  resolved={metadata !== null}
                />
              </Section>
            )}

            <Section
              title="What creating this sets up"
              description="Both are ready the moment the project exists."
              density="tight"
              divided={Boolean(host)}
            >
              <DefinitionList
                items={[
                  {
                    term: "Hosted collection page",
                    value: slug ? (
                      <span
                        className="block truncate"
                        title={getDefaultProjectCollectionUrl(slug)}
                      >
                        {getDefaultProjectCollectionUrl(slug)}
                      </span>
                    ) : (
                      // No name, no address. A placeholder host styled like a
                      // real value is placeholder text dressed as data.
                      "Named after your project"
                    ),
                    wide: true,
                  },
                  {
                    term: "Review queue",
                    value: "Every submission waits for your approval",
                    wide: true,
                  },
                ]}
              />
              {slug && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  The final address is issued by Semblia when the project is
                  created and can differ from this preview.
                </p>
              )}
            </Section>
          </SectionStack>
        </aside>
      </PageBody>
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────

/**
 * The in-app form field the dashboard was missing. `ui/input` carries the
 * canonical amber `focus-visible` ring and the `aria-invalid` treatment; all
 * this adds is the label, the wired error slot, and the description plumbing.
 */
function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  ...input
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
} & Omit<React.ComponentProps<"input">, "id" | "value" | "onChange">) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-[11px] leading-relaxed text-destructive"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={`${id}-hint`}
            className="text-[11px] leading-relaxed text-muted-foreground"
          >
            {hint}
          </p>
        )
      )}
    </div>
  );
}

// ── Detected site ────────────────────────────────────────────────────────────

/**
 * `useSiteMetadata` collapses every failure into `null`, so a blocked,
 * unreachable, or icon-less site was indistinguishable from a resolved one and
 * the panel promised "We'll use this as your icon" either way — for an icon the
 * product may never show. Three states are now distinct: reading, resolved, and
 * couldn't read.
 */
function DetectedSite({
  host,
  websiteUrl,
  siteName,
  themeColor,
  loading,
  resolved,
}: {
  host: string;
  websiteUrl: string;
  siteName: string | null;
  themeColor: string | null;
  loading: boolean;
  resolved: boolean;
}) {
  const status = loading
    ? "Reading this site…"
    : resolved
      ? "Its icon and colour will be used for this project"
      : "Couldn't read this site — set the icon later in Branding";

  return (
    <div className="flex items-center gap-3">
      <ProjectAvatar
        name={siteName ?? host}
        websiteUrl={websiteUrl}
        brandColor={themeColor}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-xs font-medium text-foreground"
          title={host}
        >
          {siteName ?? host}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {status}
        </p>
      </div>
      {themeColor && (
        <span
          className="size-5 shrink-0 rounded-full border border-border/60"
          style={{ backgroundColor: themeColor }}
          title={`Brand colour ${themeColor}`}
          aria-hidden
        />
      )}
    </div>
  );
}

// ── Validation ───────────────────────────────────────────────────────────────

function localNameError(
  trimmedName: string,
  slug: string,
  takenSlugs: Set<string>,
  submitted: boolean,
): string | null {
  if (!trimmedName) {
    return submitted ? "Give the project a name." : null;
  }
  if (isReservedProjectSlug(slug)) {
    return `“${slug}” is a reserved Semblia address. Pick a different name.`;
  }
  if (takenSlugs.has(slug)) {
    return `Another project already uses the address “${slug}”. Pick a different name.`;
  }
  return null;
}

/**
 * Turns an API refusal into copy a person can act on. The raw message is never
 * shown: it names server-side concepts ("slug") that have no field on this
 * screen, and carries the response body.
 */
function describeCreateFailure(
  error: unknown,
  slug: string,
): { field?: "name"; message: string } {
  const raw = error instanceof Error ? error.message : "";

  if (raw.includes("slug already exists")) {
    return {
      field: "name",
      message: `Another project already uses the address “${slug}”. Pick a different name.`,
    };
  }
  if (raw.includes("Project limit reached")) {
    return {
      message:
        "Your plan's project limit is already in use. Upgrade your plan to add another project.",
    };
  }
  if (raw.includes("reserved")) {
    return {
      field: "name",
      message: `“${slug}” is a reserved Semblia address. Pick a different name.`,
    };
  }
  return {
    message:
      "Couldn't create this project. Nothing was saved — try again, and if it keeps failing, contact support.",
  };
}
