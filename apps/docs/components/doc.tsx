import type { ReactNode } from "react";

/** Shared prose primitives so every docs page reads identically. */

export function DocTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
      {children}
    </h1>
  );
}

export function DocLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function DocH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  );
}

export function DocP({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="doc-inline-code text-foreground">{children}</code>;
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="doc-code mt-4 text-foreground">
      <code>{children}</code>
    </pre>
  );
}

export function DocList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
