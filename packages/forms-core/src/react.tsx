import type { CSSProperties } from "react";
import type { FormViewModel, FormViewModelQuestion } from "./types.js";

/**
 * Hosted form styling. Deliberately simple: one centered card, native controls,
 * zero client JS. Every visible attribute reads a `--f-*` token so the public
 * form reflects whatever the owner set in the Collect Studio.
 */
export const HOSTED_FORM_CSS = `
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--f-font-body);
  font-size: var(--f-size-base);
  color: var(--f-ink);
  background-color: var(--f-bg);
  background-image: var(--f-texture);
  -webkit-font-smoothing: antialiased;
}
.tf-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(1rem, 4vw, 3rem);
}
.tf-card {
  width: min(100%, 32rem);
  background: var(--f-surface);
  border: 1px solid var(--f-line);
  border-radius: var(--f-radius);
  box-shadow: var(--f-shadow);
  padding: var(--f-container-pad-y) var(--f-container-pad-x);
}
.tf-brand {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  margin: 0 0 var(--f-gap);
  font-family: var(--f-font-mono);
  font-size: var(--f-size-xs);
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--f-accent);
}
.tf-brand img { height: 1.5rem; width: auto; display: block; }
.tf-headline {
  margin: 0;
  font-family: var(--f-font-head);
  font-size: var(--f-size-head);
  font-weight: var(--f-weight-head);
  letter-spacing: var(--f-tracking-head);
  line-height: 1.12;
  color: var(--f-ink);
}
.tf-subhead {
  margin: .6rem 0 0;
  font-size: var(--f-size-base);
  line-height: 1.55;
  color: var(--f-ink-soft);
}
.tf-fields {
  display: grid;
  gap: var(--f-gap);
  margin-top: calc(var(--f-gap) * 1.4);
}
.tf-field { display: grid; gap: var(--f-label-gap); }
.tf-label { font-size: var(--f-size-sm); font-weight: 600; color: var(--f-ink); }
.tf-req { color: var(--f-accent); margin-left: .15rem; }
.tf-control,
.tf-input,
.tf-textarea,
.tf-select {
  width: 100%;
  font: inherit;
  color: var(--f-ink);
  background: var(--f-bg);
  border-style: solid;
  border-color: var(--f-line);
  border-width: var(--f-field-border-w);
  border-radius: var(--f-field-radius);
  padding: var(--f-field-pad) calc(var(--f-field-pad) + .15rem);
  outline: none;
  transition: border-color .12s, box-shadow .12s;
}
.tf-textarea { min-height: 7.5rem; resize: vertical; }
.tf-input:focus,
.tf-textarea:focus,
.tf-select:focus {
  border-color: var(--f-accent);
  box-shadow: 0 0 0 3px var(--f-accent-16);
}
.tf-rating {
  display: inline-flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  gap: .15rem;
  border: 0; padding: 0; margin: 0;
}
.tf-rating input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.tf-rating label {
  font-size: 1.7rem;
  line-height: 1;
  color: var(--f-line);
  cursor: pointer;
  transition: color .1s;
}
.tf-rating label:hover,
.tf-rating label:hover ~ label,
.tf-rating input:checked ~ label { color: var(--f-accent); }
.tf-rating input:focus-visible + label { outline: 2px solid var(--f-accent); outline-offset: 2px; }
.tf-choices { display: grid; gap: var(--f-label-gap); }
.tf-choice {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: var(--f-size-base);
  color: var(--f-ink);
}
.tf-actions { margin-top: calc(var(--f-gap) * 1.3); display: flex; }
.tf-submit {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: var(--f-btn-width);
  border: var(--f-btn-border-w) solid var(--f-btn-border-c);
  border-radius: var(--f-btn-radius);
  background: var(--f-btn-bg);
  color: var(--f-btn-color);
  box-shadow: var(--f-btn-shadow);
  padding: var(--f-btn-pad-y) var(--f-btn-pad-x);
  font: inherit;
  font-weight: 600;
  text-transform: var(--f-btn-uppercase);
  letter-spacing: var(--f-btn-tracking);
  cursor: pointer;
}
.tf-submit:hover { filter: brightness(.96); }
.tf-status {
  margin-top: var(--f-gap);
  border-radius: var(--f-field-radius);
  background: var(--f-accent-08);
  color: var(--f-ink);
  padding: var(--f-field-pad);
  font-size: var(--f-size-base);
}
`;

