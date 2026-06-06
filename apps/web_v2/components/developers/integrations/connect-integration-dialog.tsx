"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateIntegrationConnection } from "@/hooks/api";
import { ProviderConfigFields } from "./integration-connection-item";
import {
  isProviderConfigValid,
  cleanConfig,
  type ProviderSpec,
} from "./integration-providers";

export function ConnectIntegrationDialog({
  slug,
  spec,
  open,
  onOpenChange,
}: {
  slug: string;
  spec: ProviderSpec | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateIntegrationConnection(slug);
  const [draft, setDraft] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) setDraft({});
  }, [open, spec]);

  if (!spec) return null;

  const valid = isProviderConfigValid(spec, draft);

  async function handleSubmit() {
    if (!spec) return;
    try {
      await create.mutateAsync({
        provider: spec.id,
        config: cleanConfig(draft),
      });
      toast.success(`${spec.label} connected`, {
        description: "Responses will now be delivered to this destination.",
      });
      onOpenChange(false);
    } catch {
      // Error state is rendered inline below.
    }
  }

  const Icon = spec.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-foreground">
              <Icon className="size-3.5" />
            </span>
            Connect {spec.label}
          </DialogTitle>
          <DialogDescription>{spec.blurb}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !create.isPending) handleSubmit();
          }}
          className="space-y-4"
        >
          <ProviderConfigFields
            spec={spec}
            config={draft}
            onChange={setDraft}
            idPrefix={`int-connect-${spec.id}`}
          />

          <p className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Tresta authorizes delivery using your connected {spec.label}{" "}
            account. Connect {spec.label} under your account settings if you
            haven&apos;t already.
          </p>

          {create.isError && (
            <p className="text-[11px] text-destructive">
              Could not connect. Check the destination details and try again.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!valid || create.isPending}
            >
              {create.isPending ? "Connecting…" : `Connect ${spec.label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
