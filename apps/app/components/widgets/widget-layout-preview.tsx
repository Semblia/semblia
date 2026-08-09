"use client";

/**
 * WidgetLayoutPreview — a diagram of a layout, not a render of a widget.
 *
 * Drawn from the three facts the list row already carries (layout, theme,
 * accent) with stand-in quotes for structure. It is the fallback `WidgetPreviewPane`
 * uses when a widget's saved design can't be parsed, and the pane labels it as a
 * diagram when it does — an unlabelled mock passed off as the real design is
 * how a broken record comes to look healthy.
 *
 * `kind` is deliberately not a parameter: a wall and an embed with the same
 * layout diagram identically, and the row states the kind in words.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WidgetListEntry } from "@/lib/widgets/widget-types";
import { layoutLabel } from "./widget-item";

type Layout = WidgetListEntry["layout"];
type Theme = WidgetListEntry["theme"];

interface WidgetLayoutPreviewProps {
  layout: Layout;
  accent?: string;
  theme?: Theme;
  inactive?: boolean;
  className?: string;
}

interface Palette {
  accent: string;
  page: string;
  surface: string;
  text: string;
  sub: string;
  line: string;
}

function palette(accent: string, dark: boolean): Palette {
  return dark
    ? {
        accent,
        page: "#0c0c0e",
        surface: "#161619",
        text: "#e7e7ea",
        sub: "#8b8b93",
        line: "#2a2a30",
      }
    : {
        accent,
        page: "#f4f4f5",
        surface: "#ffffff",
        text: "#1f1f23",
        sub: "#9a9aa3",
        line: "#ececef",
      };
}

const STAR_PATH =
  "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z";

/**
 * A tiny, stable cast of real-looking people (mirrors the studio's fallback
 * testimonials) so each mini-card reads as an authored quote — an initial, a
 * name, and a short line of actual text — instead of a loading skeleton.
 */
const PEOPLE = [
  { initial: "H", name: "Hana M.", quote: "Saved us hours every single week." },
  { initial: "O", name: "Olu A.", quote: "Shipped without fighting the tool." },
  { initial: "M", name: "Margaux R.", quote: "Sits right inside our docs." },
  { initial: "D", name: "Diego S.", quote: "Setup took one afternoon, tops." },
  { initial: "P", name: "Priya N.", quote: "Our whole team noticed the lift." },
  { initial: "T", name: "Theo K.", quote: "Easily the cleanest one we tried." },
  {
    initial: "L",
    name: "Lena V.",
    quote: "Conversion jumped almost overnight.",
  },
  { initial: "S", name: "Sam W.", quote: "Defaults are genuinely sharp." },
] as const;

