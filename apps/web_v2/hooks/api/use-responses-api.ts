"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { fetchResponses } from "@/lib/semblia-api";
import { type ApiQueryOptions, liveQueryOptions } from "./query-options";

/**
 * Approved + published responses for a project, used to populate the widget
 * studio preview with real testimonials (falls back to curated demo content
 * when a project has too few). Capped to a small page — this is preview fodder,
 * not the moderation inbox.
 */
export function useApprovedResponses(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["v2", "responses", slug, "approved-preview"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetchResponses(token, slug, {
        reviewStatus: "APPROVED",
        publishStatus: "PUBLISHED",
        pageSize: 12,
      });
      return res.items;
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}
