import type { ReactNode } from "react";
import type { FormField, PublicSnapshot } from "@workspace/forms-core";
import type {
  TemplateCompositionProps,
  TemplateLoaderProps,
  TemplatePack,
} from "../registry.js";
import type { FormController } from "../../use-form-controller.js";
import { FieldControl } from "../../fields.js";
import {
  estimateSeconds,
  FlowForm,
  LogoMark,
  PackAttribution,
  SubmitControls,
} from "../shared.js";
import { parcelStylesheet } from "./styles.js";

/**
 * Parcel — the receipt.
 *
 * Post-purchase show-and-tell (research anchors: Stripe Checkout's
 * receipt-left/action-right split; the express-lane-first hierarchy). Hosted,
 * the left pane is the brand's side of the exchange — product imagery, who's
 * asking, and a dashed receipt card itemizing what happens next, star-stamped
 * on the corner — while the right is a compact review card that opens with
 * the star row as the first, trivial act inside a soft accent panel.
 * Embedded, it collapses into a single receipt card. Calm pacing: commerce
 * reviewers see the whole, short exchange at once.
 */

function Fields({
  fields,
  ctrl,
}: {
  fields: FormField[];
  ctrl: FormController;
}) {
  return (
    <>
      {fields.map((f) => (
        <FieldControl
          key={f.id}
          field={f}
          value={ctrl.answers[f.id]}
          error={ctrl.errors[f.id]}
          onChange={(v) => ctrl.setAnswer(f.id, v)}
        />
      ))}
    </>
  );
}

/**
 * ONE rubber stamp on the receipt's corner: five stars ringed by
 * "VERIFIED WORDS", inked in the accent, pressed slightly askew. Pure
 * decoration — the receipt lines carry the information.
 */
function StarStamp() {
  return (
    <svg className="pcl-star-stamp" viewBox="0 0 112 112" aria-hidden="true">
      <circle cx="56" cy="56" r="53" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="56" cy="56" r="35" fill="none" stroke="currentColor" strokeWidth="1" />
      <path id="pcl-stamp-arc" d="M56 12a44 44 0 1 1-0.01 0" fill="none" />
      <text className="pcl-stamp-ring">
        <textPath href="#pcl-stamp-arc">VERIFIED WORDS · VERIFIED WORDS ·</textPath>
      </text>
      <text className="pcl-stamp-stars" x="56" y="60" textAnchor="middle">
        ★★★★★
      </text>
    </svg>
  );
}

interface ReceiptLine {
  key: string;
  label: string;
  value: string;
}

/** The itemizable acts, by field type; everything wordy shares one line. */
const RECEIPT_LINES: Partial<Record<FormField["type"], ReceiptLine>> = {
  rating: { key: "rate", label: "Rate us", value: "10 sec" },
  videoUpload: { key: "camera", label: "On camera", value: "2 min" },
  audioUpload: { key: "voice", label: "In your voice", value: "1 min" },
  imageUpload: { key: "show", label: "Show it off", value: "30 sec" },
  fileUpload: { key: "show", label: "Show it off", value: "30 sec" },
};

function receiptLineFor(f: FormField): ReceiptLine | null {
  const known = RECEIPT_LINES[f.type];
  if (known) return known;
  if (f.type === "consent" || f.type === "hidden") return null;
  return { key: "words", label: "Your words", value: "1 min" };
}

/** Numbered steps derived from the actual fields — the receipt never
 *  itemizes a step the form doesn't ask for. */
export function receiptSteps(fields: FormField[]): ReceiptLine[] {
  const steps: ReceiptLine[] = [];
  for (const f of fields) {
    const line = receiptLineFor(f);
    if (line && !steps.some((s) => s.key === line.key)) steps.push(line);
  }
  steps.push({ key: "done", label: "Done", value: "✓" });
  return steps;
}

export function receiptTotal(fields: FormField[]): string {
  const sec = estimateSeconds(fields);
  return sec <= 45 ? "under 1 min" : `about ${Math.max(1, Math.round(sec / 60))} min`;
}

export function receiptFinePrint(fields: FormField[]): string[] {
  const fine: string[] = [];
  if (fields.some((f) => f.type === "consent")) fine.push("Published only with your OK");
  if (fields.some((f) => f.type === "email" && !f.publishable)) {
    fine.push("Your email stays private");
  }
  return fine;
}

/**
 * The receipt of the exchange: numbered steps with dotted leaders and honest
 * per-step times, a total, and receipt fine print.
 */
function Receipt({ snapshot }: { snapshot: PublicSnapshot }) {
  const steps = receiptSteps(snapshot.fields);
  const fine = receiptFinePrint(snapshot.fields);
  return (
    <div className="pcl-receipt">
      <ol className="pcl-receipt-lines">
        {steps.map((line, i) => (
          <li key={line.key} data-done={line.key === "done" || undefined}>
            <span className="pcl-receipt-no">{String(i + 1).padStart(2, "0")}</span>
            <span className="pcl-receipt-label">{line.label}</span>
            <span className="pcl-receipt-dots" aria-hidden="true" />
            <span className="pcl-receipt-value">{line.value}</span>
          </li>
        ))}
      </ol>
      <p className="pcl-receipt-total">
        <span>Your time</span>
        <span className="pcl-receipt-dots" aria-hidden="true" />
        <span>{receiptTotal(snapshot.fields)}</span>
      </p>
      {fine.length ? <p className="pcl-receipt-fine">{fine.join(" · ")}</p> : null}
      <StarStamp />
    </div>
  );
}

