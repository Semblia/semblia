/**
 * Widget studio store — zustand + persist.
 *
 * Mirrors the proven `apps/web_v2/lib/collect/studio-store.ts` pattern with
 * widget-specific actions. Persists to a SEPARATE storage key so it never
 * collides with the form studio's snapshots.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { WidgetBrandThemeInputs } from "@workspace/widgets-core/schema";
import type {
  WallConfig,
  WidgetBehavior,
  WidgetCardStyle,
  WidgetContentConfig,
  WidgetContentMode,
  WidgetDensity,
  WidgetDesignTokens,
  WidgetDevice,
  WidgetKind,
  WidgetLayout,
  WidgetListEntry,
  WidgetStudioConfig,
  WidgetTheme,
  WidgetVisibility,
} from "./widget-types";
import {
  STYLE_PRESETS,
  buildDefaultWidgetConfig,
  randomThemeInputs,
  syncStudioConfig,
} from "./widget-presets";

// ── Snapshot ────────────────────────────────────────────────────────────────

export interface WidgetSnapshot {
  draft: WidgetStudioConfig;
  saved: WidgetStudioConfig;
  savedAt: number;
  /** Increments on every mutation; used for O(1) dirty check. */
  draftVersion: number;
  /** Set to `draftVersion` on save. */
  savedVersion: number;
  /** Set on creation; cleared after first save (for the celebrate moment). */
  isFirstRun: boolean;
}

// ── Store shape ─────────────────────────────────────────────────────────────

interface WidgetStudioStore {
  /** project slug → ordered widget list (metadata, not full config). */
  widgetsByProject: Record<string, WidgetListEntry[]>;
  /** widgetId → snapshot. */
  snapshots: Record<string, WidgetSnapshot>;
  /** Current preview device (NOT persisted). */
  device: WidgetDevice;

  // ── Project-level ──────────────────────────────────────────────
  ensureProject: (slug: string, opts?: { brandColor?: string | null }) => void;
  createWidget: (
    slug: string,
    opts: {
      kind: WidgetKind;
      layout?: WidgetLayout;
      brandColor?: string | null;
      name?: string;
    },
  ) => string;
  deleteWidget: (slug: string, widgetId: string) => void;
  duplicateWidget: (slug: string, widgetId: string) => string;
  updateWidgetEntry: (
    slug: string,
    widgetId: string,
    patch: Partial<Pick<WidgetListEntry, "name" | "isActive">>,
  ) => void;

  // ── Draft mutations (keyed by widgetId) ────────────────────────
  setLayout: (widgetId: string, layout: WidgetLayout) => void;
  setKind: (widgetId: string, kind: WidgetKind) => void;
  setTheme: (widgetId: string, theme: WidgetTheme) => void;
  setThemeInput: <K extends keyof WidgetBrandThemeInputs>(
    widgetId: string,
    key: K,
    value: WidgetBrandThemeInputs[K],
  ) => void;
  setToken: <K extends keyof WidgetDesignTokens>(
    widgetId: string,
    key: K,
    value: WidgetDesignTokens[K],
  ) => void;
  setTokens: (widgetId: string, tokens: WidgetDesignTokens) => void;
  applyStylePreset: (widgetId: string, presetId: string) => void;
  setCardStyle: (widgetId: string, style: WidgetCardStyle) => void;
  setDensity: (widgetId: string, density: WidgetDensity) => void;
  setVisibility: (widgetId: string, patch: Partial<WidgetVisibility>) => void;
  setBehavior: (widgetId: string, patch: Partial<WidgetBehavior>) => void;
  setContent: (widgetId: string, patch: Partial<WidgetContentConfig>) => void;
  setContentMode: (widgetId: string, mode: WidgetContentMode) => void;
  toggleContentPick: (widgetId: string, submissionId: string) => void;
  reorderContentPicks: (widgetId: string, ids: string[]) => void;
  setWall: (widgetId: string, patch: Partial<WallConfig>) => void;
  setName: (widgetId: string, name: string) => void;
  randomize: (widgetId: string) => void;

  // ── Preview ────────────────────────────────────────────────────
  setDevice: (device: WidgetDevice) => void;

