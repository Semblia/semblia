# Collection IA — what the references teach, 2026-08-02

Branch `feat/internal-ui-rework-2026-07` (continues PR #53).

Four reference captures were studied against live screenshots of our own
surfaces (session scratchpad, Playwright harness, seeded through the real
import pipeline). The references are Senja: their forms list, testimonials
list, customer detail, and — the one that decides this pass — their import
page (`app.senja.io/import`, status bar shows `/import/web` behind the
"Import from web" card: **their methods are separate pages, not dialogs**).

The instruction driving this file: *extract principles and thoughts, not
components.* And two questions to ask of every screen before anything else:

1. **Is this page easy to navigate?** Can a first-time user predict what each
   click will do before clicking it?
2. **Is there too much on this screen?** What single decision is the user here
   to make — and does everything visible serve it?

## The import page: what Senja does better than us

Our current import page: 56 source tiles in four groups, each tile carrying a
status dot, an availability line, sometimes a policy sentence, one button and
an overflow menu — plus filter pills, a search field, and a history feed.
Senja's: a heading, one sentence, **five choices**, a divider, a footer hint.

**P1 — Ask "how", never "which of 56".** The user arriving at an import page
does not know our catalog; they know what they *have* — a file, a URL, a
platform login, text on their clipboard, an old wall. Senja's landing asks one
question ("how do you want to add proof?") with five answers, each one
sentence. The which-source question comes *after* the user commits to a
method, when it has maybe seven answers instead of 56.

**P2 — Breadth is a boast, not a burden.** "Import your proof from 30
sources" — the count lives in the subtitle, and a small favicon cluster on one
card hints at the range. We rendered the same fact as 56 separate decisions.
State the number; don't make the user scroll it.

**P3 — One method dressed as thirteen tiles is noise.** Our "Quick import"
group had Facebook, Instagram, Pinterest, TikTok, Threads, Slack, Discord,
Telegram, WhatsApp, Amazon, Airbnb… every one saying "Manual only · Add
manually". That is *one* capability — paste text in yourself — wearing
thirteen costumes. The platform name is provenance metadata; it belongs
*inside* the manual flow as an attribution field, not on the landing page as a
choice.

**P4 — Complexity after commitment.** Availability states, OAuth setup
caveats, per-source policy sentences, sync schedules: all real, none of it
relevant before the user picks a method. Progressive disclosure is not hiding
information; it is sequencing it to match the decision being made.

**P5 — No management chrome on an action page.** Search, filter pills, and a
history feed are queue furniture. An entry page whose job is a single decision
should carry nothing that competes with it. (Recent import jobs keep a quiet
band at the foot of the landing page — results, not controls.)

## The forms list: what their row knows that our card doesn't

Their row: a large live preview (~270px), the form's name with status and
hosted URL beside it, then a stat block — invites, unique visits,
testimonials, response rate — and per-row quick actions. Everything an owner
asks of a form ("is it live, where does it live, is it working?") is answered
*in the row*, and the numbers double as navigation.

**P6 — The row answers the owner's questions, not the record's fields.**
"Updated Jul 18 · v1 published" describes the record. "1 visit · 1 response ·
100% response rate" describes the *performance* — which is what the owner
actually checks a forms list for. We already ship these metrics on the DTO;
the card just doesn't show them.

**P7 — One item must not look like an accident.** Their single form fills the
row and reads as an inventory of one. Our single card floats in a white void
and reads as an empty page with debris. Full-width rows scale down to n=1
gracefully; card grids don't.

## The testimonials list and customer page

**P8 — Recognition before reading.** Their rows lead with the author's
avatar; ours lead with a 6px status dot. A moderation queue is a list of
*people saying things* — the person belongs in the row. (Status stays a
glyph — V2 holds; the avatar carries it.)

**P9 — Never show two empty states side by side.** Our empty queue renders
"You're all caught up" in the list column *and* "Nothing selected" in the
record column — two voices announcing the same silence. When the list is
empty there is no record to select; the split has no reason to exist yet.

## Sitemap

**P10 — Import is collection, not moderation.** Importing proof *produces*
queue entries; it is not itself a moderation activity. Senja files Import
under COLLECT beside Forms — the two ways proof enters the system — and keeps
the review surface under MANAGE. Ours sat under Responses, which forced the
"where do I add old testimonials?" answer to be "inside the review queue",
one level deeper than any first-time user would look.
