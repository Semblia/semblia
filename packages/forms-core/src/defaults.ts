import type { FormConfig, FormQuestion, FormTokens } from "./types.js";

/** Sensible questions used whenever a config ships none (the studio is style-only). */
export const DEFAULT_QUESTIONS: FormQuestion[] = [
  {
    id: "content",
    type: "longtext",
    label: "Your feedback",
    placeholder: "Tell us what stood out…",
    required: true,
  },
  {
    id: "authorName",
    type: "shorttext",
    label: "Your name",
    placeholder: "Jane Doe",
    required: true,
  },
  {
    id: "authorEmail",
    type: "email",
    label: "Email",
    placeholder: "jane@example.com",
    required: false,
  },
  {
    id: "rating",
    type: "stars",
    label: "Rating",
    required: false,
  },
];

export const DEFAULT_FORM_TOKENS: FormTokens = {
  fontHead: '"Inter", ui-sans-serif, system-ui, sans-serif',
  fontBody: '"Inter", ui-sans-serif, system-ui, sans-serif',
  fontMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  sizeBase: 16,
  sizeHead: 30,
  trackingHead: -0.01,
  weightHead: 650,
  weightBody: 400,
  bg: "#f6f7f9",
  surface: "#ffffff",
  ink: "#15181d",
  inkSoft: "#5b6573",
  line: "#e3e7ec",
  accent: "#4f46e5",
  accentInk: "#ffffff",
  radius: 12,
  fieldShape: "rounded",
  density: "default",
  buttonStyle: "solid",
  shadow: "sm",
  texture: "none",
  dark: false,
};

export const DEFAULT_FORM_CONFIG: FormConfig = {
  brandName: "Your brand",
  headline: "Share your experience",
  subhead: "A few words about working with us go a long way. Thank you.",
  logoUrl: null,
  questions: DEFAULT_QUESTIONS,
  tokens: DEFAULT_FORM_TOKENS,
};
