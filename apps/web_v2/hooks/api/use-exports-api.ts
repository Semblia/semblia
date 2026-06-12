"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  createCsvExport,
  downloadExport,
  fetchExportDeliveries,
  fetchExportDelivery,
  type ExportDeliveriesParams,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useExportDeliveries(
  slug: string,
  params?: ExportDeliveriesParams,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.exports.deliveries(slug, params),
    queryFn: async () => {
      const token = await getToken();
      return fetchExportDeliveries(token, slug, params);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useExportDelivery(
  slug: string,
  deliveryId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.exports.delivery(slug, deliveryId),
    queryFn: async () => {
      const token = await getToken();
      return fetchExportDelivery(token, slug, deliveryId);
    },
    enabled: isSignedIn === true && !!slug && !!deliveryId,
    ...liveQueryOptions(options),
  });
}

export function useCreateCsvExport(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body?: Parameters<typeof createCsvExport>[2]) => {
      const token = await getToken();
      return createCsvExport(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exports.deliveries(slug) });
    },
  });
}

/**
 * Fetches a completed export artifact. The caller is responsible for turning
 * the returned blob into a browser download (object URL + anchor click) so the
 * hook stays free of DOM side-effects and remains testable.
 */
export function useDownloadExport(slug: string) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const token = await getToken();
      return downloadExport(token, slug, deliveryId);
    },
  });
}
