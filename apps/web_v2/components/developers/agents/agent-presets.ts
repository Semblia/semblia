import type { V2AgentAccessPresetDTO, V2ApiKeyScope } from "@workspace/types";

/**
 * Which preset an agent key was cut from.
 *
 * The API stores the preset's scopes on the key, not the preset id, so the only
 * way back is to compare scope sets. A key whose scopes have since diverged
 * from every preset is genuinely custom, and says so rather than being
 * mislabelled with the closest match.
 */
export function findMatchingPreset(
  scopes: readonly V2ApiKeyScope[] | readonly string[],
  presets: V2AgentAccessPresetDTO[],
): V2AgentAccessPresetDTO | null {
  const held = new Set<string>(scopes);
  return (
    presets.find(
      (preset) =>
        preset.scopes.length === held.size &&
        preset.scopes.every((scope) => held.has(scope)),
    ) ?? null
  );
}

/** The descriptor an agent key row and detail page both read. */
export function presetLabel(
  scopes: readonly V2ApiKeyScope[] | readonly string[],
  presets: V2AgentAccessPresetDTO[],
): string {
  return findMatchingPreset(scopes, presets)?.label ?? "Custom scopes";
}
