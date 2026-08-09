"use client";

import type { ReactNode } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AuthCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}

export function AuthCheckbox({
  id,
  checked,
  onChange,
  children,
  disabled,
}: AuthCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-2.5 cursor-pointer group",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className="relative mt-0.5 flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <span
          className={cn(
            "flex items-center justify-center size-4 rounded border",
            "transition-all duration-150",
            checked
              ? "bg-primary border-primary"
              : "bg-card border-input group-hover:border-muted-foreground/40",
          )}
          aria-hidden
        >
          {checked && (
            <Check
              size={10}
              weight="bold"
              className="text-primary-foreground"
            />
          )}
        </span>
      </span>
      <span className="text-[12px] text-muted-foreground leading-relaxed select-none">
        {children}
      </span>
    </label>
  );
}
