# Semblia Product Checklist

Date: 2026-04-18

Status: Product planning checklist derived from the competitive analysis in docs/semblia-competitive-analysis.md.

## How To Use This Checklist

- Use this as a working product strategy checklist, not as a final roadmap.
- Treat checked items as completed strategic decisions or delivered product capabilities.
- Treat unchecked items as backlog or validation work.
- Revisit this document each time Semblia changes target segment, packaging, or publish surface scope.

## Priority Legend

- P0: Must decide or ship soon
- P1: Important next bet
- P2: Useful, but not urgent
- P3: Avoid or explicitly defer

## Section 1: Strategy And Positioning

### Product Wedge

- [ ] P0: Confirm Semblia's primary ICP for the next 6 to 12 months.
- [ ] P0: Decide whether Semblia is optimizing first for solo founders, lean SaaS teams, or agencies.
- [ ] P0: Lock the primary category framing as "project-first testimonial platform" or revise deliberately.
- [ ] P0: Decide whether audio is a hero feature or just supported media.
- [ ] P0: Document what Semblia will not become in the near term: survey suite, review-management suite, employer-brand platform, or managed service.

### Positioning Narrative

- [ ] P0: Write the primary positioning statement around project-first, multi-format testimonial workflow.
- [ ] P0: Create a one-line answer to "Why Semblia instead of Senja?"
- [ ] P0: Create a one-line answer to "Why Semblia instead of Testimonial.to?"
- [ ] P0: Create a one-line answer to "Why Semblia instead of Famewall?"
- [ ] P1: Create a one-line answer to "Why Semblia instead of Trustmary?"
- [ ] P1: Create a one-line answer to "Why Semblia instead of Vocal Video?"
- [ ] P0: Ban generic homepage language like "all-in-one social proof platform" unless there is a deliberate reason to broaden category scope.

### Homepage And Messaging

- [ ] P0: Show text, video, and audio proof together on the homepage.
- [ ] P0: Show the workflow visually: request, receive, approve, publish.
- [ ] P0: Add at least one comparison-oriented homepage section.
- [ ] P0: Add messaging around fast, stable embeds.
- [ ] P1: Add messaging around proof organization inside projects.
- [ ] P1: Add messaging around moderation and quality control.

## Section 2: Core Product Decisions

### Project Model

- [ ] P0: Confirm the project object as Semblia's core organizing unit.
- [ ] P0: Decide which entities live inside a project: forms, sources, testimonials, publish assets, themes, and embeds.
- [ ] P0: Define how a testimonial moves from unreviewed to approved to published.
- [ ] P0: Define whether a testimonial can belong to multiple publish surfaces within the same project.
- [ ] P1: Define whether a testimonial can be reused across projects.

### Media Model

- [ ] P0: Define the minimum metadata captured for text testimonials.
- [ ] P0: Define the minimum metadata captured for video testimonials.
- [ ] P0: Define the minimum metadata captured for audio testimonials.
- [ ] P0: Add transcript support to video and audio assets.
- [ ] P1: Define how transcript snippets become quote cards or highlights.
- [ ] P1: Define how audio testimonials are previewed before publishing.

## Section 3: P0 Must Build Now

### 1. Multi-Source Import Hub

- [ ] P0: Decide the first import sources to support.
- [ ] P0: Include CSV import in the first wave.
- [ ] P0: Prioritize import sources that reduce migration friction from direct competitors.
- [ ] P0: Decide whether imports are one-time, scheduled sync, or both.
- [ ] P0: Add duplicate detection across imported and native submissions.
- [ ] P0: Map imported assets into the existing project-first structure.
- [ ] P0: Let imported items land in a review queue instead of auto-publishing.
- [ ] P0: Preserve original source attribution on imported testimonials.
- [ ] P1: Add source-based filtering and tagging for imported items.
- [ ] P1: Add an onboarding wizard for "bring your existing testimonials into Semblia."
- [ ] P1: Track activation impact: percent of new accounts importing within the first session.

Definition of done for imports:

- [ ] A new user can create a project and import existing proof without manual copy-paste.
- [ ] Imported proof does not bypass moderation.
- [ ] Imported proof retains source context and can be published in existing layouts.

### 2. Invite And Reminder Automation

- [ ] P0: Define the initial testimonial request flow for email.
- [ ] P0: Decide whether SMS is in scope now or later.
- [ ] P0: Support at least one reminder step for unanswered requests.
- [ ] P0: Allow a project-level testimonial request template.
- [ ] P0: Let users customize request questions.
- [ ] P0: Track request status: sent, opened, submitted, approved.
- [ ] P0: Prevent duplicate request spam to the same person within a project.
- [ ] P1: Add basic personalization variables to request messages.
- [ ] P1: Add request performance analytics.

