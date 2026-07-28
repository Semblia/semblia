"use client";

/**
 * ProjectOverview — the project's control plane.
 *
 * `/[slug]` was an eleven-line redirect stub: every project card, every project
 * row, and the post-create redirect all pointed at a route with no surface,
 * which resolved a layout, then bounced to `/forms` and resolved another. So
 * the product had no answer to "what is happening in this project?" — and the
 * pressure to answer it landed on the *global* projects view, which is the one
 * place the canon forbids aggregate metrics.
 *
 * This is a control plane, not a link grid and not a hero-metric page:
 *
 *   • the metric band reports the four counts the project DTO already carries,
 *     from one request, so they cannot disagree with each other — and every one
 *     of them clicks through to the rows behind it
 *   • three sections show what is actually live: what arrived, what is
 *     collecting, what is displaying — each owning its own state, so one
 *     failing query replaces only its own section
 *   • "nothing pending" is reassurance, not a setup failure, and carries no CTA
 */

import * as React from "react";
import Link from "next/link";
import {
  ChatCircleTextIcon,
  FileTextIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import type {
  V2FormSummaryDTO,
  V2ProjectDTO,
  V2WidgetDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  DataList,
  DataState,
  EmptyState,
  HeaderSep,
  ItemRow,
  ListSkeleton,
  MetricRow,
  MetricValue,
  NoResults,
  PageBody,
  PageHeader,
  RefreshingDataBadge,
  Section,
  SectionStack,
  StatusBadge,
  reviewStatusMeta,
  useDataState,
} from "@/components/shared";
import { useFormsList, useResponses, useWidgetsList } from "@/hooks/api";
import { fmtCount, fmtDateTime, humanizeLabel, timeAgo } from "@/lib/format";
import {
  developerKeysPath,
  formStudioPath,
  formsPath,
  responsesPath,
  widgetStudioPath,
  widgetsPath,
} from "@/lib/routes";
import { projectTypeLabel } from "./project-facts";

/** Enough to answer "what just came in?" without becoming a second inbox. */
const RECENT_LIMIT = 5;

export function ProjectOverview({ project }: { project: V2ProjectDTO }) {
  const slug = project.slug;
  const counts = project._count;
  const typeLabel = projectTypeLabel(project);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={project.name}
        description={
          <>
            {typeLabel && (
              <>
                {typeLabel}
                <HeaderSep />
              </>
            )}
            {!project.isActive && (
              <>
                <span className="text-muted-foreground">Paused</span>
                <HeaderSep />
              </>
            )}
            <span title={fmtDateTime(project.updatedAt)}>
              Updated {timeAgo(project.updatedAt)}
            </span>
          </>
        }
        actions={
          counts.pendingModeration > 0 ? (
            <Button asChild size="sm">
              <Link href={`${responsesPath(slug)}?status=pending`}>
                Review {fmtCount(counts.pendingModeration)} pending
              </Link>
            </Button>
          ) : undefined
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <SectionStack>
            {/* Every number leads to the rows behind it. A real 0 renders 0 —
                "nothing pending" and "we don't have this" are different facts. */}
            <MetricRow columns={4}>
              <MetricValue
                label="Pending review"
                value={counts.pendingModeration}
                href={`${responsesPath(slug)}?status=pending`}
                hint={
                  counts.pendingModeration === 0 ? "Nothing waiting" : undefined
                }
              />
              <MetricValue
                label="Responses"
                value={counts.responses}
                href={responsesPath(slug)}
              />
              <MetricValue
                label="Widgets"
                value={counts.widgets}
                href={widgetsPath(slug)}
              />
              <MetricValue
                label="API keys"
                value={counts.apiKeys}
                href={developerKeysPath(slug)}
              />
            </MetricRow>

            <RecentArrivals slug={slug} />
            <LiveForms slug={slug} />
            <LiveWidgets slug={slug} />
          </SectionStack>
        </div>
      </PageBody>
    </div>
  );
}

// ── Recent arrivals ──────────────────────────────────────────────────────────

function RecentArrivals({ slug }: { slug: string }) {
  const query = useResponses(slug, {
    sort: "newest",
    page: 1,
    pageSize: RECENT_LIMIT,
  });
  const items = React.useMemo(() => query.data?.items ?? [], [query.data]);
  const state = useDataState(query, { count: items.length });

  return (
    <Section
      title="Recent arrivals"
      description="The newest submissions, whatever their state. Everything is in the queue."
      meta={<RefreshingDataBadge show={state.isRefreshing} />}
      actions={
        items.length > 0 ? (
          <Button asChild size="sm" variant="ghost" className="text-xs">
            <Link href={responsesPath(slug)}>View all responses</Link>
          </Button>
        ) : undefined
      }
    >
      <div aria-busy={state.kind === "loading-initial"}>
        <DataState
          state={state}
          resource="recent responses"
          align="start"
          compactError
          skeleton={
            <ListSkeleton rows={3} leading="circle" trailing density="dense" />
          }
          empty={
            <EmptyState
              icon={ChatCircleTextIcon}
              align="start"
              title="Nothing has arrived yet"
              description="Submissions land here the moment someone completes one of your forms."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={formsPath(slug)}>Share a form</Link>
                </Button>
              }
            />
          }
        >
          <DataList aria-label="Recent responses">
            {items.map((response) => {
              const author = response.authorName?.trim() || "Anonymous";
              return (
                <ItemRow
                  key={response.id}
                  padding="dense"
                  href={responsesPath(slug)}
                  title={
                    <span className="truncate text-sm font-medium text-foreground">
                      {author}
                    </span>
                  }
                  subtitle={
                    response.form?.name ? (
                      <p className="truncate text-xs text-muted-foreground">
                        via {response.form.name}
                      </p>
                    ) : undefined
                  }
                  trailing={
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        {...reviewStatusMeta(response.reviewStatus)}
                      />
                      <span
                        className="hidden text-xs tabular-nums text-muted-foreground sm:block"
                        title={fmtDateTime(response.createdAt)}
                      >
                        {timeAgo(response.createdAt)}
                      </span>
                    </div>
                  }
                />
              );
            })}
          </DataList>
        </DataState>
      </div>
    </Section>
  );
}

