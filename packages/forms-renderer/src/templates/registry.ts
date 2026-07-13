import type { ComponentType } from "react";
import type { PublicSnapshot } from "@workspace/forms-core";
import type { FormController } from "../use-form-controller.js";
import { meridianPack } from "./meridian/index.js";
import { aperturePack } from "./aperture/index.js";
import { ledgerPack } from "./ledger/index.js";
import { parcelPack } from "./parcel/index.js";
import { terminalPack } from "./terminal/index.js";

/**
 * The render half of a template pack. The contract half (identity, accents,
 * theme recipe) lives in forms-core's manifest registry under the same id.
 * A pack owns its entire visual world: page composition, typography use,
 * motion, loader, and success moment. Packs share commodity field *controls*
 * (fields.tsx) and the flow controller — never page structure.
 */

export interface TemplateCompositionProps {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  preview: boolean;
  /** Closed forms render the template's own closed moment. */
  closed: boolean;
}

export interface TemplateLoaderProps {
  logoUrl?: string | null;
  name?: string;
}

export interface TemplatePack {
  id: string;
  Composition: ComponentType<TemplateCompositionProps>;
  /**
   * The template's static stylesheet, scoped under `scope` (already includes
   * the template attribute selector). Deterministic per snapshot — cacheable
   * by configEtag. Base structural CSS + scheme variables are provided by
   * `buildFormStylesheet`; this is the personality layer.
   */
  stylesheet: (scope: string, snapshot: PublicSnapshot) => string;
  /** The branded loading moment shown while a host fetches the snapshot. */
  Loader: ComponentType<TemplateLoaderProps>;
}

const PACKS: readonly TemplatePack[] = [
  meridianPack,
  aperturePack,
  ledgerPack,
  parcelPack,
  terminalPack,
];

const BY_ID = new Map(PACKS.map((p) => [p.id, p]));

/** Unknown ids fall back to Meridian — a roster change can never brick a form. */
export function resolveTemplatePack(templateId: string): TemplatePack {
  return BY_ID.get(templateId) ?? meridianPack;
}

export const TEMPLATE_PACK_IDS: readonly string[] = PACKS.map((p) => p.id);
