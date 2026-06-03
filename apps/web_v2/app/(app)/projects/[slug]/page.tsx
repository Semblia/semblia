import { redirect } from "next/navigation";

export default async function ProjectHubPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  redirect(`/projects/${slug}/responses`);
}
