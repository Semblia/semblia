"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type {
  V2ConfirmUploadBody,
  V2CreateUploadIntentBody,
  V2PublicCreateUploadIntentBody,
} from "@workspace/types";
import {
  confirmUpload,
  createPublicUploadIntent,
  createUploadIntent,
  deleteMediaAsset,
} from "@/lib/tresta-api";
import { queryKeys } from "./keys";

export function useCreateUploadIntent() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (body: V2CreateUploadIntentBody) => {
      const token = await getToken();
      return createUploadIntent(token, body);
    },
  });
}

export function useConfirmUpload() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      body,
    }: {
      assetId: string;
      body: V2ConfirmUploadBody;
    }) => {
      const token = await getToken();
      return confirmUpload(token, assetId, body);
    },
    onSuccess: (asset) => {
      qc.setQueryData(queryKeys.media.asset(asset.id), asset);
      qc.invalidateQueries({ queryKey: queryKeys.media.all });
    },
  });
}

export function useCreatePublicUploadIntent(slug: string) {
  return useMutation({
    mutationFn: async (body: V2PublicCreateUploadIntentBody) =>
      createPublicUploadIntent(slug, body),
  });
}

export function useDeleteMediaAsset() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const token = await getToken();
      return deleteMediaAsset(token, assetId);
    },
    onSuccess: (asset) => {
      qc.setQueryData(queryKeys.media.asset(asset.id), asset);
      qc.invalidateQueries({ queryKey: queryKeys.media.all });
    },
  });
}
