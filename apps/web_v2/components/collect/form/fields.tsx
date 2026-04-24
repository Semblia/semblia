"use client";

import * as React from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { ShortTextField, LongTextField } from "./field-text";
import { StarRating, NpsField, EmojiScale } from "./field-rating";
import { RadioField, CheckboxField, DropdownField, FileUpload } from "./field-choice";

/* ─── Field dispatcher ────────────────────────────────────────────────────── */

export const Field = React.memo(function Field({
  question,
}: {
  question: StudioQuestion;
}) {
  switch (question.type) {
    case "shorttext":
      return <ShortTextField q={question} />;
    case "longtext":
      return <LongTextField q={question} />;
    case "stars":
      return <StarRating q={question} />;
    case "nps":
      return <NpsField q={question} />;
    case "emoji":
      return <EmojiScale q={question} />;
    case "radio":
      return <RadioField q={question} />;
    case "checkbox":
      return <CheckboxField q={question} />;
    case "dropdown":
      return <DropdownField q={question} />;
    case "file":
      return <FileUpload q={question} />;
    default:
      return null;
  }
});
