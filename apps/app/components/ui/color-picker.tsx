"use client";

import * as React from "react";
import { CheckIcon, EyedropperIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HEX_RE = /^#([0-9a-fA-F]{3}){1,2}$/;

export function isValidHexColor(value: string): boolean {
  return value === "" || HEX_RE.test(value.trim());
}

/** Curated brand-friendly palette. First row warm, second cool, last neutral. */
const DEFAULT_PRESETS = [
  "#FF6B35",
  "#F4511E",
  "#E11D48",
  "#DB2777",
  "#9333EA",
  "#6366F1",
  "#2563EB",
  "#0EA5E9",
  "#0D9488",
  "#16A34A",
  "#CA8A04",
  "#1F2937",
];

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper ?? null
  );
}

export interface ColorPickerProps {
  id?: string;
  /** Current hex value, e.g. "#FF6B35". Empty string means "no colour set". */
  value: string;
  onChange: (value: string) => void;
  /** Accessible label for the trigger. */
  label: string;
  /** Allow clearing back to no colour. */
  clearable?: boolean;
  presets?: string[];
  className?: string;
}

export function ColorPicker({
  id,
  value,
  onChange,
  label,
  clearable = true,
  presets = DEFAULT_PRESETS,
  className,
}: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);
  const nativeRef = React.useRef<HTMLInputElement>(null);
  const valid = isValidHexColor(value);
  const hasColor = valid && value.trim() !== "";
  const swatch = hasColor ? value.trim() : null;
  const eyeDropper = getEyeDropper();

  function commit(next: string) {
    const v = next.trim();
    onChange(v === "" ? "" : v.startsWith("#") ? v : `#${v}`);
  }

  async function pickFromScreen() {
    const Ctor = getEyeDropper();
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      commit(result.sRGBHex);
    } catch {
      /* user dismissed the eyedropper */
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("flex items-center gap-2", className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={`${label} colour`}
            className="group relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-input bg-background outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {swatch ? (
              <span
                className="size-full"
                style={{ backgroundColor: swatch }}
                aria-hidden
              />
            ) : (
              // "No colour" — muted tile with a diagonal slash so it never reads
              // as a real value.
              <span
                className="size-full bg-muted"
                style={{
                  backgroundImage:
                    "linear-gradient(to top right, transparent calc(50% - 0.5px), var(--border), transparent calc(50% + 0.5px))",
                }}
                aria-hidden
              />
            )}
          </button>
        </PopoverTrigger>

        <div className="relative flex-1">
          <span
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted-foreground"
            aria-hidden
          >
            #
          </span>
          <Input
            value={value.replace(/^#/, "")}
            onChange={(e) => commit(e.target.value)}
            placeholder="FF6B35"
            spellCheck={false}
            autoComplete="off"
            className={cn(
              "h-9 pl-6 font-mono text-[13px] uppercase tracking-wide",
              !valid &&
                "border-destructive/60 focus-visible:ring-destructive/30",
            )}
          />
        </div>
      </div>

      <PopoverContent align="start" className="w-60 gap-3">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            Presets
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {presets.map((preset) => {
              const selected =
                hasColor && preset.toLowerCase() === value.trim().toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    commit(preset);
                    setOpen(false);
                  }}
                  aria-label={preset}
                  aria-pressed={selected}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md outline-none ring-offset-1 ring-offset-popover transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring/60",
                    selected && "ring-2 ring-foreground/70",
                  )}
                  style={{ backgroundColor: preset }}
                >
                  {selected && (
                    <CheckIcon
                      className="size-3.5 text-white drop-shadow"
                      weight="bold"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-border/70 pt-2.5">
          <button
            type="button"
            onClick={() => nativeRef.current?.click()}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60"
          >
            <span
              className="size-3.5 rounded-sm border border-border/70"
              style={{ backgroundColor: swatch ?? "transparent" }}
              aria-hidden
            />
            Custom
            <input
              ref={nativeRef}
              type="color"
              value={swatch ?? "#000000"}
              onChange={(e) => commit(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            />
          </button>
          {eyeDropper && (
            <button
              type="button"
              onClick={pickFromScreen}
              aria-label="Pick colour from screen"
              className="flex size-8 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:bg-muted/60"
            >
              <EyedropperIcon className="size-4" aria-hidden />
            </button>
          )}
          {clearable && hasColor && (
            <button
              type="button"
              onClick={() => commit("")}
              aria-label="Clear colour"
              className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
