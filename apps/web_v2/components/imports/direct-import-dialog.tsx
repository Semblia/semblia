"use client";

import * as React from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateManualImport,
  useCreateMigrationImport,
  useCreatePublicUrlImport,
} from "@/hooks/api";

type DirectMode = "MANUAL" | "PUBLIC_URL" | "MIGRATION";

export function DirectImportDialog({
  slug,
  source,
  mode,
  open,
  onOpenChange,
}: {
  slug: string;
  source: V2ImportCatalogSourceDTO | null;
  mode: DirectMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const manual = useCreateManualImport(slug);
  const publicUrl = useCreatePublicUrlImport(slug);
  const migration = useCreateMigrationImport(slug);
  const [text, setText] = React.useState("");
  const [authorName, setAuthorName] = React.useState("");
  const [authorRole, setAuthorRole] = React.useState("");
  const [authorCompany, setAuthorCompany] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [rating, setRating] = React.useState("");
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setText("");
    setAuthorName("");
    setAuthorRole("");
    setAuthorCompany("");
    setSourceUrl("");
    setRating("");
    setRightsConfirmed(false);
    manual.reset();
    publicUrl.reset();
    migration.reset();
  }, [open, source?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!source || !open) return null;

  const active =
    mode === "MANUAL" ? manual : mode === "MIGRATION" ? migration : publicUrl;
  const isManual = mode === "MANUAL";
  const hostHint = source.publicHosts.join(", ");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!source || !rightsConfirmed || active.isPending) return;
    try {
      if (mode === "MANUAL") {
        const ratingValue = rating ? Number(rating) : undefined;
        await manual.mutateAsync({
          sourceKey: source.key,
          text,
          authorName: authorName.trim() || undefined,
          authorRole: authorRole.trim() || undefined,
          authorCompany: authorCompany.trim() || undefined,
          ratingValue,
          ratingScale: ratingValue === undefined ? undefined : 5,
          sourceUrl: sourceUrl.trim() || undefined,
          rightsConfirmed: true,
        });
      } else {
        const body = {
          sourceKey: source.key,
          sourceUrl: sourceUrl.trim(),
          rightsConfirmed: true as const,
        };
        if (mode === "MIGRATION") await migration.mutateAsync(body);
        else await publicUrl.mutateAsync(body);
      }
      toast.success(
        mode === "MIGRATION" ? "Migration queued" : "Import queued",
        { description: "Imported proof will stay private and pending review." },
      );
      onOpenChange(false);
    } catch {
      // The bounded server error is rendered inline.
    }
  }

  return (
    <section
      aria-labelledby="direct-import-title"
      className="mx-auto w-full max-w-2xl py-2"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 mb-6"
        disabled={active.isPending}
        onClick={() => onOpenChange(false)}
      >
        <ArrowLeftIcon aria-hidden />
        Back to sources
      </Button>
      <header className="border-b border-border pb-5">
        <h2 id="direct-import-title" className="text-lg font-semibold">
          {mode === "MIGRATION" ? "Migrate" : "Import from"} {source.label}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {isManual
            ? "Add proof you already have permission to use."
            : `Semblia will read public structured proof from this source${hostHint ? ` (${hostHint})` : ""}.`}
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5 pt-6">
        {isManual ? (
          <>
            <Field label="Proof" htmlFor="import-proof-text" required>
              <Textarea
                id="import-proof-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={10_000}
                placeholder="Paste the testimonial, review, or recommendation"
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Author name" htmlFor="import-author-name">
                <Input
                  id="import-author-name"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  maxLength={255}
                />
              </Field>
              <Field label="Rating out of 5" htmlFor="import-rating">
                <Input
                  id="import-rating"
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                />
              </Field>
              <Field label="Role" htmlFor="import-author-role">
                <Input
                  id="import-author-role"
                  value={authorRole}
                  onChange={(event) => setAuthorRole(event.target.value)}
                  maxLength={255}
                />
              </Field>
              <Field label="Company" htmlFor="import-author-company">
                <Input
                  id="import-author-company"
                  value={authorCompany}
                  onChange={(event) => setAuthorCompany(event.target.value)}
                  maxLength={255}
                />
              </Field>
            </div>
          </>
        ) : null}

        <Field
          label={isManual ? "Original source URL (optional)" : "Public URL"}
          htmlFor="import-source-url"
          required={!isManual}
        >
          <Input
            id="import-source-url"
            type="url"
            inputMode="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://"
            maxLength={1000}
            required={!isManual}
          />
        </Field>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5">
          <Checkbox
            id="direct-import-rights"
            checked={rightsConfirmed}
            onCheckedChange={(checked) => setRightsConfirmed(checked === true)}
          />
          <label htmlFor="direct-import-rights">
            I confirm I have the right to import and use this proof. It will
            remain private until reviewed and published.
          </label>
        </div>

        {active.isError ? (
          <p role="alert" className="text-xs text-destructive">
            The import could not be queued. Check the source and try again.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={active.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              active.isPending ||
              !rightsConfirmed ||
              (isManual ? !text.trim() : !sourceUrl.trim())
            }
          >
            {active.isPending
              ? "Queuing…"
              : mode === "MIGRATION"
                ? "Start migration"
                : "Import proof"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