function Stars({ color, size = 4 }: { color: string; size?: number }) {
  return (
    <div className="flex gap-[1px]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={color}
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

function Quote({ p, text }: { p: Palette; text: string }) {
  return (
    <p
      className="mt-1 overflow-hidden font-medium leading-[1.35]"
      style={{
        color: p.text,
        opacity: 0.78,
        fontSize: "5.5px",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}
      aria-hidden
    >
      {text}
    </p>
  );
}

function Avatar({
  p,
  person,
}: {
  p: Palette;
  person: (typeof PEOPLE)[number];
}) {
  return (
    <span
      className="flex size-2.5 shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: p.accent, fontSize: "5px", lineHeight: 1 }}
      aria-hidden
    >
      {person.initial}
    </span>
  );
}

function MiniCard({
  p,
  i = 0,
  pad = "p-1.5",
  stars = true,
  quote = true,
  name = true,
}: {
  p: Palette;
  i?: number;
  pad?: string;
  stars?: boolean;
  quote?: boolean;
  name?: boolean;
}) {
  const person = PEOPLE[i % PEOPLE.length];
  return (
    <div
      className={cn("overflow-hidden rounded-[3px] border", pad)}
      style={{ background: p.surface, borderColor: p.line }}
    >
      <div className="flex items-center gap-1">
        <Avatar p={p} person={person} />
        {name && (
          <span
            className="truncate font-semibold leading-none"
            style={{ color: p.text, opacity: 0.85, fontSize: "5.5px" }}
            aria-hidden
          >
            {person.name}
          </span>
        )}
      </div>
      {stars && (
        <div className="mt-1">
          <Stars color={p.accent} />
        </div>
      )}
      {quote && <Quote p={p} text={person.quote} />}
    </div>
  );
}

/* ─── Per-layout miniatures ───────────────────────────────────────────────── */

function Carousel({ p }: { p: Palette }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-center gap-1.5 px-3"
      style={{ background: p.page }}
    >
      <div className="flex gap-1.5">
        <div className="w-[44%] shrink-0">
          <MiniCard p={p} i={0} />
        </div>
        <div className="w-[44%] shrink-0">
          <MiniCard p={p} i={1} />
        </div>
        <div className="w-[44%] shrink-0">
          <MiniCard p={p} i={2} />
        </div>
      </div>
      <div className="flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-[3px] rounded-full"
            style={{
              background: i === 0 ? p.accent : p.sub,
              opacity: i === 0 ? 0.9 : 0.35,
            }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function Grid({ p }: { p: Palette }) {
  return (
    <div
      className="grid h-full w-full grid-cols-3 content-center gap-1.5 p-3"
      style={{ background: p.page }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <MiniCard key={i} p={p} i={i} pad="p-1" name={false} quote={false} />
      ))}
    </div>
  );
}

function Masonry({ p }: { p: Palette }) {
  return (
    <div
      className="grid h-full w-full grid-cols-2 content-center gap-1.5 p-3"
      style={{ background: p.page }}
    >
      <div className="space-y-1.5">
        <MiniCard p={p} i={0} />
        <MiniCard p={p} i={1} stars={false} />
      </div>
      <div className="space-y-1.5">
        <MiniCard p={p} i={2} quote={false} />
        <MiniCard p={p} i={3} />
      </div>
    </div>
  );
}

function ListLayout({ p }: { p: Palette }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-center gap-1.5 px-4"
      style={{ background: p.page }}
    >
      {Array.from({ length: 3 }).map((_, i) => {
        const person = PEOPLE[i % PEOPLE.length];
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-[3px] border p-1.5"
            style={{ background: p.surface, borderColor: p.line }}
          >
            <span
              className="flex size-3 shrink-0 items-center justify-center rounded-full font-semibold text-white"
              style={{ background: p.accent, fontSize: "6px", lineHeight: 1 }}
              aria-hidden
            >
              {person.initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span
                  className="truncate font-semibold leading-none"
                  style={{ color: p.text, opacity: 0.85, fontSize: "5.5px" }}
                  aria-hidden
                >
                  {person.name}
                </span>
                <Stars color={p.accent} size={3.5} />
              </div>
              <Quote p={p} text={person.quote} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Wall({ p }: { p: Palette }) {
  return (
    <div className="flex h-full w-full flex-col" style={{ background: p.page }}>
      <div className="flex flex-col items-center gap-0.5 pt-2.5">
        <div
          className="h-[3px] w-16 rounded-full"
          style={{ background: p.text, opacity: 0.7 }}
          aria-hidden
        />
        <div
          className="h-[2px] w-10 rounded-full"
          style={{ background: p.sub, opacity: 0.5 }}
          aria-hidden
        />
      </div>
      <div className="grid flex-1 grid-cols-4 content-center gap-1 px-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <MiniCard
            key={i}
            p={p}
            i={i}
            pad="p-1"
            stars={i % 2 === 0}
            name={false}
            quote={false}
          />
        ))}
      </div>
    </div>
  );
}

const LAYOUTS: Record<Layout, (args: { p: Palette }) => React.ReactElement> = {
  carousel: Carousel,
  grid: Grid,
  masonry: Masonry,
  list: ListLayout,
  wall: Wall,
};

export const WidgetLayoutPreview = React.memo(function WidgetLayoutPreview({
  layout,
  accent = "#6366f1",
  theme = "light",
  inactive = false,
  className,
}: WidgetLayoutPreviewProps) {
  const p = palette(accent, theme === "dark");
  const Preview = LAYOUTS[layout] ?? Grid;

  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden transition-opacity",
        inactive && "opacity-50 grayscale",
        className,
      )}
      role="img"
      aria-label={`Layout diagram: ${layoutLabel(layout)}`}
    >
      <Preview p={p} />
    </div>
  );
});
