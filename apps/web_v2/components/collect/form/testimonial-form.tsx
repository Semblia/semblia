"use client";

import * as React from "react";
import type {
  StudioConfig,
  FlowMode,
  ContainerMode,
} from "@/lib/collect/studio-types";
import { evalShowIf } from "@/lib/collect/studio-types";
import { FormContext } from "./form-context";
import { useFormState } from "./use-form-state";
import { tokensToCssVars, textureBg } from "./tokens-to-css";
import { Flow } from "./flows";
import { PoweredBy, BrandPill } from "./containers";
import {
  ContainerBoxed,
  ContainerCentered,
  ContainerFullbleed,
  ContainerSplit,
  HeroTop,
  HeroSide,
  HeroFloating,
} from "./containers";
import { ThankYou } from "./thank-you";

/* ─── Width observer — measures the form's own container ─────────────────── */

function useContainerWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/* ─── TestimonialForm ─────────────────────────────────────────────────────── */

export interface TestimonialFormProps {
  config: StudioConfig;
  /** "preview" = interactive but mock-submits; "live" = real submission path (future). */
  mode?: "preview" | "live";
  onSubmit?: (payload: unknown) => void;
}

export const TestimonialForm = React.memo(function TestimonialForm({
  config,
  onSubmit,
}: TestimonialFormProps) {
  const { tokens, layout, questions, brandName, logoUrl } = config;

  // Measure the form's own width (not the page window) so preview devices
  // correctly trigger mobile overrides regardless of outer viewport size.
  const [rootRef, containerWidth] = useContainerWidth<HTMLDivElement>();
  const isNarrow = containerWidth > 0 && containerWidth < 640;

  const effectiveFlow: FlowMode =
    isNarrow && layout.mobileFlow !== "auto" ? layout.mobileFlow : layout.flow;
  const requestedContainer: ContainerMode =
    isNarrow && layout.mobileContainer !== "auto"
      ? layout.mobileContainer
      : layout.container;
  // Split layout is unworkable below ~520px: auto-stack to boxed.
  const effectiveContainer: ContainerMode =
    requestedContainer === "split" && containerWidth > 0 && containerWidth < 520
      ? "boxed"
      : requestedContainer;

  // Form state
  const formState = useFormState(questions, onSubmit);

  // Derived underline flag (replaces getComputedStyle in fields)
  const isUnderline = tokens.fieldShape === "underline";

  // Context value
  const contextValue = React.useMemo(
    () => ({
      questions,
      values: formState.values,
      errors: formState.errors,
      status: formState.status,
      step: formState.step,
      totalSteps: formState.totalSteps,
      isUnderline,
      setValue: formState.setValue,
      clearError: formState.clearError,
      goNext: formState.goNext,
      goBack: formState.goBack,
      submit: formState.submit,
    }),
    [formState, questions, isUnderline],
  );

  // Memoized CSS variable block — only recompute when tokens change.
  const cssVars = React.useMemo(
    () => tokensToCssVars(tokens) as React.CSSProperties,
    [tokens],
  );

  // Memoized texture background — cache data-URI by (texture, ink).
  const textureImage = React.useMemo(
    () => textureBg(tokens.texture, tokens.ink),
    [tokens.texture, tokens.ink],
  );

  const rootStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...cssVars,
      width: "100%",
      minHeight: "100%",
      background: tokens.bg,
      backgroundImage: textureImage !== "none" ? textureImage : undefined,
      fontFamily: tokens.fontBody,
      color: tokens.ink,
      position: "relative",
      overflowY: effectiveContainer === "split" ? "hidden" : "auto",
    }),
    [
      cssVars,
      tokens.bg,
      textureImage,
      tokens.fontBody,
      tokens.ink,
      effectiveContainer,
    ],
  );

  // Thank-you screen
  if (formState.status === "success") {
    return (
      <div ref={rootRef} style={rootStyle}>
        <ContainerBoxed>
          <ThankYou brandName={brandName} />
        </ContainerBoxed>
      </div>
    );
  }

  // Visible questions (conditional logic applied)
  const visibleQuestions = questions.filter((q) => evalShowIf(q, formState.values));

  // Hero node (for non-split containers)
  const heroNode =
    layout.hero === "top" ? (
      <HeroTop config={config} />
    ) : layout.hero === "floating" ? (
      <HeroFloating config={config} />
    ) : null;

  // Inner form content (questions + footer)
  const formContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--f-gap)" }}>
      {layout.hero === "top" && heroNode}

      <Flow
        flow={effectiveFlow}
        questions={visibleQuestions}
        stickyProgress={layout.stickyProgress}
      />

      <PoweredBy />
    </div>
  );

  // Pick container
  let containerNode: React.ReactNode;
  if (effectiveContainer === "split") {
    containerNode = (
      <ContainerSplit heroContent={<HeroSide config={config} />}>
        {formContent}
      </ContainerSplit>
    );
  } else if (effectiveContainer === "centered") {
    containerNode = <ContainerCentered>{formContent}</ContainerCentered>;
  } else if (effectiveContainer === "fullbleed") {
    containerNode = <ContainerFullbleed>{formContent}</ContainerFullbleed>;
  } else {
    containerNode = <ContainerBoxed>{formContent}</ContainerBoxed>;
  }

  return (
    <FormContext.Provider value={contextValue}>
      <div ref={rootRef} style={rootStyle}>
        {layout.hero === "floating" && heroNode}

        {containerNode}

        {layout.showBrandPill && effectiveContainer !== "split" && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              padding: "10px 0 14px",
              background:
                "linear-gradient(to top, var(--f-bg) 70%, transparent)",
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <BrandPill name={brandName} logoUrl={logoUrl} />
            </div>
          </div>
        )}
      </div>
    </FormContext.Provider>
  );
});
