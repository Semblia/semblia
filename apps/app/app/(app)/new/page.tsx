import type { Metadata } from "next";
import { ProjectCreateClient } from "@/components/projects/project-create-client";

export const metadata: Metadata = {
  title: "New project",
};

export default function NewProjectPage() {
  return <ProjectCreateClient />;
}
