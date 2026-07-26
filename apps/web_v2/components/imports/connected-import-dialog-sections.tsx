import {
  ArrowLeftIcon,
  CheckCircleIcon,
  LinkSimpleIcon,
  PlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { ConnectionRow } from "@/components/imports/connected-import-connection-row";
import { resourceNoun } from "@/components/imports/connected-import-helpers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { useConnectedImportDialogController } from "./connected-import-dialog-controller";
import { cn } from "@/lib/utils";

type Controller = ReturnType<typeof useConnectedImportDialogController>;

export function ConnectedImportHeader({
  source,
  isBusy,
  onClose,
}: {
  source: V2ImportCatalogSourceDTO;
  isBusy: boolean;
  onClose: () => void;
}) {
  return (
    <header className="border-b border-border pb-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2"
        disabled={isBusy}
        onClick={onClose}
      >
        <ArrowLeftIcon aria-hidden />
        Back to sources
      </Button>
      <div className="mt-4 flex items-start gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground">
          <LinkSimpleIcon className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="connected-import-workflow-title"
            className="text-base font-semibold tracking-tight"
          >
            Connect {source.label}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose what Semblia may read, then review imported proof before it
            is published.
          </p>
        </div>
      </div>
    </header>
  );
}

export function ConnectedImportContent({
  controller,
  slug,
  source,
  onClose,
}: {
  controller: Controller;
  slug: string;
  source: V2ImportCatalogSourceDTO;
  onClose: () => void;
}) {
  if (controller.connectionsQuery.isPending) return <ConnectionLoading />;
  if (controller.connectionsQuery.isError)
    return <ConnectionLoadError controller={controller} />;
  return (
    <>
      {controller.sourceConnections.length > 0 ? (
        <ConnectedDestinations
          controller={controller}
          slug={slug}
          source={source}
        />
      ) : null}
      {controller.showSetup ? (
        <ConnectionSetupForm
          controller={controller}
          source={source}
          onClose={onClose}
        />
      ) : (
        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={controller.createConnection.isPending}
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      )}
    </>
  );
}

function ConnectionLoading() {
  return (
    <div
      className="flex min-h-24 items-center justify-center gap-2 border-y border-border text-sm text-muted-foreground"
      aria-live="polite"
    >
      <Spinner />
      Loading connections
    </div>
  );
}

function ConnectionLoadError({ controller }: { controller: Controller }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 border-y border-border py-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="flex items-start gap-2">
        <WarningCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        Connections could not load.
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit text-foreground"
        onClick={() => void controller.connectionsQuery.refetch()}
        disabled={controller.connectionsQuery.isFetching}
      >
        {controller.connectionsQuery.isFetching ? <Spinner /> : null}
        Try again
      </Button>
    </div>
  );
}

