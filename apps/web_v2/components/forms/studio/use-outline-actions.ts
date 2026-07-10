"use client";

/**
 * Shared field-list mutations — used by the outline, the contextual field
 * inspector, and the studio shell.
 */

import * as React from "react";
import type { FormDefinitionDoc, FormField } from "@workspace/forms-core";
import { duplicateField } from "./field-palette";

export interface OutlineActions {
  addField: (field: FormField) => void;
  removeField: (id: string) => void;
  duplicate: (id: string) => void;
  moveField: (id: string, dir: -1 | 1) => void;
}

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
        if (idx < 0) return;
        const next = idx + dir;
        if (next < 0) return;
        if (next >= fields.length) return;
        const reordered = [...fields];
        const [moved] = reordered.splice(idx, 1);
        reordered.splice(next, 0, moved);
        onChange({ ...doc, fields: reordered });
      },
    };
  }, [doc, onChange]);
}
