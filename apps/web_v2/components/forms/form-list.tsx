"use client";

/**
 * FormList — the forms surface.
 *
 * The previous build owned its own state ladder:
 *
 *     if (loading) return <Skeleton/>;
 *     if (list.length === 0) return <FormsEmptyState/>;
 *     if (filtered.length === 0) return <FilteredEmpty/>;
 *
 * — with no error branch at all, so a 500 or an expired session rendered
 * "Collect your first response" to an owner who had forms. It also gated the
 * whole toolbar on `!loading && list.length > 0`, which meant the filter pills,
 * the view toggle, and the New form button all vanished exactly while the query
 * they scope was running.
 *
 * Rebuilt on the shared data-surface system:
 *   • `useDataState` derives the state error-first, so "empty inbox after a
 *     failed fetch" is no longer expressible here
 *   • the toolbar is mounted unconditionally; only its counts wait for data
 *   • first-run empty and filtered empty are separate surfaces with separate
 *     copy and separate recovery actions
 *   • cold load renders the skeleton that matches the *active* view, so
 *     switching list/grid doesn't shift the page when rows arrive
 *   • New form is disabled with the reason in place once the plan's form
 *     allowance is spent, instead of failing at the API
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LockKeyIcon, PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type {
  V2FormIntent,
  V2FormSummaryDTO,
  V2ProjectDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageBody,
  FilterPills,
  RefreshingDataBadge,
  ViewToggle,
  DataState,
  DataList,
  ListSkeleton,
  GridSkeleton,
  NoResults,
  useDataState,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useFormsList,
  useCreateForm,
  useDeleteForm,
  useBillingUsage,
} from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { updateForm, saveFormDraft } from "@/lib/semblia-api";
import { accountBillingPath, formStudioPath } from "@/lib/routes";
import { fmtCount } from "@/lib/format";
import { createFormTemplate } from "@workspace/forms-core";
import { FormRow } from "./form-row";
import { FormCard } from "./form-card";
import { FormIntentPicker } from "./form-intent-picker";
import { FormsEmptyState } from "./forms-empty-state";

type Filter = "all" | "live" | "draft" | "closed";

const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Drafts" },
  { id: "closed", label: "Closed" },
];

/** One predicate table so the pills' counts and the filtered list agree. */
const FILTER_PREDICATES: Record<Filter, (f: V2FormSummaryDTO) => boolean> = {
  all: () => true,
  live: (f) => f.status === "PUBLISHED" && f.open,
  draft: (f) => f.status === "DRAFT",
  closed: (f) => f.status === "CLOSED" || (f.status === "PUBLISHED" && !f.open),
};

/**
 * Each description restates its own predicate, so the sentence stays true
 * whatever else is in the project.
 */
const FILTER_MISS: Record<
  Exclude<Filter, "all">,
  { title: string; description: string }
> = {
  live: {
    title: "No live forms",
    description: "Nothing is published and open for responses right now.",
  },
  draft: {
    title: "No draft forms",
    description: "Nothing is sitting unpublished right now.",
  },
  closed: {
    title: "No closed forms",
    description: "Nothing is closed to new responses right now.",
  },
};

/**
 * Grid geometry, shared by the real tiles and the tiles that stand in for them.
 *
 * Capped at three columns. Four made each tile ~285px, which is narrower than
 * the form preview it carries deserves and left a project with one or two forms
 * looking like a mostly-empty page. Four columns is right for a directory of
 * many small things; a handful of rich entities want the width.
 */
const GRID_PAD = "px-4 py-5 sm:px-6";
const GRID_COLS = "grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function parseFilter(searchParams: ReturnType<typeof useSearchParams>): Filter {
  const param = (searchParams.get("status") ?? "all") as Filter;
  return FILTERS.some((f) => f.id === param) ? param : "all";
}

function countByFilter(list: V2FormSummaryDTO[]): Record<Filter, number> {
  return {
    all: list.length,
    live: list.filter(FILTER_PREDICATES.live).length,
    draft: list.filter(FILTER_PREDICATES.draft).length,
    closed: list.filter(FILTER_PREDICATES.closed).length,
  };
}

interface UpdateInput {
  formId: string;
  body: { name?: string; open?: boolean };
}

function useUpdateFormById(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, body }: UpdateInput) => {
      const token = await getToken();
      return updateForm(token, slug, formId, body);
    },
    onSuccess: (data, { formId }) => {
      qc.setQueryData(queryKeys.forms.detail(slug, formId), data);
      qc.invalidateQueries({ queryKey: queryKeys.forms.list(slug) });
    },
  });
}

/** The chosen template + brand facts, stamped onto a fresh intent template. */
function buildSeededDoc(
  intent: V2FormIntent,
  delivery: "hosted" | "embed",
  templateId: string,
  brandColor: V2ProjectDTO["brandColorPrimary"],
  brandName: V2ProjectDTO["name"],
) {
  const seeded = createFormTemplate(intent, delivery);
  return {
    ...seeded,
    templateId,
    brand: {
      ...seeded.brand,
      color: brandColor || seeded.brand.color,
      name: brandName,
    },
  };
}

