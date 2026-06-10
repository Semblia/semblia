/**
 * Hosted form client runtime.
 *
 * Bundled (esbuild, minified IIFE) into `src/generated/runtime-js.ts` by
 * `scripts/build-client.mjs` and inlined into the hosted form HTML with a
 * matching CSP sha256 hash. Keep this file dependency-free.
 *
 * The SSR markup is a fully working plain-POST form; this runtime upgrades it:
 *  - loader screen timing (removes the overlay after its configured duration)
 *  - conditional questions (`showIf`) — hides fields and disables their inputs
 *  - stepped / cards / conversational flows: one question at a time, progress,
 *    back/next, Enter-to-advance, auto-advance on choice selection
 *  - inline validation with friendly messages (novalidate in step modes)
 *  - textarea auto-grow, double-submit guard
 */

interface ShowIfRule {
  questionId: string;
  op: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "includes";
  value: string | number;
}

interface RuntimeQuestion {
  id: string;
  type: string;
  required: boolean;
  showIf: ShowIfRule | null;
}

interface RuntimeConfig {
  flow: "all" | "stepped" | "cards" | "conversational";
  mobileFlow: "all" | "stepped" | "cards" | "conversational" | "auto";
  loaderMs: number;
  questions: RuntimeQuestion[];
}

