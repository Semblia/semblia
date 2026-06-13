import * as React from "react";
import { PageBody, PageHeader } from "@/components/shared";

interface ProjectPageShellProps {
  title: string;
  /** @deprecated Page subheadings were removed for cross-tab consistency. */
  description?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function ProjectPageShell({
  title,
  headerAction,
  children,
}: ProjectPageShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader contained title={title} actions={headerAction} />
      <PageBody contained padding="default">
        {children}
      </PageBody>
    </div>
  );
}
