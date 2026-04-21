import * as React from "react";
import { cn } from "@/lib/utils";
import type { DesignTokens } from "@/lib/collect/studio-types";

/* ─── Layout thumbnails ───────────────────────────────────────────────────── */

export function LayoutThumbnail({ kind, selected }: { kind: string; selected: boolean }) {
  const stroke = selected ? "currentColor" : "var(--color-muted-foreground)";
  const fill = selected ? "var(--color-secondary)" : "var(--color-muted)";
  return (
    <svg viewBox="0 0 80 48" className="block w-full rounded text-foreground" style={{ background: fill }}>
      {kind === "classic" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="20" y="6" width="40" height="36" rx="2"/>
          <line x1="26" y1="14" x2="44" y2="14" strokeWidth="1.5"/>
          <line x1="26" y1="22" x2="54" y2="22"/><line x1="26" y1="28" x2="54" y2="28"/><line x1="26" y1="34" x2="50" y2="34"/>
        </g>
      )}
      {kind === "split" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="4" y="6" width="30" height="36" rx="2" fill={stroke} fillOpacity="0.12"/>
          <rect x="38" y="6" width="38" height="36" rx="2"/>
          <line x1="10" y1="14" x2="28" y2="14" strokeWidth="1.5"/>
          <line x1="44" y1="16" x2="68" y2="16"/><line x1="44" y1="24" x2="68" y2="24"/><line x1="44" y1="32" x2="64" y2="32"/>
        </g>
      )}
      {kind === "stepped" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <line x1="10" y1="10" x2="70" y2="10" strokeWidth="1.5"/>
          <line x1="10" y1="10" x2="40" y2="10" stroke={stroke} strokeWidth="2.5"/>
          <rect x="18" y="20" width="44" height="18" rx="2"/>
          <line x1="24" y1="28" x2="42" y2="28"/>
        </g>
      )}
      {kind === "cards" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="14" y="14" width="44" height="26" rx="3" fill={fill}/>
          <rect x="18" y="10" width="44" height="26" rx="3" fill={fill}/>
          <rect x="22" y="6" width="44" height="26" rx="3" fill={fill}/>
          <line x1="28" y1="14" x2="48" y2="14" strokeWidth="1.5"/>
        </g>
      )}
      {kind === "convo" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="10" y="8" width="44" height="10" rx="3"/>
          <rect x="10" y="22" width="52" height="10" rx="3"/>
          <rect x="10" y="36" width="36" height="6" rx="2" stroke={stroke} fill={stroke} fillOpacity="0.2"/>
        </g>
      )}
      {kind === "magazine" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <line x1="8" y1="8" x2="72" y2="8" strokeWidth="2.5"/>
          <line x1="20" y1="14" x2="60" y2="14"/>
          <rect x="14" y="22" width="52" height="20" rx="1"/>
          <line x1="20" y1="30" x2="58" y2="30"/>
          <line x1="20" y1="36" x2="50" y2="36"/>
        </g>
      )}
    </svg>
  );
}

/* ─── Style preset card ───────────────────────────────────────────────────── */

export function PresetCard({ p, selected, onClick, showAuthor }: {
  p: { label: string; sub: string; tokens: DesignTokens; author?: string; likes?: number };
  selected: boolean; onClick: () => void; showAuthor?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-lg border p-2.5 text-left transition-colors duration-150",
        selected
          ? "border-foreground bg-card"
          : "border-border bg-transparent hover:border-muted-foreground/40 hover:bg-card"
      )}
    >
      <div className="mb-2 flex gap-1">
        <span className="size-4 rounded-sm border border-black/8" style={{ background: p.tokens.bg }}/>
        <span className="size-4 rounded-sm border border-black/8" style={{ background: p.tokens.surface }}/>
        <span className="size-4 rounded-sm" style={{ background: p.tokens.ink }}/>
        <span className="size-4 rounded-sm" style={{ background: p.tokens.accent }}/>
      </div>
      <div className="text-[12.5px] font-semibold text-foreground tracking-tight">{p.label}</div>
      <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{p.sub}</div>
      {showAuthor && (
        <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] tracking-wide text-muted-foreground/70">
          <span>{p.author}</span>
          <span>♥ {p.likes?.toLocaleString()}</span>
        </div>
      )}
    </button>
  );
}

export const MemoPresetCard = React.memo(PresetCard);
export const MemoLayoutThumbnail = React.memo(LayoutThumbnail);
