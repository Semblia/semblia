"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { V2MediaAssetDTO } from "@workspace/types";
import { useForm, useFormDraft } from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { saveFormDraft } from "@/lib/tresta-api";
import type {
  DesignTokens,
  FormConfig,
  LayoutConfig,
  LoaderConfig,
  StudioDevice,
  StudioQuestion,
  SuccessConfig,
  QuestionType,
} from "@/lib/collect/studio-types";
import { QUESTION_TYPE_META } from "@/lib/collect/studio-types";
import {
  ALL_PRESETS,
  buildDefaultFormConfig,
  randomTokens,
  withConfigDefaults,
} from "@/lib/collect/studio-presets";

/** Which of the three preview screens the canvas is showing. */
export type StudioScreen = "loader" | "form" | "success";
/** Preview-only flow override (not persisted) demoing single-page vs stepped. */
export type PreviewFlow = "all" | "stepped";

interface StudioDraftCtxValue {
  ready: boolean;
  slug: string;
  formId: string;
  draft: FormConfig;
  device: StudioDevice;
  screen: StudioScreen;
  previewFlow: PreviewFlow;
  dirty: boolean;
  isSaving: boolean;
  // ── tokens / style ──
  setToken: <K extends keyof DesignTokens>(
    key: K,
    value: DesignTokens[K],
  ) => void;
  setTokens: (tokens: DesignTokens) => void;
  applyStylePreset: (presetId: string) => void;
  randomize: () => void;
  // ── content ──
  setHeadline: (headline: string) => void;
  setSubhead: (subhead: string) => void;
  setBrandName: (name: string) => void;
  setSubmitLabel: (label: string) => void;
  setLogo: (asset: V2MediaAssetDTO | null) => void;
  // ── questions ──
  addQuestion: (type: QuestionType) => void;
  updateQuestion: (id: string, patch: Partial<StudioQuestion>) => void;
  removeQuestion: (id: string) => void;
  moveQuestion: (id: string, dir: -1 | 1) => void;
  duplicateQuestion: (id: string) => void;
  // ── layout / screens ──
  setLayout: (patch: Partial<LayoutConfig>) => void;
  setLoader: (patch: Partial<LoaderConfig>) => void;
  setSuccess: (patch: Partial<SuccessConfig>) => void;
  // ── preview chrome ──
  setDevice: (device: StudioDevice) => void;
  setScreen: (screen: StudioScreen) => void;
  setPreviewFlow: (flow: PreviewFlow) => void;
  // ── persistence ──
  save: () => Promise<void>;
  reset: () => void;
}

const StudioDraftContext = React.createContext<StudioDraftCtxValue | null>(
  null,
);

export function useStudioDraft(): StudioDraftCtxValue {
  const ctx = React.useContext(StudioDraftContext);
  if (!ctx) {
    throw new Error("useStudioDraft must be used inside <StudioDraftProvider>");
  }
  return ctx;
}

function coerceFormConfig(raw: unknown): FormConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<FormConfig>;
  if (!candidate.tokens || typeof candidate.tokens !== "object") return null;
  return withConfigDefaults(candidate);
}

function newQuestionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeQuestion(type: QuestionType): StudioQuestion {
  const meta = QUESTION_TYPE_META[type];
  return {
    id: newQuestionId(),
    type,
    label: meta.defaultLabel,
    placeholder: type === "shorttext" || type === "longtext" ? "" : undefined,
    required: false,
    options: meta.hasOptions ? ["Option 1", "Option 2"] : undefined,
    showIf: null,
  };
}

