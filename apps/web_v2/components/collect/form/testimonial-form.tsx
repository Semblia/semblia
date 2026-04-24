"use client";

import * as React from "react";
import type {
  StudioConfig,
  FlowMode,
  ContainerMode,
  HeroMode,
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
import { useContainerWidth } from "@/hooks/use-container-width";

/* ─── Container renderer (reused for form + thank-you) ────────────────────── */

function renderContainer(
  mode: ContainerMode,
  children: React.ReactNode,
  heroContent?: React.ReactNode,
): React.ReactNode {
  switch (mode) {
    case "split":
      return (
        <ContainerSplit heroContent={heroContent ?? null}>
          {children}
        </ContainerSplit>
      );
    case "centered":
      return <ContainerCentered>{children}</ContainerCentered>;
    case "fullbleed":
      return <ContainerFullbleed>{children}</ContainerFullbleed>;
    default:
      return <ContainerBoxed>{children}</ContainerBoxed>;
  }
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

  // Measure the form's own width so preview devices trigger mobile overrides
  // correctly regardless of outer viewport size.
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

  // Resolve hero: split container always uses side hero; ignore non-side choices
  // to prevent two heroes from rendering simultaneously (conflict C4).
  const effectiveHero: HeroMode =
    effectiveContainer === "split" ? "side" : layout.hero;

  // Form state
  const formState = useFormState(questions, onSubmit);

  // Derived underline flag
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

  // Memoized CSS variable block
  const cssVars = React.useMemo(
    () => tokensToCssVars(tokens) as React.CSSProperties,
    [tokens],
  );

  // Memoized texture background
  const textureImage = React.useMemo(
    () => textureBg(tokens.texture, tokens.ink),
    [tokens.texture, tokens.ink],
  );

  const rootStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...cssVars,
      width: "100%",
      height: "100%",
      minHeight: "100%",
      background: tokens.bg,
      backgroundImage: textureImage !== "none" ? textureImage : undefined,
      fontFamily: tokens.fontBody,
      color: tokens.ink,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column" as const,
    }),
    [cssVars, tokens.bg, textureImage, tokens.fontBody, tokens.ink],
  );

  const isSplit = effectiveContainer === "split";

  // Thank-you screen — rendered inside the active container for visual continuity.
  if (formState.status === "success") {
    const thankYouContent = <ThankYou brandName={brandName} />;
    return (
      <div ref={rootRef} style={rootStyle}>
        <div
          style={{
            flex: 1,
            overflowY: isSplit ? undefined : "auto",
            display: "flex",
            alignItems: isSplit ? undefined : "center",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          {renderContainer(
            effectiveContainer,
            thankYouContent,
            effectiveContainer === "split" ? (
              <HeroSide config={config} />
            ) : undefined,
          )}
        </div>
      </div>
    );
  }

  // Visible questions (conditional logic applied)
  const visibleQuestions = questions.filter((q) =>
    evalShowIf(q, formState.values),
  );

  // Inner form content (questions + footer)
  const formContent = (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--f-gap)" }}
    >
      {effectiveHero === "top" && <HeroTop config={config} />}

      <Flow
        flow={effectiveFlow}
        questions={visibleQuestions}
        stickyProgress={layout.stickyProgress}
      />

      <PoweredBy />
    </div>
  );

  const heroContent =
    effectiveContainer === "split" ? <HeroSide config={config} /> : undefined;
  const containerNode = renderContainer(
    effectiveContainer,
    formContent,
    heroContent,
  );

  return (
    <FormContext.Provider value={contextValue}>
      <div ref={rootRef} style={rootStyle}>
        {/* Floating hero sits above everything, only in fullbleed */}
        {effectiveHero === "floating" && <HeroFloating config={config} />}

        {isSplit ? (
          /* Split manages its own scroll internally */
          <div style={{ flex: 1, minHeight: 0 }}>{containerNode}</div>
        ) : (
          /* Other layouts: scrollable, vertically centered */
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {/* Inner wrapper uses minHeight:100% + justify-content:center so that
                short forms are vertically centred while tall forms can scroll
                without the top being clipped (the classic overflow+center bug). */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: "100%",
                padding: "var(--f-section-gap) 0",
              }}
            >
              {containerNode}
            </div>
          </div>
        )}

        {layout.showBrandPill && !isSplit && (
          <div
            style={{
              flexShrink: 0,
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
