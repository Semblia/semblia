import type { FormConfig } from "./types.js";

export const DEFAULT_FORM_CONFIG: FormConfig = {
  brandName: "Your brand",
  headline: "How was your experience?",
  subhead: "Share a few words. It helps others understand what to expect.",
  questions: [
    {
      id: "content",
      type: "textarea",
      label: "Your feedback",
      placeholder: "Tell us what stood out...",
      required: true,
    },
    {
      id: "authorName",
      type: "text",
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
      type: "rating",
      label: "Rating",
      required: false,
    },
  ],
  tokens: {
    accent: "#4f46e5",
    accentText: "#ffffff",
    background: "#f8fafc",
    text: "#111827",
    mutedText: "#6b7280",
    surface: "#ffffff",
    border: "#d1d5db",
    radius: 14,
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
};
