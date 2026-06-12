# External principles for `/projects`

Date: 2026-05-23.
Method: WebFetch on documented design philosophy (not screenshots). Sources are linked. The point is *adaptation*, not copying.

## Source extracts

### Geist — Empty State guidance (Vercel)

Source: `https://vercel.com/geist/empty-state`

- "Titles: Title Case (`No Logs Match Your Filter`)"
- "Descriptions: sentence case and adds **new information instead of restating the title**"
- "Filtered results: Quote user input verbatim: `No logs match ${query}. Clear the filter to see all logs.`"
- "Onboarding content: name the **next action that creates the first item**: `Push to your Git repository to create your first one.`"
- "CTA labels: Title Case `Verb + Noun`. **Never `Get Started`, `Continue`, or `OK`**."
- "Maximum one primary CTA, optionally one secondary."
- Four empty-state archetypes: **Blank Slate**, **Informational**, **Educational**, **Guide**.

### Linear — Method introduction

Source: `https://linear.app/method/introduction`

- "Productivity software needs to be designed for purpose."
- "Simple first, then powerful."
- "Don't invent terms if possible, as these can confuse and have different meanings in different teams."
- "Your tools should not make you the designer and maintainer of them."

## Principles distilled for Semblia `/projects`

These are *principles*, not visual specs. Each one names how it should change a decision on this surface — not a transplant of Linear's or Vercel's look.

### P1. Empty state must orient before it asserts identity

> Title should orient the user toward the next action. Description adds new information, never restates the title. Primary CTA is "Verb + Noun".
> *— Geist, adapted.*

**Semblia delta:**
The current empty-state H2 (`"A studio for trust. Yours starts empty."` — `project-empty-states.tsx:46-52`) is brand positioning that orients no one. The user is staring at a workspace home with no projects — they need to know *what to do next* and *what they'll get when they do it*. The orientational signal currently lives only in the body paragraph and the three-stage flow.

Adaptation: keep the warm voice (Semblia is intentionally warmer than Linear). Move the brand-positioning sentence to a small role under the action, or drop it. Rewrite the H2 to be a one-line orientation, e.g. *"Create your first project to start collecting testimonials."* The three-stage flow stays — it's exactly the "Educational" empty-state archetype.

### P2. Toolbars are earned by content, not granted by default

> "Simple first, then powerful."
> *— Linear, adapted.*

**Semblia delta:**
`ProjectsClient` shows filter pills + search + view toggle the moment any project exists (`projects-client.tsx:76`). A user with 1-3 projects (the entire early-customer lifetime, weeks 1-N) has *nothing to filter, nothing to search, nothing to switch views over*. The toolbar is theatre.

Adaptation: hide the toolbar until there's enough content to operate on. A reasonable threshold for this surface is `projects.length >= 6` (above the comfortable visual fit on a laptop screen at default zoom). View toggle could be retained at lower thresholds *if* there's evidence card view is preferred at small counts — but the current default `"list"` already presumes list, so the toggle is currently a third option for nothing.

### P3. One row, one identifying signal

> Productivity software must be designed for purpose; each visible element earns its place.
> *— Linear's "purpose-built", adapted.*

**Semblia delta:**
`ProjectRow` trails six items: pending pill → testimonials count → widgets count → visibility icon → updated-at → arrow. The user's actual question — *"which one of my projects do I want?"* — is answered by the leading avatar + name. The trailing strip says "and also some numbers", but at the expense of scanability across the list.

Adaptation: collapse the trailing area to one identifying line. The natural Semblia vocabulary is `RowMetric` — use it for the single most navigationally relevant number (pending count when > 0, otherwise updated-at). Move secondary numbers (testimonials, widgets) into the hover-revealed area or drop them from the row entirely — they're already a tap away on the project detail page. The decorative trailing arrow goes away because the whole `ItemRow` is the link.

### P4 (corollary). Don't invent positioning where labels would do

> "Don't invent terms if possible."
> *— Linear, adapted.*

**Semblia delta:**
This isn't about the term "project" (already industry-standard). It's about the brand-positioning copy ("A studio for trust") doubling as orientation. Positioning belongs on the marketing site or the onboarding `/welcome` surface. The workspace home is where the user comes to *work*.

## What we are **not** taking from these sources

- **Linear's grayscale density** — Semblia is intentionally warm (warm slate + amber-sand). We won't desaturate to match Linear's neutrals.
- **Linear's commandbar-first navigation** — Semblia is not building toward an enthusiast-keyboard product yet. Our users are creators/founders, not engineers.
- **Vercel's dark-by-default aesthetic** — out of scope for this surface; theme isn't being touched.
- **Geist's "Blank Slate" archetype** (just a centered icon + line) — too cold for Semblia's first-run; the existing three-stage flow + populated-preview is the right archetype for this product. We keep it.

## Confidence

- P1 high — direct match with Geist's documented guidance and the user's own brief ("not artificial marketing copy").
- P2 high — Linear's documented stance, plus internal usability logic (you can't filter 1 item).
- P3 medium — Linear's principle is general; the specific row-shape change is judgment calibrated against the current `RowMetric`/`ItemRow` vocabulary. Worth verifying with screenshots after the change.
- P4 high — direct continuation of P1.
