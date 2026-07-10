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
import type { FormDefinitionDoc, FormField } from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldPalette, FIELD_TYPE_ICON, duplicateField } from "./field-palette";

export interface OutlineActions {
  addField: (field: FormField) => void;
  removeField: (id: string) => void;
  duplicate: (id: string) => void;
  moveField: (id: string, dir: -1 | 1) => void;
}

/** Shared field-list mutations, used by the outline and the field inspector. */
export function useOutlineActions(
  doc: FormDefinitionDoc,
  onChange: (next: FormDefinitionDoc) => void,
): OutlineActions {
  return React.useMemo(() => {
    const fields = doc.fields;
    return {
      // New fields land before a trailing consent field — consent reads last.
      addField: (field) => {
        const last = fields[fields.length - 1];
        const next =
          last?.type === "consent" && field.type !== "consent"
            ? [...fields.slice(0, -1), field, last]
            : [...fields, field];
        onChange({ ...doc, fields: next });
      },
      removeField: (id) =>
        onChange({ ...doc, fields: fields.filter((f) => f.id !== id) }),
      duplicate: (id) => {
        const idx = fields.findIndex((f) => f.id === id);
        if (idx < 0) return;
        const copy = duplicateField(fields[idx], doc);
        const next = [...fields];
        next.splice(idx + 1, 0, copy);
        onChange({ ...doc, fields: next });
      },
      moveField: (id, dir) => {
        const idx = fields.findIndex((f) => f.id === id);
        const next = idx + dir;
        if (idx < 0 || next < 0 || next >= fields.length) return;
        const reordered = [...fields];
        const [moved] = reordered.splice(idx, 1);
        reordered.splice(next, 0, moved);
        onChange({ ...doc, fields: reordered });
      },
    };
  }, [doc, onChange]);
}

export function FormOutline({
  doc,
  actions,
  selectedFieldId,
  onSelectField,
  onSelectContent,
}: {
  doc: FormDefinitionDoc;
  actions: OutlineActions;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  /** Header/Ending rows land on the Content tab. */
  onSelectContent: () => void;
}) {
  const fields = doc.fields;
  const rowRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // ↑/↓ moves focus, Alt+↑/↓ reorders, Delete removes, D duplicates.
  const handleRowKey = (e: React.KeyboardEvent, index: number) => {
    const field = fields[index];
    if (!field) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
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
      return;
    }
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
  };

  return (
    <div className="flex flex-col gap-0.5 p-2">
      <div className="flex h-8 items-center justify-between pl-2 pr-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
          Structure
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
        onClick={onSelectContent}
      />

      <div className="mx-2 my-1 h-px bg-border/60" aria-hidden />

      {fields.map((field, i) => {
        const TypeIcon = FIELD_TYPE_ICON[field.type];
        const selected = selectedFieldId === field.id;
        return (
          <div
            key={field.id}
            className={cn(
              "group relative flex items-center rounded-md",
              selected ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <button
              type="button"
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              onClick={() => onSelectField(field.id)}
              onKeyDown={(e) => handleRowKey(e, i)}
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
                  selected
                    ? "font-medium text-foreground"
                    : "text-foreground/90",
                )}
              >
                {field.label || "Untitled field"}
              </span>
              {field.required ? (
                <span
                  aria-label="Required"
                  className="shrink-0 text-[11px] leading-none text-muted-foreground/80"
                >
                  *
                </span>
              ) : null}
            </button>

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
                  disabled={i === 0}
                  onSelect={() => actions.moveField(field.id, -1)}
                >
                  <CaretUpIcon aria-hidden />
                  Move up
                  <DropdownMenuShortcut>⌥↑</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={i === fields.length - 1}
                  onSelect={() => actions.moveField(field.id, 1)}
                >
                  <CaretDownIcon aria-hidden />
                  Move down
                  <DropdownMenuShortcut>⌥↓</DropdownMenuShortcut>
                </DropdownMenuItem>
                {field.type !== "consent" && (
                  <DropdownMenuItem
                    onSelect={() => actions.duplicate(field.id)}
                  >
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
          </div>
        );
      })}

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
        onClick={onSelectContent}
      />
    </div>
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
