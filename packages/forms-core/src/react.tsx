import type { CSSProperties } from "react";
import type { FormViewModel } from "./types.js";

export const HOSTED_FORM_CSS = `
:root {
  color-scheme: light;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--tresta-form-accent) 18%, transparent), transparent 34rem),
    var(--tresta-form-background);
  color: var(--tresta-form-text);
  font-family: var(--tresta-form-font-family);
}
.tresta-form-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(1.25rem, 4vw, 4rem);
}
.tresta-form {
  width: min(100%, 44rem);
  display: grid;
  gap: 1rem;
}
.tresta-form__panel {
  border: 1px solid var(--tresta-form-border);
  border-radius: var(--tresta-form-radius);
  background: color-mix(in srgb, var(--tresta-form-surface) 94%, transparent);
  box-shadow: 0 24px 90px rgba(15, 23, 42, 0.12);
  padding: clamp(1.25rem, 4vw, 2.5rem);
}
.tresta-form__brand {
  margin: 0 0 .75rem;
  color: var(--tresta-form-accent);
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.tresta-form__headline {
  margin: 0;
  max-width: 13ch;
  font-size: clamp(2.25rem, 7vw, 4.75rem);
  line-height: .94;
  letter-spacing: 0;
}
.tresta-form__subhead {
  margin: 1rem 0 0;
  max-width: 38rem;
  color: var(--tresta-form-muted-text);
  font-size: 1rem;
  line-height: 1.7;
}
.tresta-form__fields {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
}
.tresta-form__field {
  display: grid;
  gap: .5rem;
}
.tresta-form__field span {
  font-size: .9rem;
  font-weight: 700;
}
.tresta-form__field input,
.tresta-form__field textarea {
  width: 100%;
  border: 1px solid var(--tresta-form-border);
  border-radius: calc(var(--tresta-form-radius) * .72);
  background: #fff;
  color: var(--tresta-form-text);
  font: inherit;
  padding: .9rem 1rem;
  outline: none;
}
.tresta-form__field textarea {
  min-height: 9rem;
  resize: vertical;
}
.tresta-form__field input:focus,
.tresta-form__field textarea:focus {
  border-color: var(--tresta-form-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--tresta-form-accent) 16%, transparent);
}
.tresta-form__submit {
  border: 0;
  border-radius: 999px;
  background: var(--tresta-form-accent);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  padding: .95rem 1.25rem;
}
.tresta-form__status {
  margin: 2rem 0 0;
  border-radius: calc(var(--tresta-form-radius) * .72);
  background: color-mix(in srgb, var(--tresta-form-accent) 10%, #fff);
  color: var(--tresta-form-text);
  padding: 1rem;
}
`;

function renderField(question: FormViewModel["questions"][number]) {
  if (question.type === "textarea") {
    return (
      <textarea
        name={question.inputName}
        placeholder={question.placeholder}
        required={question.required}
      />
    );
  }

  if (question.type === "rating") {
    return (
      <input
        type="number"
        min={1}
        max={5}
        name={question.inputName}
        required={question.required}
      />
    );
  }

  return (
    <input
      type={question.type === "email" ? "email" : "text"}
      name={question.inputName}
      placeholder={question.placeholder}
      required={question.required}
    />
  );
}

export function HostedForm(props: {
  model: FormViewModel;
  actionPath: string;
  submitted?: boolean;
}) {
  const style = props.model.cssVars as CSSProperties;

  return (
    <div className="tresta-form-page" style={style}>
      <main className="tresta-form">
        <section className="tresta-form__panel">
          <p className="tresta-form__brand">{props.model.brandName}</p>
          <h1 className="tresta-form__headline">{props.model.headline}</h1>
          <p className="tresta-form__subhead">{props.model.subhead}</p>
          {props.submitted ? (
            <p className="tresta-form__status" role="status">
              Thanks. Your response was submitted.
            </p>
          ) : (
            <form
              className="tresta-form__fields"
              method="post"
              action={props.actionPath}
            >
              {props.model.questions.map((question) => (
                <label className="tresta-form__field" key={question.id}>
                  <span>{question.label}</span>
                  {renderField(question)}
                </label>
              ))}
              <button className="tresta-form__submit" type="submit">
                Submit
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