Definition of done for automation:

- [ ] A user can send a testimonial request without using a third-party tool.
- [ ] A user can see which requests need follow-up.
- [ ] Requests and resulting submissions are connected inside the project.

### 3. Richer Publishing Surfaces

- [ ] P0: Add carousel layout support.
- [ ] P0: Add single-card embed support.
- [ ] P0: Add badge or compact trust element support.
- [ ] P0: Decide whether floating widgets are in scope now or next.
- [ ] P0: Ensure all publish surfaces are responsive.
- [ ] P0: Ensure publish surfaces support text, video, and audio gracefully.
- [ ] P0: Preserve performance on third-party websites.
- [ ] P0: Add per-layout style controls that do not overwhelm the user.
- [ ] P1: Add template presets for SaaS, creators, agencies, and service businesses.
- [ ] P1: Add per-widget publish analytics.

Definition of done for publishing:

- [ ] Semblia can power more than walls, grids, and lists.
- [ ] A user can choose a format based on page intent, not just visual preference.
- [ ] Embed performance is stable enough to use as a selling point.

### 4. Basic Proof Analytics

- [ ] P0: Decide the minimum analytics package to ship.
- [ ] P0: Track widget views.
- [ ] P0: Track click-through or CTA interactions if applicable.
- [ ] P0: Track asset-level views for video and audio.
- [ ] P0: Show simple proof-performance metrics inside each project.
- [ ] P0: Avoid shipping vanity analytics with no clear user action attached.
- [ ] P1: Add source and format breakdowns.
- [ ] P1: Add best-performing asset views.

Definition of done for analytics:

- [ ] A user can tell which testimonials or layouts are being seen.
- [ ] The analytics package supports upgrade justification without creating dashboard bloat.

## Section 4: P1 Strong Next Bets

### 5. Audio Publishing Layer

- [ ] P1: Make audio testimonials visible in the product navigation and publish flows.
- [ ] P1: Add waveform or audio-preview UI.
- [ ] P1: Add transcript-driven quote extraction for audio.
- [ ] P1: Add audiogram-ready card output or equivalent.
- [ ] P1: Add audio-specific layout behavior rather than forcing audio into video or text templates.
- [ ] P1: Make audio a visible homepage and onboarding example.

Definition of done for audio:

- [ ] Audio is treated as a publishable proof asset, not just a captured file.

### 6. AI-Assisted Asset Operations

- [ ] P1: Auto-transcribe video and audio.
- [ ] P1: Suggest short quotes from longer testimonials.
- [ ] P1: Suggest titles or themes for each testimonial.
- [ ] P1: Auto-tag testimonials by topic or sentiment.
- [ ] P1: Suggest clips or highlight moments for video testimonials.
- [ ] P1: Keep AI outputs editable and non-destructive.
- [ ] P1: Avoid AI features that sound impressive but do not reduce user effort.

Definition of done for AI ops:

- [ ] The product saves meaningful manual work in reviewing and repurposing proof.

### 7. Lightweight Collaboration

- [ ] P1: Decide whether collaboration is project-level only or account-wide.
- [ ] P1: Define the first two or three roles.
- [ ] P1: Prevent collaboration scope from turning into a full enterprise permissions rewrite.
- [ ] P1: Support shared review and approval inside a project.
- [ ] P1: Let an owner restrict publish access separately from review access.

Definition of done for collaboration:

- [ ] Semblia supports lean teams without abandoning single-user simplicity.

### 8. SEO And Schema

- [ ] P1: Decide which published surfaces should emit schema markup.
- [ ] P1: Ensure publish surfaces are crawlable where appropriate.
- [ ] P1: Avoid schema implementations that overpromise unsupported review semantics.
- [ ] P1: Add metadata controls for hosted testimonial pages.

Definition of done for SEO:

- [ ] Semblia helps users turn proof into discoverable, structured content, not just embeds.

## Section 5: P2 Useful But Lower Priority

### White-Label And Agency Support

- [ ] P2: Decide whether agencies are a primary near-term segment.
- [ ] P2: Add custom domain support where needed.
- [ ] P2: Add removal of platform branding at the right tier.
- [ ] P2: Add project duplication and handoff flows if agencies become a priority.

### Deeper Integrations

