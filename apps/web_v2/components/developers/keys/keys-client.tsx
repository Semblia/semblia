"use client";

/**
 * KeysClient — every API key this project has issued.
 *
 * Restructured onto the shared key system (`components/developers/access-keys`),
 * which this page and `developers/agents` now share instead of maintaining two
 * copies of the same screen:
 *
 *   • `useDataState` owns the state ladder, so a failed request can no longer
 *     render "No API keys" and invite a duplicate of a key that already exists
 *   • the list/grid toggle is gone. Keys are a find-and-act list, not a gallery,
 *     and the card view existed only to give every key a bordered tile
 *   • rotating from a row now shows the new secret. It used to fire the mutation
 *     and discard the response, retiring the old secret and losing the new one
 *   • one badge per row: the publishable/secret distinction is the section it
 *     sits in, not a second pill competing with status
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
  GhostList,
  NoResults,
  Section,
  SectionStack,
  useDataState,
} from "@/components/shared";
import { developerKeyNewPath, developerKeyPath } from "@/lib/routes";
import { useApiKeysList, useRevokeApiKey, useRotateApiKey } from "@/hooks/api";
import { KeyListShell, useKeyList } from "../access-keys/key-list-shell";
import { KeyRow } from "../access-keys/key-row";
import { RotatedKeyDialog } from "../access-keys/rotated-key-dialog";
import type { DescribedKey } from "../access-keys/key-model";

type ApiKeyType = "PUBLISHABLE" | "SECRET";

function newKeyHref(slug: string, type: ApiKeyType) {
  return `${developerKeyNewPath(slug)}?type=${type}`;
}

const KIND: Record<
  ApiKeyType,
  { label: string; icon: typeof EyeIcon; blurb: string }
> = {
  PUBLISHABLE: {
    label: "Publishable",
    icon: EyeIcon,
    blurb:
      "Read-only and safe to ship in browser code. Anyone who views your page can read one.",
  },
  SECRET: {
    label: "Secret",
    icon: LockKeyIcon,
    blurb:
      "Full access on the scopes you grant. Keep these server-side and out of version control.",
  },
};

export function KeysClient({ slug }: { slug: string }) {
  const query = useApiKeysList(slug);
  const revokeMutation = useRevokeApiKey(slug);
  const rotateMutation = useRotateApiKey(slug);

  const entries = React.useMemo(() => query.data ?? [], [query.data]);
  const list = useKeyList(entries);
  const state = useDataState(query, {
    count: list.visible.length,
    filtered: list.isFiltered,
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

  const grouped = React.useMemo(
    () => groupByType(list.visible),
    [list.visible],
  );

  return (
    <>
      <KeyListShell
        title="API keys"
        resource="API keys"
        state={state}
        list={list}
        searchPlaceholder="Search keys"
        actions={<NewKeyMenu slug={slug} />}
        empty={<KeysFirstRun slug={slug} />}
        filteredEmpty={
          <NoResults
            title={
              list.search
                ? `No key matches “${list.search}”`
                : "No keys in that state"
            }
            description="Search matches a key's name, prefix, and last four characters."
            action={
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={list.clear}
              >
                Show all keys
              </Button>
            }
          />
        }
      >
        <SectionStack>
          {(["PUBLISHABLE", "SECRET"] as const).map((type, index) => (
            <KeyTypeSection
              key={type}
              type={type}
              rows={grouped[type]}
              slug={slug}
              busy={busy}
              divided={index > 0}
              onRotate={handleRotate}
              onRevoke={handleRevoke}
            />
          ))}

          {grouped.OTHER.length > 0 && (
            <Section
              title="Other keys"
              description="Semblia issued these with a type this build doesn't group yet. They work exactly as issued."
              divided
            >
              <DataList
                aria-label="Other keys"
                className="border-y border-border"
              >
                {grouped.OTHER.map((row) => (
                  <KeyRow
                    key={row.entry.id}
                    row={row}
                    icon={KeyIcon}
                    kindLabel="API key"
                    descriptor={row.entry.keyType}
                    detailHref={developerKeyPath(slug, row.entry.id)}
                    busy={busy}
                    onRotate={() => handleRotate(row.entry)}
                    onRevoke={() => handleRevoke(row.entry)}
                  />
                ))}
              </DataList>
            </Section>
          )}
        </SectionStack>
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

/**
 * The API returns every key in one response — there is no paginated envelope to
 * read a page/total from, so `DataList` renders no pagination affordance. A
 * project that outgrows one screen of keys will need the API to paginate first.
 */
function groupByType(rows: DescribedKey[]) {
  const grouped = {
    PUBLISHABLE: [] as DescribedKey[],
    SECRET: [] as DescribedKey[],
    OTHER: [] as DescribedKey[],
  };
  for (const row of rows) {
    const bucket =
      row.entry.keyType === "PUBLISHABLE" || row.entry.keyType === "SECRET"
        ? row.entry.keyType
        : "OTHER";
    grouped[bucket].push(row);
  }
  return grouped;
}

function KeyTypeSection({
  type,
  rows,
  slug,
  busy,
  divided,
  onRotate,
  onRevoke,
}: {
  type: ApiKeyType;
  rows: DescribedKey[];
  slug: string;
  busy: boolean;
  divided: boolean;
  onRotate: (entry: V2ApiKeyDTO) => void;
  onRevoke: (entry: V2ApiKeyDTO) => void;
}) {
  const kind = KIND[type];

  return (
    <Section
      title={kind.label}
      description={kind.blurb}
      divided={divided}
      meta={
        rows.length > 0
          ? `${rows.length} ${rows.length === 1 ? "key" : "keys"}`
          : undefined
      }
      actions={
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link href={newKeyHref(slug, type)}>
            <PlusIcon className="size-3.5" weight="bold" aria-hidden />
            New {kind.label.toLowerCase()} key
          </Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          No {kind.label.toLowerCase()} keys match the current view.
        </p>
      ) : (
        <DataList
          aria-label={`${kind.label} keys`}
          className="border-y border-border"
        >
          {rows.map((row) => (
            <KeyRow
              key={row.entry.id}
              row={row}
              icon={kind.icon}
              kindLabel="API key"
              descriptor={`${kind.label} key`}
              detailHref={developerKeyPath(slug, row.entry.id)}
              busy={busy}
              onRotate={() => onRotate(row.entry)}
              onRevoke={() => onRevoke(row.entry)}
            />
          ))}
        </DataList>
      )}
    </Section>
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
      align="start"
      title="No API keys"
      description="An API key lets your own code read and write this project through the Semblia API. Publishable keys are read-only and safe in browser code; secret keys carry the scopes you grant and stay on your server."
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
