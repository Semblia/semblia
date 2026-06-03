import * as React from "react";

interface ResponsesLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ResponsesLayout({
  children,
}: ResponsesLayoutProps) {
  return <>{children}</>;
}
