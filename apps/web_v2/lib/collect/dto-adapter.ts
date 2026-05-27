import type { V2FormConfigEntry } from "@workspace/types";
import type { FormConfigEntry, LayoutConfig } from "@/lib/collect/studio-types";

function extractLayout(config: unknown): LayoutConfig | null {
  if (!config || typeof config !== "object") return null;
  const maybe = (config as { layout?: unknown }).layout;
  if (!maybe || typeof maybe !== "object") return null;
  const m = maybe as Partial<LayoutConfig>;
  if (
    typeof m.flow !== "string" ||
    typeof m.container !== "string" ||
    typeof m.hero !== "string"
  ) {
    return null;
  }
  return m as LayoutConfig;
}

export function dtoToFormConfigEntry(
  dto: V2FormConfigEntry,
  config?: unknown,
): FormConfigEntry {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive,
    abWeight: dto.abWeight,
    createdAt: Date.parse(dto.createdAt),
    updatedAt: Date.parse(dto.updatedAt),
    submissions: dto.submissions,
    views: dto.views,
    responseRate: dto.responseRate,
    avgRating: dto.avgRating,
    lastSubmissionAt:
      dto.lastSubmissionAt != null ? Date.parse(dto.lastSubmissionAt) : null,
    layout: extractLayout(config),
  };
}
