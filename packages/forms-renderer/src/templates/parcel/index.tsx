import type { FormField, PublicSnapshot } from "@workspace/forms-core";
import type {
  TemplateCompositionProps,
  TemplateLoaderProps,
  TemplatePack,
} from "../registry.js";
import type { FormController } from "../../use-form-controller.js";
import { FieldControl } from "../../fields.js";
import {
  FlowForm,
  LogoMark,
  PackAttribution,
  SubmitControls,
  timeContractLabel,
} from "../shared.js";
import { parcelStylesheet } from "./styles.js";

/**
 * Parcel — the receipt.
 *
 * Post-purchase show-and-tell (research anchors: Stripe Checkout's
 * receipt-left/action-right split; the express-lane-first hierarchy). Hosted,
 * the left pane is the brand's side of the exchange — product imagery, who's
 * asking, and a dashed-rule receipt of what happens next — while the right is
 * a compact review card that opens with the star row as the first, trivial
 * act. Embedded, it collapses into a single receipt card. Calm pacing:
 * commerce reviewers see the whole, short exchange at once.
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

/** The dashed receipt of what this exchange involves — honest, line by line. */
function Receipt({ snapshot }: { snapshot: PublicSnapshot }) {
  const fields = snapshot.fields;
  const lines: string[] = [timeContractLabel(fields)];
  if (fields.some((f) => f.type === "rating")) {
    lines.push("Your rating helps others choose");
  }
  if (fields.some((f) => f.type === "imageUpload")) {
    lines.push("Photos welcome — show it in the wild");
  }
  if (fields.some((f) => f.type === "consent")) {
    lines.push("Published only with your OK");
  }
  return (
    <ul className="pcl-receipt">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
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
  // Express lane: when the exchange opens on a rating, the star row is the
  // hero act — huge, first, already interactive.
  const [first, ...rest] = ctrl.visibleFields;
  const hero = first && first.type === "rating" ? first : null;
  const body = hero ? rest : ctrl.visibleFields;
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
  const heroImage = snapshot.assets.heroImageUrl;

  if (surface === "embed") {
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

  return (
    <div className="pcl-hosted">
      <aside className="pcl-brand">
        <div className="pcl-brand-body">
          {heroImage ? (
            <img className="pcl-hero-img" src={heroImage} alt="" />
          ) : null}
          <LogoMark snapshot={snapshot} />
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
