import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import {
  CreateKeyForm,
  type ApiKeyType,
} from "@/components/developers/keys/create-key-form";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `New key — ${project.name}` : "New key" };
}

function resolveType(raw: string | string[] | undefined): ApiKeyType {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "PUBLISHABLE" ? "PUBLISHABLE" : "SECRET";
}

export default async function NewApiKeyPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const [{ slug }, search] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  const type = resolveType(search.type);
  return <CreateKeyForm type={type} slug={slug} />;
}
