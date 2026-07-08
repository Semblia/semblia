"use client";

/**
 * Setup section — what this widget is: its name, its kind (chosen at
 * creation), and where it shows up. Wall widgets also get their page
 * settings here (rendered by the panel switcher as WallSection).
 */

import * as React from "react";
import { Code as EmbedIcon, Globe as WallIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { Field, Section } from "./studio-primitives";

export function SetupSection({
  widgetId,
  onRename,
}: {
  widgetId: string;
  onRename: (name: string) => void;
}) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);

  if (!draft) return null;
  const isWall = draft.kind === "wall";
  const KindIcon = isWall ? WallIcon : EmbedIcon;

  return (
    <section className="px-5 py-5">
      <div className="flex flex-col gap-7">
        <Section
          title="Name"
          description="Only you see this — it labels the widget in your list."
        >
          <NameField name={draft.name} onCommit={onRename} />
        </Section>

        <Section title="Type">
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <KindIcon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {isWall ? "Wall of love" : "Embedded widget"}
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {isWall
                  ? "A hosted page we run for you — share its link anywhere."
                  : "Lives inside your own website via a small snippet."}
              </p>
            </div>
          </div>
        </Section>

        {!isWall && (
          <Section title="Placement">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The website around the preview is a stand-in so you can judge the
              widget in context — visitors will see it on your real site. When
              you&apos;re ready, grab the snippet from{" "}
              <span className="font-medium text-foreground">Publish</span>.
            </p>
          </Section>
        )}
      </div>
    </section>
  );
}

/** Commits on blur/Enter so we don't hit the server per keystroke. */
function NameField({
  name,
  onCommit,
}: {
  name: string;
  onCommit: (name: string) => void;
}) {
  const [value, setValue] = React.useState(name);
  React.useEffect(() => setValue(name), [name]);

  const commit = () => {
    const next = value.trim();
    if (!next || next === name) {
      setValue(name);
      return;
    }
    onCommit(next);
  };

  return (
    <Field label="Widget name" htmlFor="w-name">
      <Input
        id="w-name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setValue(name);
        }}
        placeholder="Homepage testimonials"
      />
    </Field>
  );
}
