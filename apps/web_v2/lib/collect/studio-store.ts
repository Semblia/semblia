import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  DesignTokens,
  FormConfigEntry,
  LayoutConfig,
  StudioConfig,
  StudioDevice,
  StudioQuestion,
} from "./studio-types";
import {
  buildDefaultStudioConfig,
  DEFAULT_LAYOUT,
  LAYOUT_PRESETS,
  STYLE_PRESETS,
} from "./studio-presets";

// ── Snapshot (per form) ─────────────────────────────────────────────────────

export interface StudioSnapshot {
  draft: StudioConfig;
  saved: StudioConfig;
  savedAt: number;
  /** Incremented on every draft mutation — O(1) dirty check. */
  draftVersion: number;
  /** Set to draftVersion on save. */
  savedVersion: number;
}

// ── Store shape ─────────────────────────────────────────────────────────────

interface StudioStore {
  /** project slug → form entry list (metadata). */
  formsByProject: Record<string, FormConfigEntry[]>;
  /** formId → draft/saved snapshot. */
  snapshots: Record<string, StudioSnapshot>;
  /** Current preview device (NOT persisted). */
  device: StudioDevice;

  // ─── Project-level actions ───────────────────────────────
  ensureProject: (slug: string) => string;
  createForm: (slug: string, name?: string) => string;
  deleteForm: (slug: string, formId: string) => void;
  duplicateForm: (slug: string, formId: string) => string;
  updateFormEntry: (
    slug: string,
    formId: string,
    patch: Partial<Pick<FormConfigEntry, "name" | "description" | "isActive" | "abWeight">>,
  ) => void;

