"use client";

/**
 * The widget studio's curated control surface.
 *
 * Two sources, one boundary file so the rest of the studio imports from a single
 * place: the small local input toolkit (`studio-input-primitives`) and the visual
 * inspector vocabulary shared with the Form Studio (`collect/studio/studio-controls`).
 * The shared vocabulary is design-system-generic (no forms-core coupling), so we
 * re-export rather than duplicate.
 */

export {
  StudioTextInput,
  StudioNumberInput,
  StudioColorInput,
} from "@/components/widgets/studio/studio-input-primitives";

export {
  Section,
  Field,
  Segmented,
  OptionCardGroup,
  SwitchRow,
  type SegmentedOption,
  type OptionCard,
} from "@/components/collect/studio/studio-controls";