// ── Collecting ───────────────────────────────────────────────────────────────

/** A form only collects when it is published *and* accepting submissions. */
function isLive(form: V2FormSummaryDTO) {
  return form.status === "PUBLISHED" && form.open;
}

function LiveForms({ slug }: { slug: string }) {
  const query = useFormsList(slug);
  const forms = React.useMemo(() => query.data ?? [], [query.data]);
  const live = React.useMemo(() => forms.filter(isLive), [forms]);
  // "Has forms, none of them live" is a different fact from "has no forms" —
  // one is a switch to flip, the other is a thing to build.
  const state = useDataState(query, {
    count: live.length,
    filtered: forms.length > 0,
  });

  return (
    <Section
      title="Collecting"
      description="Forms that are published and accepting submissions right now."
      divided
      meta={
        forms.length > 0 ? `${live.length} of ${forms.length} live` : undefined
      }
      actions={
        <Button asChild size="sm" variant="ghost" className="text-xs">
          <Link href={formsPath(slug)}>Manage forms</Link>
        </Button>
      }
    >
      <div aria-busy={state.kind === "loading-initial"}>
        <DataState
          state={state}
          resource="this project's forms"
          align="start"
          compactError
          skeleton={
            <ListSkeleton rows={2} leading="square" trailing density="dense" />
          }
          empty={
            <EmptyState
              icon={FileTextIcon}
              align="start"
              title="No collection form yet"
              description="A form is the link or embed customers submit through. Every project needs at least one."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={formsPath(slug)}>Create form</Link>
                </Button>
              }
            />
          }
          filteredEmpty={
            <NoResults
              title="No form is live"
              description="Every form here is a draft or closed, so nothing can be submitted right now."
              action={
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link href={formsPath(slug)}>Open forms</Link>
                </Button>
              }
            />
          }
        >
          <DataList aria-label="Live forms">
            {live.map((form) => (
              <ItemRow
                key={form.id}
                padding="dense"
                href={formStudioPath(slug, form.id)}
                title={
                  <span className="truncate text-sm font-medium text-foreground">
                    {form.name}
                  </span>
                }
                subtitle={
                  <p className="truncate text-xs text-muted-foreground">
                    {humanizeLabel(form.intent.toLowerCase())}
                  </p>
                }
                trailing={
                  <span
                    className="hidden text-xs tabular-nums text-muted-foreground sm:block"
                    title={fmtDateTime(form.updatedAt)}
                  >
                    {timeAgo(form.updatedAt)}
                  </span>
                }
              />
            ))}
          </DataList>
        </DataState>
      </div>
    </Section>
  );
}

