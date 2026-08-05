/**
 * Semblia shared page primitives.
 *
 * One-stop import path for the components that anchor every page's visual
 * identity. Compose into call-sites instead of hand-rolling header / toolbar
 * / item containers per page.
 */

export { PageHeader, HeaderSep, HeaderCaption } from "./page-header";
export type { PageHeaderProps } from "./page-header";

export { RefreshingDataBadge } from "./refreshing-data-badge";
export type { RefreshingDataBadgeProps } from "./refreshing-data-badge";

export { PageBody } from "./page-body";
export type { PageBodyProps, PageBodyPadding } from "./page-body";

export { PageToolbar } from "./page-toolbar";
export type { PageToolbarProps } from "./page-toolbar";

export { FilterPills } from "./filter-pills";
export type { FilterPillsProps, FilterPillOption } from "./filter-pills";

export { SearchField } from "./search-field";
export type { SearchFieldProps } from "./search-field";

export { ItemShell } from "./item-shell";
export type { ItemShellProps, ItemShape } from "./item-shell";

export { ItemRow, PREVIEW_LEADING } from "./item-row";
export type { ItemRowProps } from "./item-row";

export { ItemCard } from "./item-card";
export type { ItemCardProps } from "./item-card";

export { ViewToggle } from "./view-toggle";
export type { ViewToggleProps, ViewMode } from "./view-toggle";

export { ItemActionRow } from "./item-action-row";
export type {
  ItemActionRowProps,
  ItemAction,
  ActionTone,
} from "./item-action-row";

export { StudioMark } from "./studio-mark";
export type { StudioMarkProps } from "./studio-mark";

export { PageTabs } from "./page-tabs";
export type { PageTabsProps, PageTabOption } from "./page-tabs";

export { EmptyKindPicker } from "./empty-kind-picker";
export type {
  EmptyKindPickerProps,
  EmptyKindOption,
} from "./empty-kind-picker";

export { EmptyState, NoResults, GhostList, ErrorState } from "./empty-state";
export type {
  EmptyStateProps,
  NoResultsProps,
  GhostListProps,
  ErrorStateProps,
  ErrorStateVariant,
} from "./empty-state";

// ── The canonical data-surface system ────────────────────────────────────────
//
// Compose these instead of hand-writing a `loading ? … : empty ? …` ladder.
// `useDataState` derives the state from the query, error first, which is what
// makes "empty state while the request failed" impossible to express.

export { DataState, useDataState } from "./data-state";
export type {
  DataStateProps,
  DataStateKind,
  DataStateResult,
  UseDataStateOptions,
} from "./data-state";

export { DataList, ListSkeleton, GridSkeleton } from "./data-list";
export type {
  DataListProps,
  DataListPagination,
  ListSkeletonProps,
} from "./data-list";

export { DataTable } from "./data-table";
export type {
  DataTableProps,
  DataTableColumn,
  DataTableSort,
} from "./data-table";

export { DetailSheet } from "./detail-sheet";
export type { DetailSheetProps } from "./detail-sheet";

export { BulkActionBar, SelectionCheckbox } from "./bulk-action-bar";
export type { BulkActionBarProps, BulkAction } from "./bulk-action-bar";

export { Section, SectionStack, DefinitionList } from "./section";
export type { SectionProps } from "./section";

export { MetricValue, MetricRow } from "./metric-value";
export type { MetricValueProps } from "./metric-value";

export {
  StatusBadge,
  StatusDot,
  reviewStatusMeta,
  publishStatusMeta,
  moderationDecisionMeta,
  moderationRunMeta,
  importJobMeta,
  importAvailabilityMeta,
} from "./status-badge";
export type {
  StatusBadgeProps,
  StatusDotProps,
  StatusMeta,
  StatusTone,
} from "./status-badge";

export { SettingsSection } from "./settings-section";
export type { SettingsSectionProps } from "./settings-section";

export { SettingsFooter } from "./settings-footer";
export type { SettingsFooterProps } from "./settings-footer";

export { ToggleRow } from "./toggle-row";
export type { ToggleRowProps } from "./toggle-row";

export { RouteError } from "./route-error";
export type { RouteErrorProps } from "./route-error";