  // ─── Draft-level actions (keyed by formId) ───────────────
  setToken: <K extends keyof DesignTokens>(formId: string, key: K, value: DesignTokens[K]) => void;
  setTokens: (formId: string, tokens: DesignTokens) => void;
  applyStylePreset: (formId: string, presetId: string) => void;
  applyLayoutPreset: (formId: string, presetId: string) => void;
  updateLayout: (formId: string, patch: Partial<LayoutConfig>) => void;
  setQuestions: (formId: string, questions: StudioQuestion[]) => void;
  setHeadline: (formId: string, headline: string) => void;
  setSubhead: (formId: string, subhead: string) => void;
  setBrandName: (formId: string, name: string) => void;
  setDevice: (device: StudioDevice) => void;
  save: (formId: string) => void;
  reset: (formId: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as const;

let _idCounter = 0;
function newFormId(): string {
  _idCounter += 1;
  return `f_${Date.now()}_${_idCounter}`;
}

function patchDraft(
  state: StudioStore,
  formId: string,
  fn: (draft: StudioConfig) => StudioConfig,
): Partial<StudioStore> {
  const snap = state.snapshots[formId];
  if (!snap) return {};
  return {
    snapshots: {
      ...state.snapshots,
      [formId]: {
        ...snap,
        draft: fn(snap.draft),
        draftVersion: snap.draftVersion + 1,
      },
    },
  };
}

function makeSnapshot(config: StudioConfig): StudioSnapshot {
  return {
    draft: config,
    saved: structuredClone(config),
    savedAt: Date.now(),
    draftVersion: 0,
    savedVersion: 0,
  };
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      formsByProject: {},
      snapshots: {},
      device: "desktop",

      // ─── Project-level actions ─────────────────────────────

      ensureProject: (slug) => {
        const existing = get().formsByProject[slug];
        if (existing && existing.length > 0) return existing[0].id;

        const formId = newFormId();
        const now = Date.now();
        const initial = buildDefaultStudioConfig();
        set((s) => ({
          formsByProject: {
            ...s.formsByProject,
            [slug]: [
              {
                id: formId,
                name: "Default Form",
                description: "Primary testimonial collection form",
                isActive: true,
                abWeight: 100,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
          snapshots: { ...s.snapshots, [formId]: makeSnapshot(initial) },
        }));
        return formId;
      },

      createForm: (slug, name) => {
        const formId = newFormId();
        const now = Date.now();
        const initial = buildDefaultStudioConfig();
        const entry: FormConfigEntry = {
          id: formId,
          name: name ?? `Form ${(get().formsByProject[slug]?.length ?? 0) + 1}`,
          description: "",
          isActive: false,
          abWeight: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          formsByProject: {
            ...s.formsByProject,
            [slug]: [...(s.formsByProject[slug] ?? []), entry],
          },
          snapshots: { ...s.snapshots, [formId]: makeSnapshot(initial) },
        }));
        return formId;
      },

      deleteForm: (slug, formId) => {
        set((s) => {
          const forms = (s.formsByProject[slug] ?? []).filter((f) => f.id !== formId);
          const { [formId]: _removed, ...remaining } = s.snapshots;
          return {
            formsByProject: { ...s.formsByProject, [slug]: forms },
            snapshots: remaining,
          };
        });
      },

      duplicateForm: (slug, formId) => {
        const snap = get().snapshots[formId];
        const forms = get().formsByProject[slug] ?? [];
        const source = forms.find((f) => f.id === formId);
        if (!snap || !source) return formId;

        const newId = newFormId();
        const now = Date.now();
        const entry: FormConfigEntry = {
          id: newId,
          name: `${source.name} (copy)`,
          description: source.description,
          isActive: false,
          abWeight: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          formsByProject: {
            ...s.formsByProject,
            [slug]: [...(s.formsByProject[slug] ?? []), entry],
          },
          snapshots: {
            ...s.snapshots,
            [newId]: makeSnapshot(structuredClone(snap.saved)),
          },
        }));
        return newId;
      },

      updateFormEntry: (slug, formId, patch) => {
        set((s) => ({
          formsByProject: {
            ...s.formsByProject,
            [slug]: (s.formsByProject[slug] ?? []).map((f) =>
              f.id === formId ? { ...f, ...patch, updatedAt: Date.now() } : f,
            ),
          },
        }));
      },

      // ─── Draft-level actions ───────────────────────────────

      setToken: (formId, key, value) =>
        set((s) =>
          patchDraft(s, formId, (d) => ({
            ...d,
            tokens: { ...d.tokens, [key]: value },
            preset: "custom",
          })),
        ),

      setTokens: (formId, tokens) =>
        set((s) => patchDraft(s, formId, (d) => ({ ...d, tokens }))),

      applyStylePreset: (formId, presetId) => {
        const p = STYLE_PRESETS[presetId];
        if (!p) return;
        set((s) =>
          patchDraft(s, formId, (d) => ({
            ...d,
            tokens: { ...p.tokens },
            brandName: p.tokens.brandName,
            preset: presetId,
          })),
        );
      },

      applyLayoutPreset: (formId, presetId) => {
        const p = LAYOUT_PRESETS[presetId];
        if (!p) return;
        set((s) =>
          patchDraft(s, formId, (d) => ({
            ...d,
            layout: { ...DEFAULT_LAYOUT, ...p.config },
            layoutPreset: presetId,
          })),
        );
      },

      updateLayout: (formId, patch) =>
        set((s) =>
          patchDraft(s, formId, (d) => ({
            ...d,
            layout: { ...d.layout, ...patch },
            layoutPreset: "custom",
          })),
        ),

      setQuestions: (formId, questions) =>
        set((s) => patchDraft(s, formId, (d) => ({ ...d, questions }))),

      setHeadline: (formId, headline) =>
        set((s) => patchDraft(s, formId, (d) => ({ ...d, headline }))),

      setSubhead: (formId, subhead) =>
        set((s) => patchDraft(s, formId, (d) => ({ ...d, subhead }))),

      setBrandName: (formId, brandName) =>
        set((s) => patchDraft(s, formId, (d) => ({ ...d, brandName }))),

      setDevice: (device) => set({ device }),

      save: (formId) => {
        const snap = get().snapshots[formId];
        if (!snap) return;
        set((s) => ({
          snapshots: {
            ...s.snapshots,
            [formId]: {
              draft: snap.draft,
              saved: structuredClone(snap.draft),
              savedAt: Date.now(),
              draftVersion: snap.draftVersion,
              savedVersion: snap.draftVersion,
            },
          },
        }));
      },

      reset: (formId) => {
        const snap = get().snapshots[formId];
        if (!snap) return;
        set((s) => ({
          snapshots: {
            ...s.snapshots,
            [formId]: {
              ...snap,
              draft: structuredClone(snap.saved),
              draftVersion: snap.savedVersion,
            },
          },
        }));
      },
    }),
    {
      name: "tresta:studio-configs:v1",
      version: 2,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      migrate: (persisted, version) => {
        if (version < 2) {
          // v1 → v2: bySlug → formsByProject + snapshots
          const state = persisted as Record<string, unknown>;
          const bySlug = (state.bySlug ?? {}) as Record<
            string,
            { draft: StudioConfig; saved: StudioConfig; savedAt: number }
          >;
          const formsByProject: Record<string, FormConfigEntry[]> = {};
          const snapshots: Record<string, StudioSnapshot> = {};

          for (const [slug, snap] of Object.entries(bySlug)) {
            const formId = `migrated_${slug}`;
            formsByProject[slug] = [
              {
                id: formId,
                name: "Default Form",
                description: "",
                isActive: true,
                abWeight: 100,
                createdAt: snap.savedAt ?? Date.now(),
                updatedAt: snap.savedAt ?? Date.now(),
              },
            ];
            snapshots[formId] = {
              draft: snap.draft,
              saved: snap.saved,
              savedAt: snap.savedAt,
              draftVersion: 1,
              savedVersion: 0,
            };
          }

          return { formsByProject, snapshots, device: "desktop" } as unknown as StudioStore;
        }
        return persisted as StudioStore;
      },
      partialize: (state) => ({
        formsByProject: state.formsByProject,
        snapshots: state.snapshots,
      }),
    },
  ),
);

// ── Selectors ───────────────────────────────────────────────────────────────

export function isStudioDirty(snap: StudioSnapshot | undefined): boolean {
  if (!snap) return false;
  return snap.draftVersion !== snap.savedVersion;
}
