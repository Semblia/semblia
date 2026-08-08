import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignSystemContent } from "./design-content";

export const metadata: Metadata = {
  title: "Design System — Semblia",
  description:
    "A comprehensive showcase of every shadcn/ui component, color token, typography scale, and design detail powering the Semblia platform.",
};

export default function DesignPage() {
  // Internal engineering reference — every primitive state renders here for
  // development review, but it is not a customer surface.
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSystemContent />;
}