  // ── Save / reset ───────────────────────────────────────────────
  save: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  clearFirstRun: (widgetId: string) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as const;

let _idCounter = 0;
function newWidgetId(): string {
  _idCounter += 1;
  return `w_${Date.now().toString(36)}_${_idCounter}`;
}

function entryFromConfig(
  id: string,
  config: WidgetStudioConfig,
  base?: Partial<WidgetListEntry>,
): WidgetListEntry {
  return {
    id,
    name: config.name,
    kind: config.kind,
    layout: config.layout,
    theme: config.theme,
    accent: config.definition.theme.brandColor,
    isActive: base?.isActive ?? false,
    createdAt: base?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    metrics: base?.metrics ?? {
      totalLoads: 0,
      avgLoadMs: 0,
      lastLoadAt: null,
    },
  };
}

function snapshotOf(
  config: WidgetStudioConfig,
  isFirstRun: boolean,
): WidgetSnapshot {
  const normalized = syncStudioConfig(config);
  return {
    draft: normalized,
    saved: structuredClone(normalized),
    savedAt: Date.now(),
    draftVersion: 0,
    savedVersion: 0,
    isFirstRun,
  };
}

function patchDraft(
  state: WidgetStudioStore,
  widgetId: string,
  fn: (draft: WidgetStudioConfig) => WidgetStudioConfig,
): Partial<WidgetStudioStore> {
  const snap = state.snapshots[widgetId];
  if (!snap) return {};
  const nextDraft = syncStudioConfig(fn(syncStudioConfig(snap.draft)), {
    fromMirrors: true,
  });
  return {
    snapshots: {
      ...state.snapshots,
      [widgetId]: {
        ...snap,
        draft: nextDraft,
        draftVersion: snap.draftVersion + 1,
      },
    },
  };
}

/**
 * Re-syncs a list entry from the (mutated) draft. Called after layout/kind/
 * theme/name/accent changes so the gallery thumbnail and rail stay current.
 */
function syncEntryFromDraft(
  state: WidgetStudioStore,
  slug: string,
  widgetId: string,
): Partial<WidgetStudioStore> {
  const snap = state.snapshots[widgetId];
  const list = state.widgetsByProject[slug];
  if (!snap || !list) return {};
  const next = list.map((e) =>
    e.id === widgetId
      ? {
          ...e,
          name: snap.draft.name,
          kind: snap.draft.kind,
          layout: snap.draft.layout,
          theme: snap.draft.theme,
          accent: snap.draft.definition.theme.brandColor,
          updatedAt: Date.now(),
        }
      : e,
  );
  return {
    widgetsByProject: { ...state.widgetsByProject, [slug]: next },
  };
}

// ── Seed entries (mock projects start with one starter widget per kind) ─────

const SEEDED_SLUGS = new Set<string>();

function seedProject(
  state: WidgetStudioStore,
  slug: string,
  brandColor: string | null,
): Partial<WidgetStudioStore> {
  if (SEEDED_SLUGS.has(slug)) return {};
  if (state.widgetsByProject[slug]?.length) {
    SEEDED_SLUGS.add(slug);
    return {};
  }

  const carouselId = newWidgetId();
  const wallId = newWidgetId();
  const carousel = buildDefaultWidgetConfig({
    kind: "embed",
    layout: "carousel",
    projectSlug: slug,
    projectBrandColor: brandColor,
    name: "Homepage carousel",
  });
  const wall = buildDefaultWidgetConfig({
    kind: "wall",
    projectSlug: slug,
    projectBrandColor: brandColor,
    name: "Public Wall of Love",
  });

  const now = Date.now();
  const entries: WidgetListEntry[] = [
    {
      ...entryFromConfig(carouselId, carousel),
      isActive: true,
      createdAt: now - 86_400_000 * 14,
      metrics: {
        totalLoads: 4820,
        avgLoadMs: 312,
        lastLoadAt: now - 3_600_000,
      },
    },
    {
      ...entryFromConfig(wallId, wall),
      isActive: true,
      createdAt: now - 86_400_000 * 6,
      metrics: {
        totalLoads: 1203,
        avgLoadMs: 428,
        lastLoadAt: now - 7_200_000,
      },
    },
  ];

  const snapshots: Record<string, WidgetSnapshot> = {
    [carouselId]: snapshotOf(carousel, false),
    [wallId]: snapshotOf(wall, false),
  };

  SEEDED_SLUGS.add(slug);
  return {
    widgetsByProject: {
      ...state.widgetsByProject,
      [slug]: entries,
    },
    snapshots: { ...state.snapshots, ...snapshots },
  };
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useWidgetStudioStore = create<WidgetStudioStore>()(
  persist(
    (set, get) => ({
      widgetsByProject: {},
      snapshots: {},
      device: "desktop",

      // ── Project-level ─────────────────────────────────────
      ensureProject: (slug, opts) => {
        set((s) => seedProject(s, slug, opts?.brandColor ?? null));
      },

      createWidget: (slug, opts) => {
        const id = newWidgetId();
        const config = buildDefaultWidgetConfig({
          kind: opts.kind,
          layout: opts.layout,
          projectSlug: slug,
          projectBrandColor: opts.brandColor,
          name: opts.name,
        });
        set((s) => ({
          widgetsByProject: {
            ...s.widgetsByProject,
            [slug]: [
              ...(s.widgetsByProject[slug] ?? []),
              entryFromConfig(id, config),
            ],
          },
          snapshots: { ...s.snapshots, [id]: snapshotOf(config, true) },
        }));
        return id;
      },

      deleteWidget: (slug, widgetId) => {
        set((s) => {
          const remaining = { ...s.snapshots };
          delete remaining[widgetId];
          return {
            widgetsByProject: {
              ...s.widgetsByProject,
              [slug]: (s.widgetsByProject[slug] ?? []).filter(
                (e) => e.id !== widgetId,
              ),
            },
            snapshots: remaining,
          };
        });
      },

      duplicateWidget: (slug, widgetId) => {
        const snap = get().snapshots[widgetId];
        const list = get().widgetsByProject[slug] ?? [];
        const source = list.find((e) => e.id === widgetId);
        if (!snap || !source) return widgetId;

        const newId = newWidgetId();
        const cloned: WidgetStudioConfig = structuredClone(snap.saved);
        cloned.name = `${cloned.name} (copy)`;
        // Wall slugs must be unique; suffix the duplicate.
        if (cloned.kind === "wall") {
          cloned.wall = {
            ...cloned.wall,
            slug: `${cloned.wall.slug}-copy`.slice(0, 64),
          };
        }
        set((s) => ({
          widgetsByProject: {
            ...s.widgetsByProject,
            [slug]: [
              ...(s.widgetsByProject[slug] ?? []),
              {
                ...entryFromConfig(newId, cloned, { metrics: source.metrics }),
                isActive: false,
              },
            ],
          },
          snapshots: { ...s.snapshots, [newId]: snapshotOf(cloned, false) },
        }));
        return newId;
      },

      updateWidgetEntry: (slug, widgetId, patch) => {
        set((s) => ({
          widgetsByProject: {
            ...s.widgetsByProject,
            [slug]: (s.widgetsByProject[slug] ?? []).map((e) =>
              e.id === widgetId ? { ...e, ...patch, updatedAt: Date.now() } : e,
            ),
          },
        }));
        // If renaming, also update the snapshot draft so the editor reflects.
        if (typeof patch.name === "string") {
          set((s) =>
            patchDraft(s, widgetId, (d) => ({ ...d, name: patch.name! })),
          );
        }
      },

      // ── Draft mutations ────────────────────────────────────
      setLayout: (widgetId, layout) => {
        set((s) => patchDraft(s, widgetId, (d) => ({ ...d, layout })));
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      setKind: (widgetId, kind) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            kind,
            layout:
              kind === "wall"
                ? "wall"
                : d.layout === "wall"
                  ? "grid"
                  : d.layout,
          })),
        );
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      setTheme: (widgetId, theme) => {
        set((s) => patchDraft(s, widgetId, (d) => ({ ...d, theme })));
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      setThemeInput: (widgetId, key, value) => {
        set((s) =>
          patchDraft(s, widgetId, (d) =>
            syncStudioConfig({
              ...d,
              definition: {
                ...d.definition,
                theme: {
                  ...d.definition.theme,
                  [key]: value,
                },
              },
            }),
          ),
        );
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      setToken: (widgetId, key, value) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            tokens: { ...d.tokens, [key]: value, preset: "custom" },
          })),
        );
        if (key === "accent") {
          const slug = findSlugForWidget(get(), widgetId);
          if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
        }
      },

      setTokens: (widgetId, tokens) => {
        set((s) => patchDraft(s, widgetId, (d) => ({ ...d, tokens })));
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      applyStylePreset: (widgetId, presetId) => {
        const preset = STYLE_PRESETS[presetId];
        if (!preset) return;
        set((s) =>
          patchDraft(s, widgetId, (d) =>
            syncStudioConfig({
              ...d,
              definition: {
                ...d.definition,
                theme: { ...preset.theme },
              },
              tokens: { ...preset.tokens },
            }),
          ),
        );
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      setCardStyle: (widgetId, style) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            tokens: { ...d.tokens, cardStyle: style, preset: "custom" },
          })),
        );
      },

      setDensity: (widgetId, density) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            tokens: { ...d.tokens, density, preset: "custom" },
          })),
        );
      },

      setVisibility: (widgetId, patch) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            visibility: { ...d.visibility, ...patch },
          })),
        );
      },

      setBehavior: (widgetId, patch) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            behavior: { ...d.behavior, ...patch },
          })),
        );
      },

      setContent: (widgetId, patch) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            content: { ...d.content, ...patch },
          })),
        );
      },

      setContentMode: (widgetId, mode) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            content: { ...d.content, mode },
          })),
        );
      },

      toggleContentPick: (widgetId, submissionId) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => {
            const has = d.content.pickedIds.includes(submissionId);
            return {
              ...d,
              content: {
                ...d.content,
                pickedIds: has
                  ? d.content.pickedIds.filter((id) => id !== submissionId)
                  : [...d.content.pickedIds, submissionId],
              },
            };
          }),
        );
      },

      reorderContentPicks: (widgetId, ids) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            content: { ...d.content, pickedIds: ids },
          })),
        );
      },

      setWall: (widgetId, patch) => {
        set((s) =>
          patchDraft(s, widgetId, (d) => ({
            ...d,
            wall: { ...d.wall, ...patch },
          })),
        );
      },

      setName: (widgetId, name) => {
        set((s) => patchDraft(s, widgetId, (d) => ({ ...d, name })));
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      randomize: (widgetId) => {
        set((s) =>
          patchDraft(s, widgetId, (d) =>
            syncStudioConfig({
              ...d,
              definition: {
                ...d.definition,
                theme: randomThemeInputs(d.definition.theme),
              },
            }),
          ),
        );
      },

      // ── Preview ──────────────────────────────────────────
      setDevice: (device) => set({ device }),

      // ── Save / Reset ─────────────────────────────────────
      save: (widgetId) => {
        const snap = get().snapshots[widgetId];
        if (!snap) return;
        set((s) => ({
          snapshots: {
            ...s.snapshots,
            [widgetId]: {
              ...snap,
              saved: structuredClone(snap.draft),
              savedAt: Date.now(),
              savedVersion: snap.draftVersion,
            },
          },
        }));
      },

      reset: (widgetId) => {
        const snap = get().snapshots[widgetId];
        if (!snap) return;
        set((s) => ({
          snapshots: {
            ...s.snapshots,
            [widgetId]: {
              ...snap,
              draft: structuredClone(snap.saved),
              draftVersion: snap.savedVersion,
            },
          },
        }));
        const slug = findSlugForWidget(get(), widgetId);
        if (slug) set((s) => syncEntryFromDraft(s, slug, widgetId));
      },

      clearFirstRun: (widgetId) => {
        set((s) => {
          const snap = s.snapshots[widgetId];
          if (!snap || !snap.isFirstRun) return s;
          return {
            snapshots: {
              ...s.snapshots,
              [widgetId]: { ...snap, isFirstRun: false },
            },
          };
        });
      },
    }),
    {
      name: "semblia:widget-studio:v1",
      version: 2,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      partialize: (state) => ({
        widgetsByProject: state.widgetsByProject,
        snapshots: state.snapshots,
      }),
      migrate: (persisted) => {
        const state = persisted as Partial<WidgetStudioStore> | undefined;
        const snapshots = state?.snapshots ?? {};
        return {
          ...state,
          snapshots: Object.fromEntries(
            Object.entries(snapshots).map(([id, snap]) => [
              id,
              {
                ...snap,
                draft: syncStudioConfig(snap.draft),
                saved: syncStudioConfig(snap.saved),
              },
            ]),
          ),
        };
      },
    },
  ),
);

// ── Selectors ───────────────────────────────────────────────────────────────

export function isWidgetDirty(snap: WidgetSnapshot | undefined): boolean {
  if (!snap) return false;
  return snap.draftVersion !== snap.savedVersion;
}

export function findSlugForWidget(
  state: Pick<WidgetStudioStore, "widgetsByProject">,
  widgetId: string,
): string | null {
  for (const [slug, list] of Object.entries(state.widgetsByProject)) {
    if (list?.some((e) => e.id === widgetId)) return slug;
  }
  return null;
}
