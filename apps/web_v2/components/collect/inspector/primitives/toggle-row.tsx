"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  children,
  testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-slot="toggle-row"
      data-checked={checked}
      data-disabled={disabled ? "true" : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2.5 transition-colors",
        checked && "bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <Switch
          data-testid={testId}
          size="sm"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
      <AnimatePresence initial={false}>
        {checked && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.2 }, opacity: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RequiredSubToggle({
  required,
  onRequiredChange,
  disabled,
  testId,
}: {
  required: boolean;
  onRequiredChange: (required: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <label className="flex items-center justify-between text-[10px] text-muted-foreground">
      <span>Required field</span>
      <Switch
        data-testid={testId}
        size="sm"
        checked={required}
        onCheckedChange={onRequiredChange}
        disabled={disabled}
      />
    </label>
  );
}
