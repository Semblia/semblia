/**
 * Tresta shared page primitives.
 *
 * One-stop import path for the components that anchor every page's visual
 * identity. Compose into call-sites instead of hand-rolling header / toolbar
 * / item containers per page.
 */

export { PageHeader, HeaderSep, HeaderCaption } from "./page-header";
export type { PageHeaderProps } from "./page-header";

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

export { ItemActionRow } from "./item-action-row";
export type {
  ItemActionRowProps,
  ItemAction,
  ActionTone,
} from "./item-action-row";