- [ ] P2: Prioritize Zapier, Make, API, and webhooks before native deep integrations.
- [ ] P2: Validate which CRM integrations are actually demanded by the ICP.
- [ ] P2: Avoid building many shallow native integrations too early.

### Incentives And Reward Mechanics

- [ ] P2: Validate whether incentives are truly needed for the target segment.
- [ ] P2: Avoid introducing compliance or abuse complexity before core request automation is working.

## Section 6: P3 Explicitly Defer Or Avoid

- [ ] P3: Do not build a full NPS or survey suite unless Semblia intentionally shifts categories.
- [ ] P3: Do not build a managed production service.
- [ ] P3: Do not build an employer-brand content platform.
- [ ] P3: Do not build a full professional video editor.
- [ ] P3: Do not let review management become the core story unless the company chooses that category intentionally.

## Section 7: Pricing And Packaging Checklist

- [ ] P0: Keep the core collect-review-publish loop available in the starter plan.
- [ ] P0: Avoid punishing solo users with seat-based pricing too early.
- [ ] P0: Gate advanced automation, analytics, and collaboration instead of gating core usability.
- [ ] P0: Define a clear free-to-paid upgrade moment.
- [ ] P1: Decide whether projects, requests, or published surfaces are the cleanest primary packaging lever.
- [ ] P1: Validate whether media-type gating hurts positioning if audio is a strategic wedge.
- [ ] P1: Ensure pricing comparisons versus Senja, Testimonial.to, and Famewall are easy to explain.

## Section 8: Customer Research And Validation Checklist

### Interviews

- [ ] P0: Interview at least 4 solo founders.
- [ ] P0: Interview at least 3 SaaS marketers or growth leads.
- [ ] P1: Interview at least 3 agencies or consultants who manage proof for clients.
- [ ] P0: Ask each segment what they currently use instead of Semblia.
- [ ] P0: Identify whether their biggest pain is collection, organization, publishing, imports, or proving ROI.

### Fake-Door And Messaging Tests

- [ ] P0: Test demand for imports.
- [ ] P0: Test demand for proof analytics.
- [ ] P1: Test demand for collaboration.
- [ ] P0: Test two homepage narratives against each other.
- [ ] P1: Test whether audio-led messaging increases curiosity or confuses buyers.

### Competitive Tracking

- [ ] P1: Track Senja releases and pricing changes monthly.
- [ ] P1: Track Testimonial.to publish and packaging changes monthly.
- [ ] P1: Track Famewall's import, AI, and pricing moves monthly.
- [ ] P2: Monitor Trustmary for schema, analytics, and AI-search positioning.
- [ ] P2: Monitor Vocal Video and StoryPrompt for changing video expectations.

## Section 9: Success Metrics Checklist

- [ ] P0: Define activation as a measurable milestone, not just signup.
- [ ] P0: Track percent of users who create a project in session one.
- [ ] P0: Track percent of users who collect or import their first testimonial in session one.
- [ ] P0: Track percent of users who publish an asset within the first week.
- [ ] P0: Track percent of users who return to moderate or edit proof after first publish.
- [ ] P1: Track publish-surface usage by format.
- [ ] P1: Track audio usage separately from text and video.
- [ ] P1: Track which features actually drive paid conversion.

## Section 10: Release Order Checklist

### Phase 1

- [ ] Imports
- [ ] Invite and reminder automation
- [ ] Richer publish surfaces
- [ ] Basic proof analytics

### Phase 2

- [ ] Audio publishing layer
- [ ] AI-assisted asset operations
- [ ] Lightweight collaboration
- [ ] SEO and schema improvements

### Phase 3

- [ ] Agency support if the segment proves real
- [ ] Deeper integrations if they are clearly demanded
- [ ] Proof intelligence and asset recommendations

## Section 11: Final Product Guardrails

- [ ] Keep Semblia narrower and more focused than Trustmary.
- [ ] Keep Semblia simpler and more founder-friendly than heavier automation suites.
- [ ] Keep Semblia more workflow-aware than display-only tools.
- [ ] Keep Semblia more multi-format than text-and-video-only competitors.
- [ ] Keep audio visible enough to matter strategically.
- [ ] Do not let roadmap pressure from adjacent categories erase the core wedge.

## Working Summary

If only a small number of things get done next, this checklist says Semblia should:

- [ ] Clarify the wedge around project-first, multi-format proof.
- [ ] Build imports.
- [ ] Build request automation.
- [ ] Expand publish surfaces.
- [ ] Add proof analytics.
- [ ] Turn audio into a visible publishing advantage.