"use client";

/**
 * FormOutline — the Form Studio's left structure panel.
 *
 * The form's anatomy as a compact list (the Typeform "Pages" idea): Header →
 * fields → Ending. Selecting a field opens its editor in the inspector;
 * Header/Ending jump to the Content tab. Reorder with Alt+↑/↓ (or the row
 * menu), duplicate with D, remove with Delete — same keys as before.
 */

import * as React from "react";
import {
  CaretUpIcon,
  CaretDownIcon,
  CopySimpleIcon,
  DotsThreeIcon,
  FlagCheckeredIcon,
  PlusIcon,
  TextAlignLeftIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  EMBED_MAX_FIELDS,
  isEmbedCapableField,
  type FormDefinitionDoc,
  type FormField,
} from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldPalette, FIELD_TYPE_ICON } from "./field-palette";
import { useOutlineActions, type OutlineActions } from "./use-outline-actions";

export { useOutlineActions, type OutlineActions };

/** Everything a row key handler needs to act on the focused field. */
interface RowKeyContext {
  field: FormField;
  index: number;
  fields: ReadonlyArray<FormField>;
  actions: OutlineActions;
  rowRefs: React.RefObject<Array<HTMLButtonElement | null>>;
}

/** ↑/↓ moves focus, Alt+↑/↓ reorders (focus follows the moved row). */
function handleArrowKey(e: React.KeyboardEvent, ctx: RowKeyContext) {
  const { field, index, fields, actions, rowRefs } = ctx;
  const dir = e.key === "ArrowDown" ? 1 : -1;
  e.preventDefault();
  if (e.altKey) {
    actions.moveField(field.id, dir as -1 | 1);
    requestAnimationFrame(() => {
      rowRefs.current[
        Math.min(Math.max(index + dir, 0), fields.length - 1)
      ]?.focus();
    });
  } else {
    rowRefs.current[(index + dir + fields.length) % fields.length]?.focus();
  }
}

/** Delete/Backspace removes, D duplicates (bare keys only). */
function handleEditKey(e: React.KeyboardEvent, ctx: RowKeyContext) {
  const { field, index, actions, rowRefs } = ctx;
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    actions.removeField(field.id);
    requestAnimationFrame(() => {
      rowRefs.current[Math.max(index - 1, 0)]?.focus();
    });
    return;
  }
  if (e.key.toLowerCase() === "d" && field.type !== "consent") {
    e.preventDefault();
    actions.duplicate(field.id);
  }
}

/**
 * Row keyboard model. Cmd/Ctrl combos are left to the browser (⌘D bookmark,
 * ⌘⌫ etc.) — a focused row must never hijack them into field mutations.
 */
function useOutlineRowKeys(
  fields: ReadonlyArray<FormField>,
  actions: OutlineActions,
  rowRefs: RowKeyContext["rowRefs"],
) {
  return (e: React.KeyboardEvent, index: number) => {
    const field = fields[index];
    if (!field) return;
    const ctx: RowKeyContext = { field, index, fields, actions, rowRefs };
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      handleArrowKey(e, ctx);
      return;
    }
    if (e.metaKey || e.ctrlKey) return;
    handleEditKey(e, ctx);
  };
}