/** Patch the URL query string in place (null deletes a key). */
function useQueryPatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

/** Create the form, stamp template + brand onto its draft, open the studio. */
function useCreateSeededForm(
  project: V2ProjectDTO,
  setQuery: (patch: Record<string, string | null>) => void,
) {
  const router = useRouter();
  const { getToken } = useAuth();
  const createMutation = useCreateForm(project.slug);

  const handleCreate = React.useCallback(
    async (
      intent: V2FormIntent,
      templateId: string,
      delivery: "hosted" | "embed",
    ) => {
      let created;
      try {
        created = await createMutation.mutateAsync({ intent, delivery });
      } catch {
        // The picker stays open on failure — the user's choices are still
        // there, and nothing was created to clean up.
        toast.error("Couldn't create the form. Nothing was added.");
        return;
      }

      // Stamp the chosen template + brand facts onto the server-seeded draft
      // (draftVersion 1). Best-effort: a failure still leaves a valid form,
      // seeded with the intent's own default template.
      try {
        const doc = buildSeededDoc(
          intent,
          delivery,
          templateId,
          project.brandColorPrimary,
          project.name,
        );
        const token = await getToken();
        await saveFormDraft(token, project.slug, created.id, {
          draft: doc as unknown as Record<string, unknown>,
          expectedVersion: 1,
        });
      } catch {
        toast.warning(
          "Form created, but the template didn't apply. Pick it again in the studio.",
        );
      }

      setQuery({ new: null });
      router.push(`${formStudioPath(project.slug, created.id)}?firstRun=1`);
    },
    [
      createMutation,
      project.slug,
      project.brandColorPrimary,
      project.name,
      setQuery,
      router,
      getToken,
    ],
  );

  return { handleCreate, createPending: createMutation.isPending };
}

interface FormItemActions {
  onDelete: (formId: string) => void;
  onToggleOpen: (formId: string, open: boolean) => void;
  onRename: (formId: string, name: string) => void;
}

/**
 * Row/card actions bound to one project. Each one reports its own failure:
 * a mutation that silently does nothing reads as a broken control.
 */
function useFormItemActions(slug: string): FormItemActions {
  const deleteMutation = useDeleteForm(slug);
  const updateMutation = useUpdateFormById(slug);

  const onDelete = React.useCallback(
    (formId: string) =>
      deleteMutation.mutate(formId, {
        onSuccess: () => toast.success("Form deleted"),
        onError: () => toast.error("Couldn't delete this form."),
      }),
    [deleteMutation],
  );
  const onToggleOpen = React.useCallback(
    (formId: string, open: boolean) =>
      updateMutation.mutate(
        { formId, body: { open: !open } },
        {
          onSuccess: () => toast.success(open ? "Form closed" : "Form open"),
          onError: () =>
            toast.error("Couldn't change whether this form is open."),
        },
      ),
    [updateMutation],
  );
  const onRename = React.useCallback(
    (formId: string, name: string) =>
      updateMutation.mutate(
        { formId, body: { name } },
        { onError: () => toast.error("Couldn't rename this form.") },
      ),
    [updateMutation],
  );

  return React.useMemo(
    () => ({ onDelete, onToggleOpen, onRename }),
    [onDelete, onToggleOpen, onRename],
  );
}

/**
 * The workspace plan caps how many forms can exist. Reading it here is what
 * lets the surface disable New form with the reason attached, rather than
 * offering a button whose only outcome is an API refusal.
 *
 * Deliberately fails open: if the usage query itself fails we don't know the
 * allowance, and blocking a paying owner on a failed side request would be the
 * worse error. Only a *negative* limit is read as "no cap" — the API refuses at
 * `used >= limit`, so a limit of 0 is a real allowance of nothing, not an
 * unknown, and failing open on it would offer a create that must 403.
 */
function useCreateBlockedReason(): React.ReactNode | null {
  const usageQuery = useBillingUsage();
  const usage = usageQuery.data?.forms;

  if (!usage || usage.limit < 0 || usage.used < usage.limit) return null;

  return (
    <>
      {`Plan limit reached — ${fmtCount(usage.used)} of ${fmtCount(usage.limit)} ${
        usage.limit === 1 ? "form" : "forms"
      } in use. `}
      <Link
        href={accountBillingPath()}
        className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Review plan
      </Link>
    </>
  );
}