function Moment({
  variant,
  snapshot,
}: {
  variant: "success" | "closed";
  snapshot: PublicSnapshot;
}) {
  return (
    <div className="pcl-moment" role="status">
      <span className="pcl-stamp" aria-hidden="true">
        {variant === "success" ? "Thank you" : "Closed"}
      </span>
      <p className="pcl-moment-text">
        {variant === "success"
          ? snapshot.content.successMessage
          : snapshot.content.closedMessage}
      </p>
    </div>
  );
}

function ReviewCard({
  snapshot,
  ctrl,
  preview,
  compact,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  preview: boolean;
  compact: boolean;
}) {
  // Star-first commerce (research: rating is the lowest-friction opening
  // act): the rating is hoisted into the soft hero panel wherever the owner
  // slotted it — huge, first, already interactive.
  const hero = ctrl.visibleFields.find((f) => f.type === "rating") ?? null;
  const body = hero ? ctrl.visibleFields.filter((f) => f !== hero) : ctrl.visibleFields;
  return (
    <FlowForm ctrl={ctrl} preview={preview}>
      {hero ? (
        <div className="pcl-hero-act">
          <Fields fields={[hero]} ctrl={ctrl} />
        </div>
      ) : null}
      {snapshot.content.introText && !compact ? (
        <p className="pcl-intro">{snapshot.content.introText}</p>
      ) : null}
      <div className="pcl-fields">
        <Fields fields={body} ctrl={ctrl} />
      </div>
      <SubmitControls snapshot={snapshot} ctrl={ctrl} />
    </FlowForm>
  );
}

/** Embedded, the exchange collapses into a single receipt card. */
function EmbedCard({
  snapshot,
  ctrl,
  preview,
  moment,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  preview: boolean;
  moment: ReactNode;
}) {
  return (
    <div className="pcl-embed">
      <header className="pcl-embed-head">
        <LogoMark snapshot={snapshot} />
        <div className="pcl-embed-id">
          <h2 className="pcl-embed-title">{snapshot.content.title}</h2>
          {snapshot.content.description ? (
            <p className="pcl-embed-desc">{snapshot.content.description}</p>
          ) : null}
        </div>
      </header>
      {moment ?? (
        <ReviewCard snapshot={snapshot} ctrl={ctrl} preview={preview} compact />
      )}
      <PackAttribution snapshot={snapshot} />
    </div>
  );
}

/** The brand's side of the exchange: imagery, who's asking, the receipt. */
function BrandPane({ snapshot }: { snapshot: PublicSnapshot }) {
  const heroImage = snapshot.assets.heroImageUrl;
  return (
    <aside className="pcl-brand">
      <div className="pcl-brand-head">
        <LogoMark snapshot={snapshot} />
      </div>
      <div className="pcl-brand-body">
        {heroImage ? (
          <img className="pcl-hero-img" src={heroImage} alt="" />
        ) : null}
        <h1 className="pcl-title">{snapshot.content.title}</h1>
        {snapshot.content.description ? (
          <p className="pcl-description">{snapshot.content.description}</p>
        ) : null}
        <Receipt snapshot={snapshot} />
      </div>
      <div className="pcl-brand-foot">
        <PackAttribution snapshot={snapshot} />
      </div>
    </aside>
  );
}

function ParcelComposition({
  snapshot,
  ctrl,
  preview,
  closed,
  surface,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  const moment = closed ? (
    <Moment variant="closed" snapshot={snapshot} />
  ) : done ? (
    <Moment variant="success" snapshot={snapshot} />
  ) : null;

  if (surface === "embed") {
    return (
      <EmbedCard snapshot={snapshot} ctrl={ctrl} preview={preview} moment={moment} />
    );
  }

  return (
    <div className="pcl-hosted">
      <BrandPane snapshot={snapshot} />
      <main className="pcl-pane">
        <div className="pcl-card">
          {moment ?? (
            <ReviewCard
              snapshot={snapshot}
              ctrl={ctrl}
              preview={preview}
              compact={false}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ParcelLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader pcl-loader" role="status" aria-label="Loading form">
      {logoUrl ? (
        <img className="pcl-loader-logo" src={logoUrl} alt="" />
      ) : (
        <span className="pcl-loader-mark" aria-hidden="true">
          {(name || "•").charAt(0).toUpperCase()}
        </span>
      )}
      <span className="pcl-loader-stars" aria-hidden="true">
        ★★★★★
      </span>
    </div>
  );
}

export const parcelPack: TemplatePack = {
  id: "parcel",
  Composition: ParcelComposition,
  stylesheet: parcelStylesheet,
  Loader: ParcelLoader,
};
