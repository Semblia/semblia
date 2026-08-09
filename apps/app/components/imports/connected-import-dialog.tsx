"use client";

import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { useConnectedImportDialogController } from "@/components/imports/connected-import-dialog-controller";
import {
  ConnectedImportContent,
  ConnectedImportHeader,
} from "@/components/imports/connected-import-dialog-sections";

type ConnectedImportDialogProps = {
  slug: string;
  source: V2ImportCatalogSourceDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConnectedImportDialog({
  slug,
  source,
  open,
  onOpenChange,
}: ConnectedImportDialogProps) {
  const controller = useConnectedImportDialogController({
    slug,
    source,
    open,
  });

  if (!source || !open) return null;

  return (
    <section
      aria-labelledby="connected-import-workflow-title"
      aria-busy={controller.connectionsQuery.isPending}
      className="bg-background"
    >
      <ConnectedImportHeader
        source={source}
        isBusy={
          controller.createConnection.isPending || controller.isAuthorizing
        }
        onClose={() => onOpenChange(false)}
      />
      <div className="space-y-6 py-6">
        <ConnectedImportContent
          controller={controller}
          slug={slug}
          source={source}
          onClose={() => onOpenChange(false)}
        />
      </div>
    </section>
  );
}

export { ConnectionRow } from "@/components/imports/connected-import-connection-row";
