# Principles — `/projects/[slug]/testimonials`

## Sources consulted

- **Linear Inbox docs** (`linear.app/docs/inbox`) — quick search vs display toggles as orthogonal axes; progressive disclosure for transient vs permanent state.
- **Superhuman marketing** (`blog.superhuman.com/the-fastest-email-experience-ever-made`) — keyboard-first triage, split inbox (pre-categorization), aesthetic restraint during repetitive actions.
- Other sources (Linear Method, Senja) returned thin content; not used.

The external sources were sparse enough that this file mostly reasons from established triage-UX heuristics, grounded by what those references *do* confirm.

## Distilled principles for a triage surface

### P1. One axis per control band; don't multiply filter strips

Linear keeps **search** (find a specific thing) and **display toggles** (control transient visibility) on separate, orthogonal axes — both reachable from a single chrome strip, neither competing as a "primary filter." When a surface has both *categorical* filters (status) and *ordering* filters (sort) and *full-text* filters (search), the user reads them as one question — *"narrow this list"* — and expects one strip.

**Why this applies here:** Semblia currently splits the answer to "narrow this list" across two stacked bands (status tabs in the header toolbar + search/sort/select in the filter bar). They visually look like two decisions, but they're one.

### P2. The next pending action is the loudest thing in the header

Triage tools earn their keep by surfacing *the next unit of work*, not *the full set of filters*. Superhuman's whole pitch is "everything is a key press away" — but the keypresses are taught by showing the user, in chrome, what *to* press for. When pending work exists, the header should make the act of taking that work the path of least resistance.

**Why this applies here:** The current header description says "12 total · 3 pending" in muted text. The pending count is data, not a doorway. The doorway *should be* a header-level action that filters to Pending and scrolls/focuses the first row — and on keyboard, the `j` shortcut already does step 2.

### P3. Don't restate the filter on every row inside it

Linear's row metadata is **customizable per-view** — the user picks which properties matter, *for the current scope*. A status pill on every row is useful when the user is in a mixed-status view (where it's a differentiator) and noise when the user has already filtered to a single status (where it restates the filter on every line).

**Why this applies here:** Under the "Pending" tab, every row says "Pending." Under "Approved," every row says "Approved." The pill earns its space only on `ALL`. Under a single-status tab, the row meta should redistribute that space to information the user *can't* derive from chrome — published/draft state, time since received, source.

### P4. Reserve a stable right gutter for hover-revealed actions

Triage interactions are repetitive — the hand stays close to where actions appear. If actions overlay content unpredictably, every hover requires the eye to reparse the row. Stable position > "appears where there's room."

**Why this applies here:** Inline approve/reject is `absolute right-3 top-1/2` and overlays the right edge of the content preview on long testimonials. A reserved gutter that's empty when not hovered (or shows a faint chevron) preserves layout and lets the hand pre-position over where the action will be.

### P5. Quiet by default; loud only when consequential

Superhuman's design choices reduce visual chroma during high-frequency repetition. Pills, badges, and chips are *expressive* primitives — they earn their colour. Used everywhere, they desensitize the eye to the one that actually matters (e.g. a flagged item vs an ordinary pending one).

**Why this applies here:**
- Under a filtered view, drop the redundant pill (P3).
- The header's "pending" warning text is the right register — small, coloured, factual.
- Bulk-toolbar buttons should state *what they'll do, to how many* — "Reject 12" not "Reject" — so chroma matches stakes.

### P6. Trust the keyboard; chrome shouldn't restate every shortcut

The existing `j`/`k`/`a`/`r`/`p`/`Esc`/`?` keyboard loop is genuinely strong. The principle here is *don't undermine it* by adding mouse-only affordances that the keyboard already handles (e.g. a header "Select all" button when shift+j+a would do the same).

**Why this applies here:** Keep the `?` shortcut dialog as the single discoverability surface for the keyboard model. Don't add header buttons that duplicate it.

## Semblia-specific adaptations

These translate the abstract principles into rules for the warm-slate / amber-sand "Quiet Precision" palette and existing primitives.

- **One control strip.** Move status tabs and the sort dropdown into a single `PageToolbar`-style band. The search field lives there too. The "Select" button moves to a row-level affordance (shift-click) or disappears entirely (the bulk model engages from per-row checkbox-on-hover; current avatar-becomes-checkbox swap can be triggered by row hover-shift).
- **Primary action when work is waiting.** Header description gains a soft button: *"Review N pending →"* (warning-toned) when `pendingCount > 0`. Clicking sets `status = 'PENDING'` and dispatches the first `j`. Disappears at pending = 0.
- **Row pill discipline.** `StatusPill` renders only when `status === 'ALL'` (i.e. the active tab doesn't already encode it). For approved rows in any view, surface a small published/draft glyph in its place — `Eye` for published, `EyeOff` for draft, both `text-muted-foreground`.
- **Stable right-rail gutter.** Reserve `pr-16` (or equivalent) on the row content so hover-actions slot into reserved whitespace rather than overlapping the preview clamp.
- **Bulk-toolbar copy.** "Approve N" / "Reject N" with the count. Optional follow-up: undo toast.
- **Don't redesign the empty states.** They already follow these principles (orienting H2, concrete CTA, restrained chroma). Leave them alone except for the eyebrow-alpha contrast follow-up.

## Anti-goals (what we will *not* do)

- **No new shared primitives.** Reuse `PageToolbar`, `PageTabs`, `Button`, `StatusPill`, `ActionButton`, `Eye`/`EyeSlash` icons (already imported elsewhere in `shared.tsx`). If a useful primitive seems missing, record as a follow-up.
- **No visual flourish for personality.** No new gradients, glyphs, or motion. The triage loop is daily-driver software; texture is noise.
- **No grayscale drift toward Linear/Vercel.** Semblia stays warm — keep amber-sand chroma on pending/warning, keep the brand glyph on the empty-state eyebrow.
- **No redesign of the detail panel.** Out of scope for this surface — separate audit.
- **No bulk-undo backend work.** If we add bulk count in the button, the undo affordance is a follow-up *unless* the backend already supports a reversal route (it does — re-approve flips status back).