function ConnectedDestinations({
  controller,
  slug,
  source,
}: {
  controller: Controller;
  slug: string;
  source: V2ImportCatalogSourceDTO;
}) {
  return (
    <section aria-labelledby="connected-imports-title">
      <div className="flex items-center justify-between gap-3 pb-2">
        <div>
          <h3 id="connected-imports-title" className="text-xs font-medium">
            Connected destinations
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each destination imports into this project only.
          </p>
        </div>
        {!controller.isAdding ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => controller.setIsAdding(true)}
          >
            <PlusIcon aria-hidden />
            Add destination
          </Button>
        ) : null}
      </div>
      <div className="divide-y divide-border border-y border-border">
        {controller.sourceConnections.map((connection) => (
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

function ConnectionSetupForm({
  controller,
  source,
  onClose,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
  onClose: () => void;
}) {
  return (
    <form
      onSubmit={controller.submitConnection}
      aria-busy={controller.createConnection.isPending}
      className={cn(
        "space-y-4",
        controller.sourceConnections.length > 0 &&
          "border-t border-border pt-4",
      )}
    >
      <AuthorizationStep controller={controller} source={source} />
      {controller.isAuthorized ? (
        <ResourceSelectionStep controller={controller} source={source} />
      ) : null}
      {controller.isAuthorized && controller.resources.length > 0 ? (
        <ImportBehaviorStep controller={controller} source={source} />
      ) : null}
      {controller.createConnection.isError ? (
        <p role="alert" className="text-xs text-destructive">
          This connection could not be created. Check the selected source and
          try again.
        </p>
      ) : null}
      <ConnectionSetupFooter
        controller={controller}
        source={source}
        onClose={onClose}
      />
    </form>
  );
}

function AuthorizationStep({
  controller,
  source,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
}) {
  return (
    <section
      aria-labelledby="authorize-import-source-title"
      aria-busy={controller.isAuthorizing}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <h3
            id="authorize-import-source-title"
            className="text-xs font-medium"
          >
            1. Authorize read access
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Credentials stay in Clerk. Semblia never stores provider access
            tokens or publishes imported proof automatically.
          </p>
        </div>
        <AuthorizationStatus controller={controller} source={source} />
      </div>
      {controller.requiredScopes.length > 0 ? (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="w-fit cursor-pointer rounded outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30">
            View requested permissions
          </summary>
          <ul
            className="mt-2 flex flex-wrap gap-1.5"
            aria-label="Requested permissions"
          >
            {controller.requiredScopes.map((scope) => (
              <li
                key={scope}
                className="max-w-full rounded-md border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] break-all"
              >
                {scope}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {controller.setupUnavailable ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          This source does not have a supported Clerk OAuth strategy.
        </p>
      ) : controller.authorizationError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {controller.authorizationError}
        </p>
      ) : null}
    </section>
  );
}

function AuthorizationStatus({
  controller,
  source,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
}) {
  if (!controller.isClerkLoaded)
    return (
      <span className="flex min-h-8 items-center gap-2 text-xs text-muted-foreground">
        <Spinner />
        Checking access
      </span>
    );
  if (!controller.hasUser)
    return (
      <span className="text-xs font-medium text-destructive">
        Sign in to authorize this source.
      </span>
    );
  if (controller.isAuthorized)
    return (
      <span className="inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-success">
        <CheckCircleIcon className="size-4" weight="fill" aria-hidden />
        Authorized
      </span>
    );
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void controller.authorizeProvider()}
      disabled={controller.setupUnavailable || controller.isAuthorizing}
    >
      {controller.isAuthorizing ? (
        <>
          <Spinner /> Opening {source.label}
        </>
      ) : (
        <>
          {controller.accountToReauthorize ? "Reauthorize" : "Authorize"}{" "}
          {source.label}
        </>
      )}
    </Button>
  );
}

function ResourceSelectionStep({
  controller,
  source,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
}) {
  const noun = resourceNoun(source.key);
  if (controller.resourcesQuery.isPending && controller.resources.length === 0)
    return (
      <ResourceStep
        source={source}
        noun={noun}
        controller={controller}
        content="loading"
      />
    );
  if (controller.resourcesQuery.isError && controller.resources.length === 0)
    return (
      <ResourceStep
        source={source}
        noun={noun}
        controller={controller}
        content="error"
      />
    );
  if (controller.resources.length === 0)
    return (
      <ResourceStep
        source={source}
        noun={noun}
        controller={controller}
        content="empty"
      />
    );
  return (
    <ResourceStep
      source={source}
      noun={noun}
      controller={controller}
      content="select"
    />
  );
}

function ResourceStep({
  controller,
  source,
  noun,
  content,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
  noun: string;
  content: "loading" | "error" | "empty" | "select";
}) {
  return (
    <section
      aria-labelledby="choose-import-source-title"
      aria-busy={controller.resourcesQuery.isFetching}
      className="border-t border-border pt-4"
    >
      <h3 id="choose-import-source-title" className="text-xs font-medium">
        2. Choose a {noun}
      </h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Semblia imports only from the {noun} you select here.
      </p>
      <ResourceStepContent
        controller={controller}
        source={source}
        noun={noun}
        content={content}
      />
    </section>
  );
}

function ResourceStepContent({
  controller,
  source,
  noun,
  content,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
  noun: string;
  content: "loading" | "error" | "empty" | "select";
}) {
  if (content === "loading")
    return (
      <div
        className="mt-3 flex min-h-10 items-center gap-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <Spinner />
        Loading available {noun}s
      </div>
    );
  if (content === "error")
    return (
      <div role="alert" className="mt-3 space-y-2">
        <p className="text-xs text-destructive">
          Available {noun}s could not load. Refresh provider access and try
          again.
        </p>
        <AuthorizeAgain controller={controller} source={source} />
      </div>
    );
  if (content === "empty")
    return <EmptyResources controller={controller} noun={noun} />;
  return <ResourceSelect controller={controller} source={source} noun={noun} />;
}

function AuthorizeAgain({
  controller,
  source,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void controller.authorizeProvider()}
      disabled={controller.isAuthorizing}
    >
      {controller.isAuthorizing ? (
        <>
          <Spinner /> Opening {source.label}
        </>
      ) : (
        `Reauthorize ${source.label}`
      )}
    </Button>
  );
}

function EmptyResources({
  controller,
  noun,
}: {
  controller: Controller;
  noun: string;
}) {
  const hasNextPage = controller.nextCursor !== null;
  const nextCursor = controller.nextCursor ?? undefined;
  return (
    <div className="mt-3 border-y border-border py-3">
      <p className="text-xs leading-5 text-muted-foreground">
        {hasNextPage
          ? `No importable ${noun}s were on this page.`
          : `No importable ${noun}s were found for this account.`}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1 -ml-2"
        onClick={() => {
          if (nextCursor) controller.setResourceCursor(nextCursor);
          else void controller.authorizeProvider();
        }}
        disabled={
          hasNextPage
            ? controller.resourcesQuery.isFetching
            : controller.isAuthorizing
        }
      >
        {hasNextPage && controller.resourcesQuery.isFetching ? (
          <>
            <Spinner /> Loading more
          </>
        ) : controller.isAuthorizing ? (
          <>
            <Spinner /> Opening authorization
          </>
        ) : hasNextPage ? (
          "Continue to next page"
        ) : (
          "Refresh authorization"
        )}
      </Button>
    </div>
  );
}

function ResourceSelect({
  controller,
  source,
  noun,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
  noun: string;
}) {
  return (
    <div className="mt-3 space-y-2">
      <label
        htmlFor="connected-import-resource"
        className="text-xs font-medium"
      >
        {source.label} {noun}
      </label>
      <Select
        value={controller.selectedResourceId}
        onValueChange={controller.setSelectedResourceId}
      >
        <SelectTrigger id="connected-import-resource" className="h-9 w-full">
          <SelectValue placeholder={`Select a ${noun}`} />
        </SelectTrigger>
        <SelectContent position="popper" className="max-w-[calc(100vw-3rem)]">
          {controller.resources.map((resource) => (
            <SelectItem key={resource.id} value={resource.id}>
              <span className="max-w-[28rem] truncate">{resource.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {controller.resourceCursor && controller.resourcesQuery.isPending ? (
        <span className="flex min-h-7 items-center gap-2 text-xs text-muted-foreground">
          <Spinner /> Loading more
        </span>
      ) : controller.nextCursor ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() =>
            controller.setResourceCursor(controller.nextCursor ?? undefined)
          }
          disabled={controller.resourcesQuery.isFetching}
        >
          {controller.resourcesQuery.isFetching ? (
            <>
              <Spinner /> Loading more
            </>
          ) : (
            "Load more"
          )}
        </Button>
      ) : null}
      {controller.resourcesQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-destructive"
        >
          <span>More results could not load.</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-destructive hover:text-destructive"
            onClick={() => void controller.resourcesQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ImportBehaviorStep({
  controller,
  source,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
}) {
  return (
    <section
      aria-labelledby="import-behavior-title"
      className="space-y-3 border-t border-border pt-4"
    >
      <div>
        <h3 id="import-behavior-title" className="text-xs font-medium">
          3. Confirm import behavior
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          All imported proof enters the private review queue.
        </p>
      </div>
      <div className="flex min-h-11 items-center justify-between gap-4 border-y border-border py-2.5">
        <span>
          <label
            htmlFor={controller.autoSyncId}
            className="block text-xs font-medium"
          >
            Automatic sync
          </label>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Periodically check this source for new proof.
          </span>
        </span>
        <Switch
          id={controller.autoSyncId}
          checked={controller.autoSyncEnabled}
          onCheckedChange={controller.setAutoSyncEnabled}
          aria-label="Enable automatic sync"
        />
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5">
        <Checkbox
          id={controller.rightsId}
          checked={controller.rightsConfirmed}
          onCheckedChange={(checked) =>
            controller.setRightsConfirmed(checked === true)
          }
        />
        <label htmlFor={controller.rightsId}>
          I confirm I have the right to import and use proof from this{" "}
          {resourceNoun(source.key)}.
        </label>
      </div>
    </section>
  );
}

function ConnectionSetupFooter({
  controller,
  source,
  onClose,
}: {
  controller: Controller;
  source: V2ImportCatalogSourceDTO;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
      {controller.sourceConnections.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          disabled={controller.createConnection.isPending}
          onClick={() => controller.setIsAdding(false)}
        >
          Back
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          disabled={controller.createConnection.isPending}
          onClick={onClose}
        >
          Cancel
        </Button>
      )}
      <Button
        type="submit"
        disabled={
          !controller.isAuthorized ||
          !controller.selectedResource ||
          !controller.rightsConfirmed ||
          controller.createConnection.isPending
        }
      >
        {controller.createConnection.isPending ? (
          <>
            <Spinner /> Connecting
          </>
        ) : (
          `Connect ${source.label}`
        )}
      </Button>
    </div>
  );
}
