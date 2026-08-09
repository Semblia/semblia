"use client";

import * as React from "react";
import { toast } from "sonner";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import {
  useCreateImportConnection,
  useCreateManualImport,
  useCreateMigrationImport,
  useCreatePublicUrlImport,
  useImportConnections,
} from "@/hooks/api";

export type DirectMode = "MANUAL" | "PUBLIC_URL" | "MIGRATION";
type UrlImportMode = Exclude<DirectMode, "MANUAL">;

type DirectImportDialogControllerInput = {
  slug: string;
  source: V2ImportCatalogSourceDTO;
  mode: DirectMode;
  onOpenChange: (open: boolean) => void;
};

export function useDirectImportDialogController(
  input: DirectImportDialogControllerInput,
) {
  const scope = { slug: input.slug };
  const manual = useCreateManualImport(scope);
  const publicUrl = useCreatePublicUrlImport(scope);
  const migration = useCreateMigrationImport(scope);
  const createConnection = useCreateImportConnection(scope);
  const connectionsQuery = useImportConnections(scope);
  const [text, setText] = React.useState("");
  const [authorName, setAuthorName] = React.useState("");
  const [authorRole, setAuthorRole] = React.useState("");
  const [authorCompany, setAuthorCompany] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [rating, setRating] = React.useState("");
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(false);
  const isManual = input.mode === "MANUAL";
  const isPublicConnectionMode = !isManual && autoSyncEnabled;
  const active = activeMutation({
    mode: input.mode,
    manual,
    migration,
    publicUrl,
  });
  const isPending = active.isPending || createConnection.isPending;
  const existingConnections =
    connectionsQuery.data?.filter(
      (connection) => connection.sourceKey === input.source.key,
    ) ?? [];
  const errorMessage = importErrorMessage({
    isPublicConnectionMode,
    hasError: isPublicConnectionMode
      ? createConnection.isError
      : active.isError,
  });
  const ratingError = isManual ? ratingErrorMessage(rating) : null;
  const submitDisabled =
    isPending ||
    !rightsConfirmed ||
    Boolean(ratingError) ||
    (isManual ? !text.trim() : !sourceUrl.trim());
  const submitLabel = importSubmitLabel({
    isPending,
    isPublicConnectionMode,
    mode: input.mode,
  });

  function handleClose() {
    input.onOpenChange(false);
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
  }

  function handleAuthorNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setAuthorName(event.target.value);
  }

  function handleAuthorRoleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setAuthorRole(event.target.value);
  }

  function handleAuthorCompanyChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setAuthorCompany(event.target.value);
  }

  function handleSourceUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSourceUrl(event.target.value);
  }

  function handleRatingChange(event: React.ChangeEvent<HTMLInputElement>) {
    setRating(event.target.value);
  }

  function handleRightsChange(checked: boolean | "indeterminate") {
    setRightsConfirmed(checked === true);
  }

  function handleAutoSyncChange(checked: boolean) {
    setAutoSyncEnabled(checked);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitDisabled) return;
    try {
      if (input.mode === "MANUAL")
        await submitManualImport({
          manual,
          source: input.source,
          text,
          authorName,
          authorRole,
          authorCompany,
          rating,
          sourceUrl,
        });
      else {
        const mode: UrlImportMode = input.mode;
        await submitUrlImport({
          source: input.source,
          sourceUrl,
          mode,
          isPublicConnectionMode,
          createConnection,
          migration,
          publicUrl,
        });
      }
      toast.success(
        importSuccessTitle({ isPublicConnectionMode, mode: input.mode }),
        {
          description: isPublicConnectionMode
            ? "Semblia will check this source every 6 hours. Imported proof stays private and pending review."
            : "Imported proof will stay private and pending review.",
        },
      );
      handleClose();
    } catch {
      // The bounded server error is rendered inline.
    }
  }

  return {
    text,
    authorName,
    authorRole,
    authorCompany,
    sourceUrl,
    rating,
    rightsConfirmed,
    autoSyncEnabled,
    isManual,
    isPending,
    existingConnections,
    errorMessage,
    ratingError,
    submitDisabled,
    submitLabel,
    handleClose,
    handleTextChange,
    handleAuthorNameChange,
    handleAuthorRoleChange,
    handleAuthorCompanyChange,
    handleSourceUrlChange,
    handleRatingChange,
    handleRightsChange,
    handleAutoSyncChange,
    handleSubmit,
  };
}

function activeMutation(input: {
  mode: DirectMode;
  manual: ReturnType<typeof useCreateManualImport>;
  migration: ReturnType<typeof useCreateMigrationImport>;
  publicUrl: ReturnType<typeof useCreatePublicUrlImport>;
}) {
  if (input.mode === "MANUAL") return input.manual;
  return input.mode === "MIGRATION" ? input.migration : input.publicUrl;
}

async function submitManualImport(input: {
  manual: ReturnType<typeof useCreateManualImport>;
  source: V2ImportCatalogSourceDTO;
  text: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  rating: string;
  sourceUrl: string;
}) {
  const ratingValue = parseRating(input.rating);
  await input.manual.mutateAsync({
    sourceKey: input.source.key,
    text: input.text,
    authorName: input.authorName.trim() || undefined,
    authorRole: input.authorRole.trim() || undefined,
    authorCompany: input.authorCompany.trim() || undefined,
    ratingValue,
    ratingScale: ratingValue === undefined ? undefined : 5,
    sourceUrl: input.sourceUrl.trim() || undefined,
    rightsConfirmed: true,
  });
}

function parseRating(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const rating = Number(trimmed);
  return Number.isFinite(rating) && rating >= 0 && rating <= 5
    ? rating
    : undefined;
}

function ratingErrorMessage(value: string): string | null {
  if (!value.trim() || parseRating(value) !== undefined) return null;
  return "Enter a number from 0 to 5.";
}

async function submitUrlImport(input: {
  source: V2ImportCatalogSourceDTO;
  sourceUrl: string;
  mode: UrlImportMode;
  isPublicConnectionMode: boolean;
  createConnection: ReturnType<typeof useCreateImportConnection>;
  migration: ReturnType<typeof useCreateMigrationImport>;
  publicUrl: ReturnType<typeof useCreatePublicUrlImport>;
}) {
  const body = {
    sourceKey: input.source.key,
    sourceUrl: input.sourceUrl.trim(),
    rightsConfirmed: true as const,
  };
  if (input.isPublicConnectionMode) {
    await input.createConnection.mutateAsync({
      ...body,
      mode: input.mode,
      autoSyncEnabled: true,
    });
    return;
  }
  if (input.mode === "MIGRATION") {
    await input.migration.mutateAsync(body);
    return;
  }
  await input.publicUrl.mutateAsync(body);
}

function importSuccessTitle(input: {
  isPublicConnectionMode: boolean;
  mode: DirectMode;
}) {
  if (input.isPublicConnectionMode) return "Connection created";
  return input.mode === "MIGRATION" ? "Migration queued" : "Import queued";
}

function importErrorMessage(input: {
  isPublicConnectionMode: boolean;
  hasError: boolean;
}) {
  if (!input.hasError) return null;
  return input.isPublicConnectionMode
    ? "The connection could not be created. Check the source and try again."
    : "The import could not be queued. Check the source and try again.";
}

function importSubmitLabel(input: {
  isPending: boolean;
  isPublicConnectionMode: boolean;
  mode: DirectMode;
}) {
  if (input.isPending) return "Queuing…";
  if (input.isPublicConnectionMode) return "Create connection";
  return input.mode === "MIGRATION" ? "Start migration" : "Import proof";
}
