"use client";

import * as React from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { ConnectionRow } from "@/components/imports/connected-import-connection-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type DirectMode,
  useDirectImportDialogController,
} from "./direct-import-dialog-controller";

type DirectImportDialogProps = {
  slug: string;
  source: V2ImportCatalogSourceDTO | null;
  mode: DirectMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DirectImportDialog(
  props: DirectImportDialogProps,
): React.ReactNode {
  if (!props.source || !props.open) return null;
  return (
    <DirectImportDialogContent
      key={props.source.key}
      {...props}
      source={props.source}
    />
  );
}

function DirectImportDialogContent(
  props: Omit<DirectImportDialogProps, "source" | "open"> & {
    source: V2ImportCatalogSourceDTO;
  },
): React.ReactNode {
  const controller = useDirectImportDialogController(props);
  const hostHint = props.source.publicHosts.join(", ");

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
        disabled={controller.isPending}
        onClick={controller.handleClose}
      >
        <ArrowLeftIcon aria-hidden />
        Back to sources
      </Button>
      <header className="border-b border-border pb-5">
        <h2 id="direct-import-title" className="text-lg font-semibold">
          {props.mode === "MIGRATION" ? "Migrate" : "Import from"}{" "}
          {props.source.label}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {controller.isManual
            ? "Add proof you already have permission to use."
            : `Semblia will read public structured proof from this source${hostHint ? ` (${hostHint})` : ""}.`}
        </p>
      </header>

      <form onSubmit={controller.handleSubmit} className="space-y-5 pt-6">
        {controller.isManual ? (
          <ManualImportFields controller={controller} />
        ) : null}
        <SourceUrlField controller={controller} />
        {!controller.isManual ? (
          <AutoSyncControl controller={controller} />
        ) : null}
        <RightsConfirmation controller={controller} />
        <ImportError controller={controller} />
        <ImportSubmitActions controller={controller} />
        <ExistingConnections
          controller={controller}
          source={props.source}
          slug={props.slug}
        />
      </form>
    </section>
  );
}

type DirectImportController = ReturnType<
  typeof useDirectImportDialogController
>;

function ManualImportFields({
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

function SourceUrlField({
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

function AutoSyncControl({
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

function RightsConfirmation({
  controller,
}: {
  controller: DirectImportController;
}): React.ReactNode {
  return (
    // A dialog is already a bounded surface; a bordered box inside it is the
    // nesting the surface law forbids. One tint step plus a hairline carries
    // the same "read this before you continue" weight.
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

function ImportError({
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

function ImportSubmitActions({
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

function ExistingConnections({
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
