import * as React from "react";
import { PageBody, PageHeader } from "@/components/shared";

interface ProjectPageShellProps {
  title: string;
  description?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function ProjectPageShell({
  title,
  description,
  headerAction,
  children,
}: ProjectPageShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={title}
        description={description}
        actions={headerAction}
      />
      <PageBody padding="default">{children}</PageBody>
    </div>
  );
}
