/**
 * Field renderers — shared by every layout preset.
 *
 * The four presets differ only in their outer shell and CSS; the controls
 * themselves render identically here so behaviour, validation, focus order, and
 * accessibility are guaranteed across presets (docs/DESIGN.md §7, §8).
 *
 * Every control submits under `answers[<questionId>]`, matching the runtime
 * submit parser. Reserved ids (content / authorName / authorEmail / rating …)
 * are recognised by the API from that same key, so no special-casing is needed
 * in markup.
 */

import type { FormQuestion } from "../schema/structure.js";
import { escapeAttr, escapeHtml } from "./escape.js";

const NPS_SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const EMOJI_SCALE: ReadonlyArray<{ value: number; glyph: string; label: string }> = [
  { value: 1, glyph: "😞", label: "Very unhappy" },
  { value: 2, glyph: "🙁", label: "Unhappy" },
  { value: 3, glyph: "😐", label: "Neutral" },
  { value: 4, glyph: "🙂", label: "Happy" },
  { value: 5, glyph: "😄", label: "Very happy" },
];
const STAR_SCALE = [5, 4, 3, 2, 1] as const; // reversed so pure-CSS fill works

function fieldName(id: string): string {
  return `answers[${id}]`;
}

function labelBlock(q: FormQuestion): string {
  const req = q.required
    ? ` <span class="sf-req" aria-hidden="true">*</span>`
    : "";
  const desc = q.description.trim()
    ? `<p class="sf-desc" id="${escapeAttr(q.id)}-desc">${escapeHtml(q.description)}</p>`
    : "";
  return `<span class="sf-label" id="${escapeAttr(q.id)}-label">${escapeHtml(q.label)}${req}</span>${desc}`;
}

function describedBy(q: FormQuestion): string {
  return q.description.trim() ? ` aria-describedby="${escapeAttr(q.id)}-desc"` : "";
}

function renderTextual(q: FormQuestion, type: "text" | "email"): string {
  const inputType = type === "email" ? "email" : "text";
  const ph = q.placeholder.trim()
    ? ` placeholder="${escapeAttr(q.placeholder)}"`
    : "";
  return `<input class="sf-input" type="${inputType}" id="${escapeAttr(q.id)}" name="${escapeAttr(fieldName(q.id))}"${ph}${q.required ? " required" : ""}${describedBy(q)} autocomplete="${type === "email" ? "email" : "off"}">`;
}

function renderTextarea(q: FormQuestion): string {
  const ph = q.placeholder.trim()
    ? ` placeholder="${escapeAttr(q.placeholder)}"`
    : "";
  return `<textarea class="sf-input sf-textarea" id="${escapeAttr(q.id)}" name="${escapeAttr(fieldName(q.id))}" rows="4"${ph}${q.required ? " required" : ""}${describedBy(q)}></textarea>`;
}

function renderStars(q: FormQuestion): string {
  const items = STAR_SCALE.map((value) => {
    const inputId = `${q.id}-star-${value}`;
    return `<input class="sf-vh" type="radio" id="${escapeAttr(inputId)}" name="${escapeAttr(fieldName(q.id))}" value="${value}"${q.required ? " required" : ""}>` +
      `<label class="sf-star" for="${escapeAttr(inputId)}" title="${value} star${value === 1 ? "" : "s"}"><span class="sf-vh">${value} star${value === 1 ? "" : "s"}</span>★</label>`;
  }).join("");
  return `<div class="sf-stars" role="radiogroup" aria-labelledby="${escapeAttr(q.id)}-label">${items}</div>`;
}

function renderScale(
  q: FormQuestion,
  scale: ReadonlyArray<number>,
  className: string,
): string {
  const items = scale
    .map((value) => {
      const inputId = `${q.id}-opt-${value}`;
      return `<input class="sf-vh" type="radio" id="${escapeAttr(inputId)}" name="${escapeAttr(fieldName(q.id))}" value="${value}"${q.required ? " required" : ""}>` +
        `<label class="sf-chip" for="${escapeAttr(inputId)}">${value}</label>`;
    })
    .join("");
  return `<div class="${className}" role="radiogroup" aria-labelledby="${escapeAttr(q.id)}-label">${items}</div>`;
}

