"use client";

/**
 * KeysClient — every API key this project has issued.
 *
 * One flat, full-bleed list. The page used to bucket rows into fixed
 * Publishable/Secret sections, each with its own blurb and its own create
 * button — three create entry points on one screen, and a status filter that
 * left half-empty sections standing with filler copy. The kind is now a row
 * fact (icon + descriptor) and a filter pill, the list is one column that
 * reads straight down, and the single create affordance is the header menu.
 *
 *   • `useDataState` owns the state ladder, so a failed request can no longer
 *     render "No API keys" and invite a duplicate of a key that already exists
 *   • rotating from a row shows the new secret exactly once
 *   • one badge per row: kind is the descriptor, status is the badge
 */

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { EyeIcon, KeyIcon, LockKeyIcon, PlusIcon } from "@phosphor-icons/react";
import type { V2ApiKeyDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataList,
  EmptyState,
  FilterPills,
  GhostList,
  NoResults,
  useDataState,
} from "@/components/shared";
import { developerKeyNewPath, developerKeyPath } from "@/lib/routes";
import { useApiKeysList, useRevokeApiKey, useRotateApiKey } from "@/hooks/api";
import { KeyListShell, useKeyList } from "../access-keys/key-list-shell";
import { KeyRow } from "../access-keys/key-row";
import { RotatedKeyDialog } from "../access-keys/rotated-key-dialog";

type ApiKeyType = "PUBLISHABLE" | "SECRET";
type KindFilter = "all" | ApiKeyType;

function newKeyHref(slug: string, type: ApiKeyType) {
  return `${developerKeyNewPath(slug)}?type=${type}`;
}

const KIND: Record<
  ApiKeyType,
  { label: string; icon: typeof EyeIcon; descriptor: string }
> = {
  PUBLISHABLE: {
    label: "Publishable",
    icon: EyeIcon,
    descriptor: "Publishable · safe in browser code",
  },
  SECRET: {
    label: "Secret",
    icon: LockKeyIcon,
    descriptor: "Secret · server-side only",
  },
};

function kindMeta(keyType: string) {
  return (
    KIND[keyType as ApiKeyType] ?? {
      label: "API",
      icon: KeyIcon,
      descriptor: keyType,
    }
  );
}

export function KeysClient({ slug }: { slug: string }) {
  const query = useApiKeysList(slug);
  const revokeMutation = useRevokeApiKey(slug);
  const rotateMutation = useRotateApiKey(slug);

  const entries = React.useMemo(() => query.data ?? [], [query.data]);
  const list = useKeyList(entries);
  const [kind, setKind] = React.useState<KindFilter>("all");

  const visible = React.useMemo(
    () =>
      kind === "all"
        ? list.visible
        : list.visible.filter((row) => row.entry.keyType === kind),
    [kind, list.visible],
  );

  const state = useDataState(query, {
    count: visible.length,
    filtered: list.isFiltered || kind !== "all",
  });

  const [rotated, setRotated] = React.useState<string | null>(null);
  const busy = revokeMutation.isPending || rotateMutation.isPending;

  const handleRevoke = (entry: V2ApiKeyDTO) => {
    revokeMutation.mutate(entry.id, {
      onSuccess: () => toast.success(`Revoked “${entry.name}”`),
      onError: () => toast.error("Couldn't revoke the key. Try again."),
    });
  };

  const handleRotate = (entry: V2ApiKeyDTO) => {
    rotateMutation.mutate(entry.id, {
      onSuccess: (result) => {
        const secret = result.secret ?? result.key ?? null;
        if (secret) {
          setRotated(secret);
          return;
        }
        // The rotation happened server-side, so saying "failed" would be false.
        // Say exactly what the owner now has to do about it.
        toast.warning(
          "The key was rotated but Semblia didn't receive the new secret. Rotate it again to get one you can copy.",
        );
      },
      onError: () => toast.error("Couldn't rotate the key. Try again."),
    });
  };

  const clearAll = () => {
    list.clear();
    setKind("all");
  };

  return (
    <>
      <KeyListShell
        title="API keys"
        resource="API keys"
        state={state}
        list={list}
        searchPlaceholder="Search keys"
        actions={<NewKeyMenu slug={slug} />}
        toolbarExtra={
          <FilterPills<KindFilter>
            aria-label="Filter by key kind"
            options={[
              { id: "all", label: "All kinds" },
              { id: "PUBLISHABLE", label: "Publishable" },
              { id: "SECRET", label: "Secret" },
            ]}
            value={kind}
            onChange={setKind}
            size="sm"
          />
        }
        empty={<KeysFirstRun slug={slug} />}
        filteredEmpty={
          <NoResults
            title={
              list.search
                ? `No key matches “${list.search}”`
                : "No keys match the current view"
            }
            description="Search matches a key's name, prefix, and last four characters."
            action={
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={clearAll}
              >
                Show all keys
              </Button>
            }
          />
        }
      >
        <DataList aria-label="API keys">
          {visible.map((row) => {
            const meta = kindMeta(row.entry.keyType);
            return (
              <KeyRow
                key={row.entry.id}
                row={row}
                icon={meta.icon}
                kindLabel="API key"
                descriptor={meta.descriptor}
                detailHref={developerKeyPath(slug, row.entry.id)}
                busy={busy}
                onRotate={() => handleRotate(row.entry)}
                onRevoke={() => handleRevoke(row.entry)}
              />
            );
          })}
        </DataList>
      </KeyListShell>

      <RotatedKeyDialog
        plaintext={rotated}
        onDismiss={() => {
          setRotated(null);
          // Drop the plaintext from the mutation cache too, so the only copy
          // left anywhere is the one the owner pasted into their secret store.
          rotateMutation.reset();
        }}
      />
    </>
  );
}

/** Page-header action: pick which kind of key to mint. */
function NewKeyMenu({ slug }: { slug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="tactile shrink-0 gap-1.5 text-xs">
          <PlusIcon className="size-3.5" weight="bold" aria-hidden />
          New key
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem asChild className="gap-2 text-xs">
          <Link href={newKeyHref(slug, "PUBLISHABLE")}>
            <EyeIcon className="size-3.5" weight="bold" aria-hidden />
            Publishable key
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 text-xs">
          <Link href={newKeyHref(slug, "SECRET")}>
            <LockKeyIcon className="size-3.5" weight="bold" aria-hidden />
            Secret key
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function KeysFirstRun({ slug }: { slug: string }) {
  return (
    <EmptyState
      icon={KeyIcon}
      title="No API keys"
      description="Publishable keys are read-only and safe in browser code; secret keys carry the scopes you grant and stay on your server."
      preview={<GhostList rows={3} leading="square" />}
      action={
        <>
          <Button asChild size="sm" className="tactile gap-1.5 text-xs">
            <Link href={newKeyHref(slug, "SECRET")}>
              <LockKeyIcon className="size-3.5" weight="bold" aria-hidden />
              Create secret key
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
          >
            <Link href={newKeyHref(slug, "PUBLISHABLE")}>
              <EyeIcon className="size-3.5" weight="bold" aria-hidden />
              Create publishable key
            </Link>
          </Button>
        </>
      }
    />
  );
}