// ── Displaying ───────────────────────────────────────────────────────────────

function LiveWidgets({ slug }: { slug: string }) {
  const query = useWidgetsList(slug);
  const widgets = React.useMemo(() => query.data ?? [], [query.data]);
  const published = React.useMemo(
    () => widgets.filter((widget: V2WidgetDTO) => widget.entry.isActive),
    [widgets],
  );
  const state = useDataState(query, {
    count: published.length,
    filtered: widgets.length > 0,
  });

  return (
    <Section
      title="Displaying"
      description="Widgets that are live on your site, with the loads they have served."
      divided
      meta={
        widgets.length > 0
          ? `${published.length} of ${widgets.length} published`
          : undefined
      }
      actions={
        <Button asChild size="sm" variant="ghost" className="text-xs">
          <Link href={widgetsPath(slug)}>Manage widgets</Link>
        </Button>
      }
    >
      <div aria-busy={state.kind === "loading-initial"}>
        <DataState
          state={state}
          resource="this project's widgets"
          align="start"
          compactError
          skeleton={
            <ListSkeleton rows={2} leading="square" trailing density="dense" />
          }
          empty={
            <EmptyState
              icon={SquaresFourIcon}
              align="start"
              title="Nothing is embedded yet"
              description="A widget is how approved testimonials appear on your own site."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={widgetsPath(slug)}>Create widget</Link>
                </Button>
              }
            />
          }
          filteredEmpty={
            <NoResults
              title="No widget is published"
              description="Every widget here is paused, so none of them is rendering on your site."
              action={
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link href={widgetsPath(slug)}>Open widgets</Link>
                </Button>
              }
            />
          }
        >
          <DataList aria-label="Published widgets">
            {published.map((widget) => (
              <ItemRow
                key={widget.id}
                padding="dense"
                href={widgetStudioPath(slug, widget.id)}
                title={
                  <span className="truncate text-sm font-medium text-foreground">
                    {widget.entry.name}
                  </span>
                }
                subtitle={
                  <p className="truncate text-xs text-muted-foreground">
                    {humanizeLabel(widget.entry.layoutType.toLowerCase())}
                  </p>
                }
                metrics={
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {fmtCount(widget.entry.totalLoads)}{" "}
                    {widget.entry.totalLoads === 1 ? "load" : "loads"}
                  </span>
                }
                trailing={
                  <span
                    className="hidden text-xs tabular-nums text-muted-foreground sm:block"
                    title={
                      widget.entry.lastLoadAt
                        ? fmtDateTime(widget.entry.lastLoadAt)
                        : undefined
                    }
                  >
                    {/* An absent last-load renders an em dash, never "never"
                        dressed up as a timestamp. */}
                    {timeAgo(widget.entry.lastLoadAt)}
                  </span>
                }
              />
            ))}
          </DataList>
        </DataState>
      </div>
    </Section>
  );
}