function Stars(question: FormViewModelQuestion) {
  // Reverse order (5→1) so the pure-CSS `:checked ~ label` fill works.
  return (
    <fieldset className="tf-rating" aria-label={question.label}>
      {[5, 4, 3, 2, 1].map((n) => {
        const id = `star-${question.id}-${n}`;
        return (
          <span key={n} style={{ display: "contents" }}>
            <input
              id={id}
              type="radio"
              name={question.inputName}
              value={n}
              required={question.required && n === 5}
            />
            <label htmlFor={id} title={`${n}`}>
              ★
            </label>
          </span>
        );
      })}
    </fieldset>
  );
}

function Choices(question: FormViewModelQuestion, multiple: boolean) {
  return (
    <div className="tf-choices">
      {question.options.map((option, index) => {
        const id = `opt-${question.id}-${index}`;
        return (
          <label key={id} className="tf-choice" htmlFor={id}>
            <input
              id={id}
              type={multiple ? "checkbox" : "radio"}
              name={multiple ? `${question.inputName}[]` : question.inputName}
              value={option}
              required={question.required && !multiple && index === 0}
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function renderControl(question: FormViewModelQuestion) {
  switch (question.type) {
    case "longtext":
    case "textarea":
      return (
        <textarea
          className="tf-textarea"
          name={question.inputName}
          placeholder={question.placeholder}
          required={question.required}
        />
      );
    case "stars":
    case "rating":
    case "emoji":
      return Stars(question);
    case "nps":
      return (
        <select
          className="tf-select"
          name={question.inputName}
          required={question.required}
          defaultValue=""
        >
          <option value="" disabled>
            Select 0–10
          </option>
          {Array.from({ length: 11 }, (_, n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      );
    case "dropdown":
      return (
        <select
          className="tf-select"
          name={question.inputName}
          required={question.required}
          defaultValue=""
        >
          <option value="" disabled>
            Choose one…
          </option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "radio":
      return question.options.length > 0 ? (
        Choices(question, false)
      ) : (
        <input
          className="tf-input"
          type="text"
          name={question.inputName}
          required={question.required}
        />
      );
    case "checkbox":
      return Choices(question, true);
    case "file":
      return (
        <input
          className="tf-input"
          type="file"
          name={question.inputName}
          required={question.required}
        />
      );
    case "email":
      return (
        <input
          className="tf-input"
          type="email"
          name={question.inputName}
          placeholder={question.placeholder}
          required={question.required}
        />
      );
    default:
      return (
        <input
          className="tf-input"
          type="text"
          name={question.inputName}
          placeholder={question.placeholder}
          required={question.required}
        />
      );
  }
}

export function HostedForm(props: {
  model: FormViewModel;
  actionPath: string;
  submitted?: boolean;
}) {
  const style = {
    ...props.model.cssVars,
    colorScheme: props.model.colorScheme,
  } as CSSProperties;

  return (
    <div className="tf-page" style={style}>
      <main className="tf-card">
        <p className="tf-brand">
          {props.model.logoUrl ? (
            <img src={props.model.logoUrl} alt="" />
          ) : null}
          <span>{props.model.brandName}</span>
        </p>
        <h1 className="tf-headline">{props.model.headline}</h1>
        <p className="tf-subhead">{props.model.subhead}</p>
        {props.submitted ? (
          <p className="tf-status" role="status">
            Thanks — your response was submitted.
          </p>
        ) : (
          <form method="post" action={props.actionPath}>
            <div className="tf-fields">
              {props.model.questions.map((question) => (
                <div className="tf-field" key={question.id}>
                  <span className="tf-label">
                    {question.label}
                    {question.required ? (
                      <span className="tf-req" aria-hidden="true">
                        *
                      </span>
                    ) : null}
                  </span>
                  {renderControl(question)}
                </div>
              ))}
            </div>
            <div className="tf-actions">
              <button className="tf-submit" type="submit">
                Submit
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