export function StudioDraftProvider({
  slug,
  formId,
  children,
}: {
  slug: string;
  formId: string;
  children: React.ReactNode;
}) {
  const formQuery = useForm(slug, formId);
  const draftQuery = useFormDraft(slug, formId);
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const publishedConfig = React.useMemo<FormConfig | null>(() => {
    const data = formQuery.data;
    if (!data) return null;
    return coerceFormConfig(data.config) ?? buildDefaultFormConfig();
  }, [formQuery.data]);

  const remoteDraft = React.useMemo<FormConfig | null>(() => {
    const data = draftQuery.data;
    if (!data?.draft) return null;
    return coerceFormConfig(data.draft);
  }, [draftQuery.data]);

  const initialDraft = React.useMemo<FormConfig | null>(() => {
    if (remoteDraft) return remoteDraft;
    return publishedConfig;
  }, [publishedConfig, remoteDraft]);

  const [draft, setDraft] = React.useState<FormConfig | null>(null);
  const [savedBaseline, setSavedBaseline] = React.useState<FormConfig | null>(
    null,
  );
  const [device, setDevice] = React.useState<StudioDevice>("desktop");
  const [screen, setScreen] = React.useState<StudioScreen>("form");
  const [previewFlow, setPreviewFlow] = React.useState<PreviewFlow>("all");
  const seededRef = React.useRef(false);

  React.useEffect(() => {
    if (seededRef.current) return;
    if (!initialDraft) return;
    seededRef.current = true;
    setDraft(initialDraft);
    setSavedBaseline(initialDraft);
    setPreviewFlow(initialDraft.layout.flow === "stepped" ? "stepped" : "all");
  }, [initialDraft]);

  const saveMutation = useMutation({
    mutationFn: async (body: FormConfig) => {
      const token = await getToken();
      const expectedVersion = draftQuery.data?.version ?? 0;
      return saveFormDraft(token, slug, formId, {
        draft: body as unknown as Record<string, unknown>,
        expectedVersion,
      });
    },
    onSuccess: (data, body) => {
      qc.setQueryData(queryKeys.forms.draft(slug, formId), data);
      setSavedBaseline(body);
    },
  });

  const dirty = React.useMemo(() => {
    if (!draft || !savedBaseline) return false;
    return JSON.stringify(draft) !== JSON.stringify(savedBaseline);
  }, [draft, savedBaseline]);

  const value = React.useMemo<StudioDraftCtxValue | null>(() => {
    if (!draft) return null;

    const patch = (fn: (d: FormConfig) => FormConfig) =>
      setDraft((prev) => (prev ? fn(prev) : prev));

    return {
      ready: true,
      slug,
      formId,
      draft,
      device,
      screen,
      previewFlow,
      dirty,
      isSaving: saveMutation.isPending,
      setToken: (key, value) =>
        patch((d) => ({
          ...d,
          tokens: { ...d.tokens, [key]: value },
          preset: "custom",
        })),
      setTokens: (tokens) => patch((d) => ({ ...d, tokens })),
      applyStylePreset: (presetId) => {
        const preset = ALL_PRESETS[presetId];
        if (!preset) return;
        patch((d) => ({
          ...d,
          tokens: { ...preset.tokens },
          brandName: preset.tokens.brandName,
          preset: presetId,
        }));
      },
      randomize: () => {
        const tokens = randomTokens();
        patch((d) => ({
          ...d,
          tokens,
          brandName: tokens.brandName,
          preset: "custom",
        }));
      },
      setHeadline: (headline) => patch((d) => ({ ...d, headline })),
      setSubhead: (subhead) => patch((d) => ({ ...d, subhead })),
      setBrandName: (brandName) => patch((d) => ({ ...d, brandName })),
      setSubmitLabel: (submitLabel) => patch((d) => ({ ...d, submitLabel })),
      setLogo: (asset) =>
        patch((d) => ({
          ...d,
          logoUrl: asset?.url ?? null,
          logoAssetId: asset?.id ?? null,
        })),
      addQuestion: (type) =>
        patch((d) => ({
          ...d,
          questions: [...d.questions, makeQuestion(type)],
        })),
      updateQuestion: (id, qpatch) =>
        patch((d) => ({
          ...d,
          questions: d.questions.map((q) =>
            q.id === id ? { ...q, ...qpatch } : q,
          ),
        })),
      removeQuestion: (id) =>
        patch((d) => ({
          ...d,
          questions: d.questions.filter((q) => q.id !== id),
        })),
      moveQuestion: (id, dir) =>
        patch((d) => {
          const idx = d.questions.findIndex((q) => q.id === id);
          const next = idx + dir;
          if (idx < 0 || next < 0 || next >= d.questions.length) return d;
          const questions = [...d.questions];
          [questions[idx], questions[next]] = [questions[next], questions[idx]];
          return { ...d, questions };
        }),
      duplicateQuestion: (id) =>
        patch((d) => {
          const idx = d.questions.findIndex((q) => q.id === id);
          if (idx < 0) return d;
          const clone: StudioQuestion = {
            ...d.questions[idx],
            id: newQuestionId(),
            showIf: null,
          };
          const questions = [...d.questions];
          questions.splice(idx + 1, 0, clone);
          return { ...d, questions };
        }),
      setLayout: (lpatch) =>
        patch((d) => ({ ...d, layout: { ...d.layout, ...lpatch } })),
      setLoader: (lpatch) =>
        patch((d) => ({ ...d, loader: { ...d.loader, ...lpatch } })),
      setSuccess: (spatch) =>
        patch((d) => ({ ...d, success: { ...d.success, ...spatch } })),
      setDevice,
      setScreen,
      setPreviewFlow,
      save: async () => {
        if (!draft) return;
        await saveMutation.mutateAsync(draft);
      },
      reset: () => {
        if (savedBaseline) setDraft(savedBaseline);
      },
    };
  }, [
    draft,
    device,
    screen,
    previewFlow,
    dirty,
    saveMutation,
    savedBaseline,
    slug,
    formId,
  ]);

  if (!value) return null;

  return (
    <StudioDraftContext.Provider value={value}>
      {children}
    </StudioDraftContext.Provider>
  );
}
