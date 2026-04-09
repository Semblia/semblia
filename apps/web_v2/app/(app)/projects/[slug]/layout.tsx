import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/mock-data";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return <>{children}</>;
}
