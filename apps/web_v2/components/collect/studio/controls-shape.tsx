"use client";

import { useStudioStore } from "@/lib/collect/studio-store";
import type {
  DesignTokens,
  FieldShape,
  TokenDensity,
  TokenButtonStyle,
  TokenShadow,
  TokenTexture,
} from "@/lib/collect/studio-types";
import {
  SectionCollapsible,
  Row,
  StudioNumberInput,
  Pills,
} from "./studio-primitives";

/* ─── Shape & density section ─────────────────────────────────────────────── */

export function ShapeSection({ formId }: { formId: string }) {
  const t = useStudioStore((s) => s.snapshots[formId]?.draft?.tokens);
  const setToken = useStudioStore((s) => s.setToken);

  if (!t) return null;

  const setTok = <K extends keyof DesignTokens>(k: K, v: DesignTokens[K]) =>
    setToken(formId, k, v);

  return (
    <SectionCollapsible title="Shape & density">
      <Row label="Corner radius" hint={`${t.radius}px`}>
        <StudioNumberInput
          value={t.radius}
          onChange={(v) => setTok("radius", v)}
          min={0}
          max={30}
        />
      </Row>
      <Row label="Field shape">
        <Pills<FieldShape>
          options={[
            { value: "rounded", label: "Rounded" },
            { value: "square", label: "Square" },
            { value: "underline", label: "Under" },
            { value: "pill", label: "Pill" },
          ]}
          value={t.fieldShape}
          onChange={(v) => setTok("fieldShape", v)}
        />
      </Row>
      <Row label="Density">
        <Pills<TokenDensity>
          options={[
            { value: "compact", label: "Compact" },
            { value: "default", label: "Default" },
            { value: "cozy", label: "Cozy" },
            { value: "airy", label: "Airy" },
          ]}
          value={t.density}
          onChange={(v) => setTok("density", v)}
        />
      </Row>
      <Row label="Button style">
        <Pills<TokenButtonStyle>
          options={[
            { value: "solid", label: "Solid" },
            { value: "pill", label: "Pill" },
            { value: "block", label: "Block" },
            { value: "ghost", label: "Ghost" },
          ]}
          value={t.buttonStyle}
          onChange={(v) => setTok("buttonStyle", v)}
        />
      </Row>
      <Row label="Shadow">
        <Pills<TokenShadow>
          options={[
            { value: "none", label: "None" },
            { value: "sm", label: "Sm" },
            { value: "soft", label: "Soft" },
            { value: "hard", label: "Hard" },
          ]}
          value={t.shadow}
          onChange={(v) => setTok("shadow", v)}
        />
      </Row>
      <Row label="Texture">
        <Pills<TokenTexture>
          options={[
            { value: "none", label: "None" },
            { value: "grain", label: "Grain" },
            { value: "dots", label: "Dots" },
            { value: "lines", label: "Lines" },
          ]}
          value={t.texture}
          onChange={(v) => setTok("texture", v)}
        />
      </Row>
    </SectionCollapsible>
  );
}