export function FormOutline({
  doc,
  actions,
  selectedFieldId,
  onSelectField,
  onSelectHeader,
  onSelectEnding,
}: {
  doc: FormDefinitionDoc;
  actions: OutlineActions;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  /** Header/Ending rows open their editors in this rail. */
  onSelectHeader: () => void;
  onSelectEnding: () => void;
}) {
  // Consent is platform furniture (rendered + validated automatically) — it
  // is not the owner's field to manage, so it never appears in the outline.
  const fields = doc.fields.filter((f) => f.type !== "consent");
  const rowRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const handleRowKey = useOutlineRowKeys(fields, actions, rowRefs);
  const isEmbed = doc.delivery === "embed";
  const askCount = fields.filter((f) => f.type !== "hidden").length;

  return (
    <div className="flex flex-col gap-0.5 p-2">
      <div className="flex h-8 items-center justify-between pl-2 pr-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
          Structure
          {isEmbed ? (
            <span
              className="ml-1.5 font-medium normal-case tracking-normal text-muted-foreground/70"
              title={`Embedded forms are limited to ${EMBED_MAX_FIELDS} questions`}
            >
              {askCount}/{EMBED_MAX_FIELDS}
            </span>
          ) : null}
        </span>
        <FieldPalette
          doc={doc}
          onAdd={actions.addField}
          trigger={
            <button
              type="button"
              aria-label="Add field"
              className={cn(
                "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              )}
            >
              <PlusIcon className="size-3.5" weight="bold" aria-hidden />
            </button>
          }
        />
      </div>

      <ChromeRow
        icon={<TextAlignLeftIcon className="size-3.5" aria-hidden />}
        label="Header"
        hint={doc.content.title || "Untitled"}
        onClick={onSelectHeader}
      />

      <div className="mx-2 my-1 h-px bg-border/60" aria-hidden />

      {fields.map((field, i) => (
        <OutlineFieldRow
          key={field.id}
          field={field}
          index={i}
          lastIndex={fields.length - 1}
          selected={selectedFieldId === field.id}
          incompatible={isEmbed && !isEmbedCapableField(field)}
          actions={actions}
          onSelect={() => onSelectField(field.id)}
          onKeyDown={(e) => handleRowKey(e, i)}
          buttonRef={(el) => {
            rowRefs.current[i] = el;
          }}
        />
      ))}

      {fields.length === 0 && (
        <FieldPalette
          doc={doc}
          onAdd={actions.addField}
          trigger={
            <button
              type="button"
              className={cn(
                "mx-1 my-1 rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground",
                "transition-colors hover:border-foreground/30 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              )}
            >
              Add your first field
            </button>
          }
        />
      )}

      <div className="mx-2 my-1 h-px bg-border/60" aria-hidden />

      <ChromeRow
        icon={<FlagCheckeredIcon className="size-3.5" aria-hidden />}
        label="Ending"
        hint={doc.content.successAction === "redirect" ? "Redirect" : "Message"}
        onClick={onSelectEnding}
      />
    </div>
  );
}

function OutlineFieldRow({
  field,
  index,
  lastIndex,
  selected,
  incompatible,
  actions,
  onSelect,
  onKeyDown,
  buttonRef,
}: {
  field: FormField;
  index: number;
  lastIndex: number;
  selected: boolean;
  /** True when the form is embed-delivery and this field can't ship in it. */
  incompatible?: boolean;
  actions: OutlineActions;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const TypeIcon = FIELD_TYPE_ICON[field.type];
  return (
    <div
      className={cn(
        "group relative flex items-center rounded-md",
        selected ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        ref={buttonRef}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        aria-current={selected || undefined}
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md pl-2 pr-1 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
        )}
      >
        <TypeIcon
          className={cn(
            "size-3.5 shrink-0",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs",
            selected ? "font-medium text-foreground" : "text-foreground/90",
          )}
        >
          {field.label || "Untitled field"}
        </span>
        {incompatible ? (
          <span
            aria-label="Not available in embedded forms"
            title="Not available in embedded forms — remove it or switch to a hosted page"
            className="size-1.5 shrink-0 rounded-full bg-amber-500"
          />
        ) : null}
        {field.required ? (
          <span
            aria-label="Required"
            className="shrink-0 text-[11px] leading-none text-muted-foreground/80"
          >
            *
          </span>
        ) : null}
      </button>

      <RowMenu
        field={field}
        index={index}
        lastIndex={lastIndex}
        actions={actions}
      />
    </div>
  );
}

function RowMenu({
  field,
  index,
  lastIndex,
  actions,
}: {
  field: FormField;
  index: number;
  lastIndex: number;
  actions: OutlineActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${field.label || "Field"} actions`}
          className={cn(
            "mr-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground",
            "opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100",
            "hover:bg-background hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
          )}
        >
          <DotsThreeIcon className="size-4" weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-44">
        <DropdownMenuItem
          disabled={index === 0}
          onSelect={() => actions.moveField(field.id, -1)}
        >
          <CaretUpIcon aria-hidden />
          Move up
          <DropdownMenuShortcut>⌥↑</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={index === lastIndex}
          onSelect={() => actions.moveField(field.id, 1)}
        >
          <CaretDownIcon aria-hidden />
          Move down
          <DropdownMenuShortcut>⌥↓</DropdownMenuShortcut>
        </DropdownMenuItem>
        {field.type !== "consent" && (
          <DropdownMenuItem onSelect={() => actions.duplicate(field.id)}>
            <CopySimpleIcon aria-hidden />
            Duplicate
            <DropdownMenuShortcut>D</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => actions.removeField(field.id)}
        >
          <TrashIcon aria-hidden />
          Remove
          <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChromeRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md pl-2 pr-1 text-left hover:bg-muted/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground/90">
        {label}
      </span>
      {hint ? (
        <span className="max-w-[45%] shrink-0 truncate text-[10.5px] text-muted-foreground/70">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