export function FormList({ project }: { project: V2ProjectDTO }) {
  const searchParams = useSearchParams();
  const setQuery = useQueryPatcher();

  const filter = parseFilter(searchParams);
  const pickerOpen = searchParams.get("new") === "1";

  const listQuery = useFormsList(project.slug);
  const [viewMode, setViewMode] = useViewMode("forms:view", "grid");

  const { handleCreate, createPending } = useCreateSeededForm(
    project,
    setQuery,
  );
  const itemActions = useFormItemActions(project.slug);
  const createBlockedReason = useCreateBlockedReason();

  const list = React.useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const filtered = React.useMemo(
    () => list.filter(FILTER_PREDICATES[filter]),
    [list, filter],
  );
  const counts = listQuery.data ? countByFilter(list) : null;

  const state = useDataState(listQuery, {
    count: filtered.length,
    // A project with no forms at all is a first run, whichever pill happens to
    // be active — the recovery is "create one", not "clear the filter".
    filtered: filter !== "all" && list.length > 0,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Forms"
        description={
          counts
            ? `${fmtCount(counts.all)} ${counts.all === 1 ? "form" : "forms"} · ${fmtCount(counts.live)} live`
            : undefined
        }
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            {createBlockedReason && (
              <span className="max-w-xs text-xs text-muted-foreground">
                {createBlockedReason}
              </span>
            )}
            {/* Blocked-by-plan is a state, not a broken button: it renders as
                a quiet locked chip. Only a transient busy keeps the ink fill. */}
            <Button
              size="sm"
              variant={createBlockedReason !== null ? "outline" : "default"}
              className="gap-1.5 text-xs"
              onClick={() => setQuery({ new: "1" })}
              disabled={createPending || createBlockedReason !== null}
              aria-busy={createPending}
            >
              {createBlockedReason !== null ? (
                <LockKeyIcon className="size-3.5" aria-hidden />
              ) : (
                <PlusIcon className="size-3.5" weight="bold" aria-hidden />
              )}
              New form
            </Button>
          </>
        }
        toolbar={
          /* Mounted unconditionally: the controls that scope the query must not
             disappear while the query runs. Counts stay absent until there is a
             real number to show — a count whose source hasn't arrived is hidden,
             never rendered as 0. */
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <FilterPills<Filter>
              aria-label="Filter forms by status"
              options={FILTERS.map((f) => ({
                id: f.id,
                label: f.label,
                count: counts ? counts[f.id] : null,
              }))}
              value={filter}
              onChange={(next) =>
                setQuery({ status: next === "all" ? null : next })
              }
              size="sm"
            />
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <DataState
          state={state}
          resource="forms"
          skeleton={
            viewMode === "grid" ? (
              <div className={GRID_PAD}>
                <GridSkeleton tiles={4} className={GRID_COLS} />
              </div>
            ) : (
              <ListSkeleton rows={4} leading="square" trailing />
            )
          }
          empty={
            <FormsEmptyState
              onCreate={() => setQuery({ new: "1" })}
              disabledReason={createBlockedReason}
            />
          }
          filteredEmpty={
            <FilteredEmpty
              filter={filter}
              onReset={() => setQuery({ status: null })}
            />
          }
        >
          {/*
           * No pagination affordance: `GET /projects/:slug/forms` answers with
           * the project's complete form array — there is no paginated envelope
           * to render from, and the count is capped by the plan (1–100). If it
           * ever paginates, hand the envelope to `DataList`'s `pagination` prop.
           */}
          {viewMode === "list" ? (
            <DataList aria-label="Forms">
              {filtered.map((form) => (
                <FormRow
                  key={form.id}
                  slug={project.slug}
                  form={form}
                  onDelete={() => itemActions.onDelete(form.id)}
                  onToggleOpen={() =>
                    itemActions.onToggleOpen(form.id, form.open)
                  }
                  onRename={(name) => itemActions.onRename(form.id, name)}
                />
              ))}
            </DataList>
          ) : (
            <div className={GRID_PAD}>
              <div
                className={`grid auto-rows-fr ${GRID_COLS}`}
                role="list"
                aria-label="Forms"
              >
                {filtered.map((form, index) => (
                  <div
                    key={form.id}
                    role="listitem"
                    className={cn(
                      "animate-fade-up h-full",
                      index < 8 && `stagger-${index + 1}`,
                    )}
                  >
                    <FormCard
                      slug={project.slug}
                      form={form}
                      onDelete={() => itemActions.onDelete(form.id)}
                      onToggleOpen={() =>
                        itemActions.onToggleOpen(form.id, form.open)
                      }
                      onRename={(name) => itemActions.onRename(form.id, name)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataState>
      </PageBody>

      <FormIntentPicker
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) setQuery({ new: null });
        }}
        onCreate={(intent, templateId, delivery) => {
          void handleCreate(intent, templateId, delivery);
        }}
        pending={createPending}
        blockedReason={createBlockedReason}
        projectBrandColor={project.brandColorPrimary}
      />
    </div>
  );
}

/**
 * A filtered miss is a different fact from an empty project, so it gets
 * different copy and a different action: clear the filter, not create the
 * first form.
 */
function FilteredEmpty({
  filter,
  onReset,
}: {
  filter: Filter;
  onReset: () => void;
}) {
  const copy = filter === "all" ? null : FILTER_MISS[filter];
  if (!copy) return null;

  return (
    <NoResults
      title={copy.title}
      description={copy.description}
      action={
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={onReset}
        >
          Show all forms
        </Button>
      }
    />
  );
}
