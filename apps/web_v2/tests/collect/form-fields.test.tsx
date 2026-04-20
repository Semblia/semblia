import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Field } from "@/components/collect/form/fields";
import { FormContext, type FormContextValue } from "@/components/collect/form/form-context";
import type { StudioQuestion } from "@/lib/collect/studio-types";

const starQuestion: StudioQuestion = {
  id: "rating",
  type: "stars",
  label: "How would you rate it?",
  required: true,
};

function renderField(question: StudioQuestion) {
  const contextValue: FormContextValue = {
    questions: [question],
    values: {},
    errors: {},
    status: "editing",
    step: 0,
    totalSteps: 1,
    isUnderline: false,
    setValue: vi.fn(),
    clearError: vi.fn(),
    goNext: vi.fn(() => true),
    goBack: vi.fn(),
    submit: vi.fn(),
  };

  return render(
    <FormContext.Provider value={contextValue}>
      <Field question={question} />
    </FormContext.Provider>,
  );
}

describe("<Field />", () => {
  it("sizes star-rating SVGs with CSS instead of invalid SVG attributes", () => {
    const { container } = renderField(starQuestion);
    const starIcon = container.querySelector('button[aria-label="1 star"] svg');

    expect(starIcon).not.toBeNull();
    expect(starIcon).not.toHaveAttribute("width");
    expect(starIcon).not.toHaveAttribute("height");
    expect(starIcon).toHaveStyle({
      width: "calc(var(--f-size-base) * 1.7)",
      height: "calc(var(--f-size-base) * 1.7)",
      display: "block",
    });
  });
});