(() => {
  const root = document.querySelector<HTMLElement>(".hf-root");
  const configEl = document.getElementById("hf-config");
  if (!root || !configEl) return;

  let config: RuntimeConfig;
  try {
    config = JSON.parse(configEl.textContent || "") as RuntimeConfig;
  } catch {
    return;
  }

  root.classList.add("hf-js");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ── Loader ────────────────────────────────────────────────────────────── */

  const loader = root.querySelector<HTMLElement>("[data-loader]");
  if (loader) {
    const delay = reducedMotion ? 0 : config.loaderMs;
    window.setTimeout(() => {
      loader.style.transition = "opacity .4s ease";
      loader.style.opacity = "0";
      loader.style.pointerEvents = "none";
      window.setTimeout(() => loader.remove(), 450);
    }, delay);
  }

  const form = root.querySelector<HTMLFormElement>("[data-form]");
  if (!form) return;

  /* ── Field plumbing ────────────────────────────────────────────────────── */

  const fieldEls = new Map<string, HTMLElement>();
  for (const el of form.querySelectorAll<HTMLElement>("[data-qid]")) {
    const id = el.getAttribute("data-qid");
    if (id) fieldEls.set(id, el);
  }

  function inputsOf(fieldEl: HTMLElement) {
    return [
      ...fieldEl.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select"),
    ];
  }

  function answerValue(questionId: string): unknown {
    const fieldEl = fieldEls.get(questionId);
    if (!fieldEl) return null;
    const inputs = inputsOf(fieldEl);
    const firstInput = inputs[0];
    if (!firstInput) return null;
    if (firstInput.type === "radio") {
      const checked = inputs.find((i) => (i as HTMLInputElement).checked) as
        | HTMLInputElement
        | undefined;
      if (!checked) return null;
      const n = Number(checked.value);
      return Number.isFinite(n) && checked.value.trim() !== ""
        ? n
        : checked.value;
    }
    if (firstInput.type === "checkbox") {
      return inputs
        .filter((i) => (i as HTMLInputElement).checked)
        .map((i) => i.value);
    }
    const value = firstInput.value;
    return value === "" ? null : value;
  }

  function evalShowIf(rule: ShowIfRule | null): boolean {
    if (!rule) return true;
    const actual = answerValue(rule.questionId);
    if (actual == null) return false;
    const target = rule.value;
    const numActual = typeof actual === "number" ? actual : Number(actual);
    const numTarget = typeof target === "number" ? target : Number(target);
    switch (rule.op) {
      case "eq":
        return actual === target || numActual === numTarget;
      case "neq":
        return actual !== target && numActual !== numTarget;
      case "gt":
        return numActual > numTarget;
      case "lt":
        return numActual < numTarget;
      case "gte":
        return numActual >= numTarget;
      case "lte":
        return numActual <= numTarget;
      case "includes":
        if (typeof actual === "string")
          return actual.toLowerCase().includes(String(target).toLowerCase());
        if (Array.isArray(actual)) return actual.includes(target);
        return false;
      default:
        return true;
    }
  }

  function visibleQuestions(): RuntimeQuestion[] {
    return config.questions.filter(
      (q) => fieldEls.has(q.id) && evalShowIf(q.showIf),
    );
  }

  function applyConditional() {
    for (const q of config.questions) {
      const el = fieldEls.get(q.id);
      if (!el) continue;
      const visible = evalShowIf(q.showIf);
      el.toggleAttribute("data-cond-hidden", !visible);
      for (const input of inputsOf(el)) input.disabled = !visible;
    }
  }

  /* ── Validation ────────────────────────────────────────────────────────── */

  function setError(fieldEl: HTMLElement, message: string | null) {
    const errorEl = fieldEl.querySelector<HTMLElement>("[data-error]");
    if (errorEl) {
      errorEl.textContent = message ?? "";
      errorEl.hidden = !message;
    }
    fieldEl.toggleAttribute("data-invalid", Boolean(message));
    if (message && !reducedMotion) {
      // retrigger the shake animation
      fieldEl.style.animation = "none";
      void fieldEl.offsetWidth;
      fieldEl.style.animation = "";
    }
  }

  function validateField(q: RuntimeQuestion): boolean {
    const fieldEl = fieldEls.get(q.id);
    if (!fieldEl || fieldEl.hasAttribute("data-cond-hidden")) return true;
    const inputs = inputsOf(fieldEl);
    const firstInput = inputs[0];
    if (!firstInput) return true;

    if (q.required) {
      const value = answerValue(q.id);
      const empty =
        value == null || (Array.isArray(value) && value.length === 0);
      if (empty) {
        setError(fieldEl, "This field is required.");
        return false;
      }
    }
    for (const input of inputs) {
      if (!input.checkValidity()) {
        setError(
          fieldEl,
          input.validationMessage || "Please check this field.",
        );
        return false;
      }
    }
    setError(fieldEl, null);
    return true;
  }

  /* ── Flow engine ───────────────────────────────────────────────────────── */

  const mobileQuery = window.matchMedia("(max-width: 719px)");
  function effectiveFlow(): RuntimeConfig["flow"] {
    if (mobileQuery.matches && config.mobileFlow !== "auto") {
      return config.mobileFlow;
    }
    return config.flow;
  }

  const progressEl = form.querySelector<HTMLElement>("[data-progress]");
  const progressFill = form.querySelector<HTMLElement>("[data-progress-fill]");
  const stepMeta = form.querySelector<HTMLElement>("[data-step-meta]");
  const backBtn = form.querySelector<HTMLButtonElement>("[data-nav-back]");
  const nextBtn = form.querySelector<HTMLButtonElement>("[data-nav-next]");
  const submitBtn = form.querySelector<HTMLButtonElement>("[data-submit]");
  const keyHint = form.querySelector<HTMLElement>("[data-key-hint]");

  let step = 0;
  let stepMode = false;

  function syncFlow() {
    const flow = effectiveFlow();
    root!.setAttribute("data-flow", flow);
    const steps = visibleQuestions();
    stepMode = flow !== "all" && steps.length > 1;
    form!.noValidate = stepMode;

    if (!stepMode) {
      for (const el of fieldEls.values()) {
        el.removeAttribute("data-step-hidden");
        el.removeAttribute("data-step-active");
      }
      if (progressEl) progressEl.hidden = true;
      if (backBtn) backBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      if (submitBtn) submitBtn.hidden = false;
      if (keyHint) keyHint.hidden = true;
      return;
    }

    step = Math.min(step, steps.length - 1);
    const current = steps[step];
    for (const q of config.questions) {
      const el = fieldEls.get(q.id);
      if (!el) continue;
      const active = current ? q.id === current.id : false;
      el.toggleAttribute("data-step-hidden", !active);
      el.toggleAttribute("data-step-active", active);
    }

    const isLast = step === steps.length - 1;
    if (progressEl) progressEl.hidden = false;
    if (progressFill)
      progressFill.style.width = `${((step + 1) / steps.length) * 100}%`;
    if (stepMeta) {
      stepMeta.textContent =
        flow === "conversational"
          ? `${step + 1} → ${steps.length}`
          : `Step ${step + 1} of ${steps.length}`;
    }
    if (backBtn) backBtn.hidden = step === 0;
    if (nextBtn) nextBtn.hidden = isLast;
    if (submitBtn) submitBtn.hidden = !isLast;
    if (keyHint) keyHint.hidden = isLast;
  }

  function focusStep() {
    const steps = visibleQuestions();
    const current = steps[step];
    if (!current) return;
    const fieldEl = fieldEls.get(current.id);
    const input = fieldEl?.querySelector<HTMLElement>(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
    );
    input?.focus({ preventScroll: false });
  }

  function advance() {
    const steps = visibleQuestions();
    const current = steps[step];
    if (current && !validateField(current)) return;
    if (step < steps.length - 1) {
      step += 1;
      syncFlow();
      focusStep();
    }
  }

  function goBack() {
    if (step > 0) {
      step -= 1;
      syncFlow();
      focusStep();
    }
  }

  nextBtn?.addEventListener("click", advance);
  backBtn?.addEventListener("click", goBack);
  mobileQuery.addEventListener("change", () => syncFlow());

  // Enter advances in step modes (textareas keep Enter for newlines).
  form.addEventListener("keydown", (event) => {
    if (!stepMode || event.key !== "Enter") return;
    const target = event.target as HTMLElement;
    if (target instanceof HTMLTextAreaElement) return;
    const steps = visibleQuestions();
    if (step < steps.length - 1) {
      event.preventDefault();
      advance();
    }
  });

  // Auto-advance after picking a single-choice answer (Typeform-style).
  const AUTO_ADVANCE = new Set(["stars", "rating", "nps", "emoji", "radio"]);
  form.addEventListener("change", (event) => {
    applyConditional();
    syncFlow();
    if (!stepMode) return;
    const target = event.target as HTMLInputElement;
    if (target.type !== "radio") return;
    const fieldEl = target.closest<HTMLElement>("[data-qid]");
    const qtype = fieldEl?.getAttribute("data-qtype") ?? "";
    if (!AUTO_ADVANCE.has(qtype)) return;
    const steps = visibleQuestions();
    if (step < steps.length - 1) {
      window.setTimeout(() => advance(), reducedMotion ? 0 : 240);
    }
  });

  // Clear inline errors as the respondent types.
  form.addEventListener("input", (event) => {
    const fieldEl = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-qid]",
    );
    if (fieldEl?.hasAttribute("data-invalid")) setError(fieldEl, null);
    applyConditional();
  });

  // Textarea auto-grow.
  for (const textarea of form.querySelectorAll<HTMLTextAreaElement>(
    "textarea",
  )) {
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 420)}px`;
    });
  }

  // Final gate: validate everything, jump to the first invalid step.
  let submitting = false;
  form.addEventListener("submit", (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }
    const steps = visibleQuestions();
    for (let i = 0; i < steps.length; i += 1) {
      const q = steps[i];
      if (q && !validateField(q)) {
        event.preventDefault();
        if (stepMode) {
          step = i;
          syncFlow();
          focusStep();
        }
        return;
      }
    }
    submitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute("aria-busy", "true");
    }
  });

  applyConditional();
  syncFlow();
})();
