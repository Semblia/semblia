"use client";

/**
 * The direct-import form pieces — manual text proof, public-URL reads, and
 * wall migrations share one controller and one field vocabulary.
 *
 * These used to live inside a pseudo-dialog that replaced the page body with
 * no scrim (the composition defect the 2026-08-02 collection IA removes).
 * They are now composable pieces: each import method page instantiates
 * `useDirectImportDialogController` itself — which lets the web page derive
 * the source from the pasted URL — and lays out only the fields its method
 * needs, inside its own `<form onSubmit={controller.handleSubmit}>`.
 */

import * as React from "react";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { ConnectionRow } from "@/components/imports/connected-import-connection-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDirectImportDialogController } from "./direct-import-dialog-controller";

export type DirectImportController = ReturnType<
  typeof useDirectImportDialogController
>;

export function ManualImportFields({
  controller,
}: {
  controller: DirectImportController;
}): React.ReactNode {
  return (
    <>
      <Field label="Proof" htmlFor="import-proof-text" required>
        <Textarea
          id="import-proof-text"
          value={controller.text}
          onChange={controller.handleTextChange}
          maxLength={10_000}
          placeholder="Paste the testimonial, review, or recommendation"
          required
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Author name" htmlFor="import-author-name">
          <Input
            id="import-author-name"
            value={controller.authorName}
            onChange={controller.handleAuthorNameChange}
            maxLength={255}
          />
        </Field>
        <Field label="Rating out of 5" htmlFor="import-rating">
          <>
            <Input
              id="import-rating"
              type="number"
              min={0}
              max={5}
              step="any"
              value={controller.rating}
              onChange={controller.handleRatingChange}
              aria-invalid={Boolean(controller.ratingError)}
              aria-describedby={
                controller.ratingError ? "import-rating-error" : undefined
              }
            />
            {controller.ratingError ? (
              <p
                id="import-rating-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {controller.ratingError}
              </p>
            ) : null}
          </>
        </Field>
        <Field label="Role" htmlFor="import-author-role">
          <Input
            id="import-author-role"
            value={controller.authorRole}
            onChange={controller.handleAuthorRoleChange}
            maxLength={255}
          />
        </Field>
        <Field label="Company" htmlFor="import-author-company">
          <Input
            id="import-author-company"
            value={controller.authorCompany}
            onChange={controller.handleAuthorCompanyChange}
            maxLength={255}
          />
        </Field>
      </div>
    </>
  );
}

export function SourceUrlField({
  controller,
}: {
  controller: DirectImportController;
}): React.ReactNode {
  return (
    <Field
      label={
        controller.isManual ? "Original source URL (optional)" : "Public URL"
      }
      htmlFor="import-source-url"
      required={!controller.isManual}
    >
      <Input
        id="import-source-url"
        type="url"
        inputMode="url"
        value={controller.sourceUrl}
        onChange={controller.handleSourceUrlChange}
        placeholder="https://"
        maxLength={1000}
        required={!controller.isManual}
      />
    </Field>
  );
}

export function AutoSyncControl({
  controller,
}: {
  controller: DirectImportController;
}): React.ReactNode {
  return (
    <div className="flex items-center justify-between gap-4 border-y border-border/70 py-3">
      <div>
        <label
          htmlFor="direct-import-auto-sync"
          className="text-sm font-medium"
        >
          Keep this source in sync every 6 hours
        </label>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Semblia will import newly available public proof for review.
        </p>
      </div>
      <Switch
        id="direct-import-auto-sync"
        checked={controller.autoSyncEnabled}
        onCheckedChange={controller.handleAutoSyncChange}
        disabled={controller.isPending}
      />
    </div>
  );
}

export function RightsConfirmation({
  controller,
}: {
  controller: DirectImportController;
}): React.ReactNode {
  return (
    // A bounded form column is already a quiet surface; one tint step plus a
    // hairline carries the "read this before you continue" weight without
    // nesting another bordered box.
    <div className="flex items-start gap-3 border-t border-border bg-muted/25 px-3 py-3 text-xs leading-5">
      <Checkbox
        id="direct-import-rights"
        checked={controller.rightsConfirmed}
        onCheckedChange={controller.handleRightsChange}
      />
      <label htmlFor="direct-import-rights">
        I confirm I have the right to import and use this proof. It will remain
        private until reviewed and published.
      </label>
    </div>
  );
}

export function ImportError({
  controller,
}: {
  controller: DirectImportController;
}): React.ReactNode {
  if (!controller.errorMessage) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {controller.errorMessage}
    </p>
  );
}

export function ImportSubmitActions({
  controller,
}: {
  controller: DirectImportController;
}): React.ReactNode {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="ghost"
        disabled={controller.isPending}
        onClick={controller.handleClose}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={controller.submitDisabled}>
        {controller.submitLabel}
      </Button>
    </div>
  );
}

export function ExistingConnections({
  controller,
  source,
  slug,
}: {
  controller: DirectImportController;
  source: V2ImportCatalogSourceDTO;
  slug: string;
}): React.ReactNode {
  if (controller.existingConnections.length === 0) return null;
  return (
    <section
      className="border-t border-border pt-5"
      aria-labelledby="existing-connections-title"
    >
      <h3 id="existing-connections-title" className="text-sm font-medium">
        Existing connections
      </h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Manage sources Semblia is already checking for this import type.
      </p>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {controller.existingConnections.map((connection) => (
          <ConnectionRow
            key={connection.id}
            projectId={slug}
            sourceLabel={source.label}
            connection={connection}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Says what the pasted link looks like and offers the fix, rather than
 * retargeting the import behind the user's back. Shared by the two methods
 * that take a URL for a source the user already named.
 */
export function HostMismatchNotice({
  detected,
  onSwitch,
}: {
  detected: V2ImportCatalogSourceDTO;
  onSwitch: () => void;
}): React.ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border bg-muted/25 px-3 py-2.5 text-xs">
      <p className="min-w-0 flex-1 leading-5 text-muted-foreground">
        That link looks like {detected.label}.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSwitch}
        className="h-7 text-xs"
      >
        Import as {detected.label}
      </Button>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactNode {
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