function renderEmoji(q: FormQuestion): string {
  const items = EMOJI_SCALE.map(({ value, glyph, label }) => {
    const inputId = `${q.id}-emoji-${value}`;
    return `<input class="sf-vh" type="radio" id="${escapeAttr(inputId)}" name="${escapeAttr(fieldName(q.id))}" value="${value}"${q.required ? " required" : ""}>` +
      `<label class="sf-emoji" for="${escapeAttr(inputId)}" title="${escapeAttr(label)}"><span class="sf-vh">${escapeHtml(label)}</span>${glyph}</label>`;
  }).join("");
  return `<div class="sf-emojis" role="radiogroup" aria-labelledby="${escapeAttr(q.id)}-label">${items}</div>`;
}

function renderChoice(q: FormQuestion, multiple: boolean): string {
  const type = multiple ? "checkbox" : "radio";
  const name = multiple ? `answers[${q.id}][]` : fieldName(q.id);
  const items = q.options
    .map((option, i) => {
      const inputId = `${q.id}-choice-${i}`;
      return `<label class="sf-choice" for="${escapeAttr(inputId)}">` +
        `<input class="sf-choice-input" type="${type}" id="${escapeAttr(inputId)}" name="${escapeAttr(name)}" value="${escapeAttr(option)}"${q.required && !multiple ? " required" : ""}>` +
        `<span class="sf-choice-mark" aria-hidden="true"></span>` +
        `<span class="sf-choice-text">${escapeHtml(option)}</span>` +
        `</label>`;
    })
    .join("");
  const role = multiple ? "group" : "radiogroup";
  return `<div class="sf-choices" role="${role}" aria-labelledby="${escapeAttr(q.id)}-label">${items}</div>`;
}

function renderDropdown(q: FormQuestion): string {
  const placeholder = q.placeholder.trim() || "Select an option…";
  const options = q.options
    .map((option) => `<option value="${escapeAttr(option)}">${escapeHtml(option)}</option>`)
    .join("");
  return `<select class="sf-input sf-select" id="${escapeAttr(q.id)}" name="${escapeAttr(fieldName(q.id))}"${q.required ? " required" : ""}${describedBy(q)}>` +
    `<option value="" disabled selected hidden>${escapeHtml(placeholder)}</option>${options}</select>`;
}

function renderFile(q: FormQuestion): string {
  return `<input class="sf-input sf-file" type="file" id="${escapeAttr(q.id)}" name="${escapeAttr(fieldName(q.id))}"${q.required ? " required" : ""}${describedBy(q)}>`;
}

function renderControl(q: FormQuestion): string {
  switch (q.type) {
    case "shorttext":
      return renderTextual(q, "text");
    case "email":
      return renderTextual(q, "email");
    case "longtext":
      return renderTextarea(q);
    case "stars":
      return renderStars(q);
    case "nps":
      return renderScale(q, NPS_SCALE, "sf-nps");
    case "emoji":
      return renderEmoji(q);
    case "radio":
      return renderChoice(q, false);
    case "checkbox":
      return renderChoice(q, true);
    case "dropdown":
      return renderDropdown(q);
    case "file":
      return renderFile(q);
    default: {
      // Exhaustiveness guard — a new question type must add a renderer.
      const never: never = q.type;
      throw new Error(`forms-v4: no field renderer for "${String(never)}"`);
    }
  }
}

/** Render one question as a labelled field wrapper. `showIf` is carried as data for the runtime. */
export function renderField(q: FormQuestion): string {
  const showIf = q.showIf
    ? ` data-show-if="${escapeAttr(JSON.stringify(q.showIf))}" hidden`
    : "";
  // A grouped control (radiogroup / radios styled as stars) uses a <fieldset>
  // so the label associates with the group rather than a single input.
  const grouped =
    q.type === "stars" ||
    q.type === "nps" ||
    q.type === "emoji" ||
    q.type === "radio" ||
    q.type === "checkbox";
  if (grouped) {
    return `<fieldset class="sf-field sf-field-${q.type}" data-qid="${escapeAttr(q.id)}"${showIf}>` +
      `<legend class="sf-legend">${labelBlock(q)}</legend>${renderControl(q)}</fieldset>`;
  }
  return `<div class="sf-field sf-field-${q.type}" data-qid="${escapeAttr(q.id)}"${showIf}>` +
    `<label class="sf-field-label" for="${escapeAttr(q.id)}">${labelBlock(q)}</label>${renderControl(q)}</div>`;
}
