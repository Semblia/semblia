# Research: moderation / review queue UI, with automated-moderation signal display

Date: 2026-07-27
Method: public primary artifacts only (vendor help centers, developer docs, design-system
docs, official changelog threads, one peer-reviewed-style survey of Reddit moderators).
No logged-in dashboards were reachable. Every claim below is attributed. Where a target
could not be verified from a primary source it is listed in
[Could not verify](#could-not-verify) rather than guessed.

Our situation, for reference while reading: per-artifact provider runs with a decision
`APPROVE | REVIEW | REJECT`, a 0–1 score, per-category scores, flags; plus a
reviewer-authoritative status `PENDING | APPROVED | REJECTED | SPAM | ARCHIVED`; plus a
separate publish lifecycle. No moderation UI exists yet.

---

## Source inventory

| Source | What it documents | URL |
|---|---|---|
| Reddit Help — Moderation Queue | modqueue tabs, actions, bulk, keyboard, contextual panel, user panel | `support.reddithelp.com/hc/en-us/articles/15484440494356-Moderation-Queue` |
| Reddit Help — Harassment filter | LLM filter, Moderate/High naming, allow list, "Test this filter", "Potential harassment" alert, "Did we get this right?" | `.../articles/23856209638932-Harassment-filter` |
| Reddit Help — Reputation filter | account-behaviour filter, two named thresholds, approved-user bypass | `.../articles/27441485903124-Reputation-filter` |
| Reddit Help — Moderation Tools overview | the Safety Filters family (ban evasion, reputation, harassment, mature, adult-promoter) | `.../articles/15484384020756-Moderation-Tools-overview` |
| Reddit Help — Automations (Post & Comment Guidance) | Trigger→Condition→Action, four intent templates, Live Previewer, rule priority, `[caught_key_phrases]` | `.../articles/17625458521748-Automations-Post-Comment-Guidance-Set-Up` |
| arXiv 2509.07314 — "In the Queue: Understanding How Reddit Moderators Use the Modqueue" | survey of ~100+ mods: prioritisation strategies, signal complaints, items vanishing on first action | `arxiv.org/html/2509.07314v1` |
| YouTube Help — Learn about comment settings | None/Basic/Strict/Hold all, blocked words, approved users, 60-day expiry, AI-fallibility disclaimer | `support.google.com/youtube/answer/9483359` |
| YouTube Community (TeamYouTube, Dec 2020) | merging "Likely spam" + "Held for review" into one tab; removal of the pending counter; 60-day expiry rationale | `support.google.com/youtube/thread/86718643` |
| Twitch Help — How to Use AutoMod | 4 levels × 5 categories, shield glyph count, Allow/Deny, blocked/permitted terms, deny→add-term / allow→permit-term loop, private terms, Occurrences column | `help.twitch.tv/s/article/how-to-use-automod` |
| Twitch Dev — Moderating Twitch Chatrooms | `Check AutoMod Status` dry-run (`is_permitted`), `automod.message.update` payload with `level`, `category`, `status`, `held_at`, `moderator_user_*` | `dev.twitch.tv/docs/chat/moderation/` |
| arXiv 2506.07667 — "Auditing the Moderation of Hate Speech on Twitch" | confirms AutoMod queue displays the content category as the stated reason; 5-point per-category scales | `arxiv.org/html/2506.07667v2` |
| Discord Support — AutoMod FAQ | rule types, action triples (block / alert / timeout), alerts channel, exempt roles & channels | `support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ` |
| Discord Dev — Auto Moderation | rule object, action types `BLOCK_MESSAGE / SEND_ALERT_MESSAGE / TIMEOUT`, `custom_message`, `exempt_roles`, `exempt_channels` | `docs.discord.com/developers/resources/auto-moderation` |
| Meta Help — Manage comments with Moderation Assist | full criteria list, Activity Log filters, "See details" showing criteria met, Undo, Edit criteria | `facebook.com/help/messenger-app/1753036688579904` |
| Trustpilot Help — flag reasons | reason + sub-reason taxonomy, one reason per flag, explicit "we won't remove just because…" counter-guidance, Transparent Flagging | `help.trustpilot.com/s/article/For-which-reasons-can-businesses-flag-service-reviews` |
| Trustpilot Help — what happens after flagging | per-item status chip behind the flag icon, "Flagging activity" overview page, harmful-only hiding during investigation, immutable submissions | `help.trustpilot.com/s/article/What-happens-after-businesses-flag-reviews` |
| Google Business Profile Help — report inappropriate reviews | three named report statuses, one-time appeal, ≤10 selection cap, automated spam detection disclosure | `support.google.com/business/answer/4596773` |
| Senja Help — approved vs unapproved | default-unapproved, status on the right of each row, filter→select-all→bottom popup toolbar, per-form auto-approve, rating-gated auto-publish | `support.senja.io/what-do-approved-and-unapproved-mean-rfswt` |
| Senja Help — find and manage testimonials | Proof page filters (All/Approved/Unapproved/Thanked/Not thanked), open-item action set, irreversible-edit warning | `support.senja.io/how-to-find-and-manage-my-testimonials-etaki` |
| Hive — Moderation Dashboard overview + Quickstart Pt 2 | Content Feed vs Review Feed split, thresholds, rules, "Flag Post For Review" action, "Reviewed as Delete Post" + Submit Review, Actions Log, permission split | `docs.thehive.ai/docs/what-is-the-moderation-dashboard`, `.../moderation-dashboard-quickstart-part-2-human-review` |
| Checkstep docs — Standard Integration + Glossary | `confidence: check|trust` two-band, `severity` 5-level, two-threshold policy model, decision verbs, `field_violations`, moderator attribution | `docs.checkstep.com/standard/`, `docs.checkstep.com/glossary` |
| OpenAI — Moderation guide | `flagged` + `categories` + `category_scores` + `category_applied_input_types`; explicit "signals, not an automatic blocking decision"; error-instead-of-scores case; recalibration warning | `developers.openai.com/api/docs/guides/moderation` |
| AWS Rekognition docs + A2I docs | `MinConfidence` default 50, confidence 0–100, two-level label hierarchy, `ModerationLabelConfidenceCheck` + `RandomSamplingPercentage` routing, "1–5% of total volume" framing | `docs.aws.amazon.com/rekognition/latest/dg/moderation.html`, `.../a2i-rekognition.html`, `.../a2i-json-humantaskactivationconditions-rekognition-example.html` |
| Shopify Polaris — Empty state | "intended for use when a full page in the admin is empty"; `ResourceList` has a separate `noSearchResults` slot; maintainer statement distinguishing empty state from empty results | `polaris-react.shopify.com/components/layout-and-structure/empty-state`, `github.com/Shopify/polaris-react/issues/1704` |

---

## 1. QUEUE SHAPE — queue (decide-and-advance) vs list (scan-and-act-inline)

**Everyone shipped a list. Nobody shipped a one-at-a-time wizard.** The one-at-a-time
behaviour exists, but as a *detail panel opened from the list*, never as the default view.

### Reddit — list with two densities plus a side panel
Reddit's modqueue is a scrollable list of items, and the moderator chooses the density
explicitly: a view-mode dropdown in the upper right offers **Compact** and **Card**
(Reddit Help, Moderation Queue). The density choice changes *where the report reasons go*,
not whether they appear: "You can review the report reasons for each user-reported item
directly below the post or comment (in card view) or to the right of each post or comment
(in compact view)." Decide-and-advance is reached by clicking an item, which "will open up
the 'contextual panel' on the right side of the screen" — and crucially the panel is
action-capable, not read-only: "From the contextual panel, you can also take various mod
actions, including approving or removing the reported content as well as the original
post."

The list is also **sub-divided into named tabs rather than one merged stream**: Needs
Review, Reported, Removed, Edited, Unmoderated. Reddit gives each tab a reason to exist in
plain language. `Reported` is separated from `Needs Review` specifically because of
visibility state: "Unlike the mod queue, however, *reported* shows you only posts and
comments flagged through user-reporting and these posts are all still visible in the
community's listings page, making this queue important to prioritize." `Unmoderated` is
documented as optional-and-usually-unnecessary: "While most mod teams will find this queue
unnecessary, it can be helpful in very small communities."

**What drove the list.** The Reddit-moderator survey (arXiv 2509.07314, §5.3) found
prioritisation is *not* uniform and mods actively re-order: "A little over half (56) of our
respondents that reported using the modqueue described simple, sequential ways of moving
through the modqueue," while others sorted newest-first ("a way to prioritize activity that
was happening in real-time") or oldest-first for fairness — P038: *"I deal with the oldest
queries first, as that seems the fairer option."* A forced decide-and-advance order would
have destroyed all of this. The same paper (§6.1.2) concludes "interface affordances become
proxies for broader community or moderation values."

**The strongest anti-wizard evidence in the whole corpus** is arXiv 2509.07314 §5.5.2,
"Modqueue Items Disappear Before Mods Are Fully Done With Them" — P006: *"It's annoying
that as soon as I take an action (even minor action) on an item in the queue that the item
disappears… Sometimes I need to take more than one action, for example deleting the
offending comment, AND locking the thread, AND banning the person."* And P105: *"Sometimes
I second guess myself and it's tricky to backtrack."* Auto-advancing on first action is a
documented, quoted failure mode.

### YouTube — tabbed list, and it got *fewer* tabs over time
YouTube Studio → Comments is a list under three tabs, Published / Held for review / Likely
spam (widely documented; e.g. support.google.com/youtube/thread/347580516). The 2020
TeamYouTube announcement (thread 86718643) is a rare public record of a queue-shape
decision being *simplified*: "**One tab for unpublished comments**: We're combining the
'Likely spam' tab and 'Held for review' tab into one tab to create a streamlined experience
for all comment moderation so you can spend less time managing comments." The merge order
was specified too: "Comments from the 'Likely Spam' tab will be added to the end of the new
single tab" — i.e. lower-trust machine verdicts sort last, not first.

### Twitch — the one genuine live queue, because the medium is live
Twitch's AutoMod Queue lives in Mod View and is effectively a stream of held messages to
Allow or Deny (Twitch Help). It behaves queue-like because chat is real-time and a held
message is blocking a conversation. Even here the atomic decision is binary and inline
("the message is held and shown to moderators to **Allow** or **Deny**"), not a multi-step
form. On mobile it degrades to swipe gestures — and Reddit's mobile app does the same:
"Swipe right on the content in the queue to approve it… Swipe left on the content in the
queue to remove it."

### Hive — an explicit two-surface split
Hive separates a **Content Feed / User Feed** (everything, for browsing and sorting: "as
well as visualize and sort through high-risk posts and users") from a **Post Review Feed**
(only what rules routed to humans). The routing between them is an *action* named "Flag
Post For Review", and it is auto-provisioned: "Note that 'Flag Post For Review' will be
available as an action by default if human review conditions are active." The review feed's
decision model is *staged, not immediate*: "tick the box in the upper right hand corner of
the post preview – you should see the image header change to '**Reviewed as Delete Post**' –
and then select '**Submit Review**'." So a moderator marks a batch, sees each item's
pending verdict reflected in its own header, and commits once. This directly answers the
P006 complaint: the item does not vanish on the first click.

### Senja — pure list, no queue at all
Senja's testimonial surface is the **Proof page**: a list with a status filter (All,
Approved, Unapproved, Thanked, Not thanked), tag filters, a search bar, and a `Filter`
button for more. Bulk acting is list-native: "Filter the status to show only **Unapproved**
ones → Select all, using the checkbox next to **Filter** → Click **Approve** on the bottom
popup toolbar." Opening an item is for *editing*, not for deciding — the open-item action
set is Update customer's details / Add a tag / Edit / Trim / Duplicate / Delete / Share.

### How they combine both
The pattern is unanimous and worth naming: **list is the shell, panel is the detail, and
the panel can act.** Reddit's contextual panel, Reddit's user profile panel, Hive's post
preview, Meta's "See details" — all are opened from a row, all carry the decision controls,
and none of them replace the list as the default view.

Reddit adds a multi-tenant wrinkle worth stealing: a community picker that fans the queue
across projects — "You have the option to view one, multiple or all communities you
moderate which gives you the ability to quickly switch between communities or view all
flagged content in one combined queue."

---

## 2. ITEM ANATOMY — what a pending row shows before you act, and what is withheld

### Reddit — the documented minimum row
The survey's Figure 2 caption for Old Reddit is the most precise row spec available:
"Each entry displays basic metadata about the flagged content, including the content itself
(e.g., comment text), the author, the number of reports, and minimal contextual information
(such as the post a comment belongs to and the number of other comments on that post)."
So: content, author, signal-volume, and a one-hop provenance breadcrumb.

New Reddit adds, per the same paper: report reasons and "excerpts of surrounding
discussion" in the contextual panel, and a user panel that "surfaces subreddit-specific
information about that user (e.g., prior activity, local karma)."

**Deliberately withheld until you open the item** — and this is the interesting part:
- **The full conversation.** Only *excerpts* are inline; the panel exists to "access the
  original post or comment, view replies from other users."
- **Everything about the author.** Reddit gates the whole author dossier behind a click on
  the username: mod notes, modmail, ban/mute/report, user flair, "their mod log,
  contribution overview, and a history of the communities they've engaged with," and a
  "user summary which is a concise overview of a redditor's recent activity."
- **Reports from untrusted reporters.** "If you enabled *Hide untrusted reports*, you'll
  find a link to *hidden reports* with a little flag at the top of your *reported* queue."
  Low-quality signals are collapsed to a link, not a row.

Two row-level affordances are worth copying verbatim:
- **A reviewed marker that is internal-only, and attributable on hover.** On approve, "A
  little green tick icon will appear on that content in your community's listing page. This
  is only visible to moderators of your community… Hovering over this tick shows which
  moderator approved the item and when."
- **Live collision avoidance.** "When using **card view** mode in your mod queue, any
  actions taken and which mod is responsible for them will be displayed above the mod queue
  action bar. This allows multiple moderators to work in the queue simultaneously, and
  actions are updated in real time for all mods using the same view." (arXiv 2509.07314
  §5.5.1 documents the problem this solves and calls it a "collision".)

### Senja — status is a right-edge property of the row
"On the right side of each block, you can see if it's approved or unapproved." Status is
positioned as a trailing row property, and the row is a "block" (Senja's own word),
consistent with a media-carrying item. Senja explicitly withholds one field from the list
layer entirely: **consent**. "You can't search or filter testimonials by consent. The
consent info is for your own note, you can click on each testimonial to see if your
customer is giving public/private consent." A legally-loaded field is detail-only,
deliberately.

### Trustpilot — status lives behind an icon, not in the row body
"We update the status of each flagged review as the investigation progresses. Click on the
flag icon below the review for more information." The row carries an affordance; the state
narrative is one click deep. There is also a dedicated cross-item overview
(`Manage reviews > Service reviews > Flagging activity`) for "an overview of all the reports
you've made" — a second surface for the *history* of decisions, separate from the queue of
open ones.

### Meta — the detail view's job is to explain the rule, not just the content
"Tap **See details** for the comment you want to review. The comment details show **the
criteria met for hiding the comment**." And from that same detail view you can act on the
*rule*: "You can also tap **Edit criteria** when viewing the details to change the criteria
that hid the comment."

### Hive — the item carries its own pending verdict
The post preview's header text changes to "Reviewed as Delete Post" once ticked. The item
displays the decision you have staged for it, in its own header, before commit.

---

## 3. AUTOMATED SIGNAL DISPLAY — the crux

### 3a. Raw number, bucketed band, or label only?

**No consumer-facing moderation UI in this corpus shows a raw confidence number.**
Raw 0–1 scores appear only in *API payloads* consumed by developers. The moment a signal
crosses into an operator UI, it is bucketed or named.

| Product | What the operator sees | What the API carries |
|---|---|---|
| Twitch | Category name in the queue; per-category strength as a **count of shield glyphs, 0–4** | `automod.message.update` carries `"level": 5, "category": "aggressive"` — an integer band, never a float |
| Reddit harassment filter | A named alert: "**Potential harassment**" | not exposed |
| Reddit reputation filter | "information about the redditor" — behaviour context, not a score | Contributor Quality Score is referenced by name but the value is not surfaced as a number in-queue |
| YouTube | Tab membership only (**Held for review**), no per-item score. The pending **count was deliberately deleted**: "We've removed the numerical counter to take away the stress of knowing how many held comments are sitting in the queue." | n/a |
| Checkstep | `confidence: "check" \| "trust"` — a **two-value band derived from thresholds**, plus a separate `severity` | the underlying strategy score is `[0.0, 1.0]` but is *not* what the decision payload carries |
| Hive | thresholds configured as score **ranges** (e.g. "a score range of 0.6 to 1.0"); the raw score is visible in dashboard/API responses | full class scores |
| OpenAI | n/a (API only) | `flagged` bool, `categories` bool map, `category_scores` floats |
| AWS Rekognition | Console shows labels above `MinConfidence`; confidence is 0–**100**, not 0–1, and defaults to hiding anything under 50 | `ModerationLabel` array with confidence |

Checkstep is the single most transferable finding here. Its glossary defines a **two-knob
threshold model** that *generates* the band:

> **Lower Threshold**: anything equal or greater than the Lower Threshold and below the
> Higher Threshold will be sent for moderator review
> **Higher Threshold**: anything equal or greater than the Higher Threshold will be actioned
> automatically

And the webhook then carries only which side of that pair the item fell on
(`"confidence": "check"` vs `"confidence": "trust"`). The number is an implementation
detail of the configured policy; the operator sees a band with an operational meaning.

Twitch's shield glyphs are the second most transferable: a **countable, non-numeric
intensity indicator**. "You can see how strictly AutoMod will filter based on how many
shields are displayed in each moderation category, from zero (no moderation) to four (a lot
of moderation)."

### 3b. Per-category scores

Two strategies, and both refuse a full score table in the UI.

**Show only the categories that fired, named.** Twitch's queue "displays the associated
content category so as to inform the streamer for AutoMod's reasoning behind moderation"
(arXiv 2506.07667, §A.2). Twitch's five categories are named for humans, not for models:
Discrimination and Slurs, Sexual Content, Harassment, Profanity, Smart Detection — and each
gets a one-line plain-English definition in the help table (e.g. Profanity = "Expletives,
curse words, and vulgarity. This filter especially helps those who wish to keep their
community family-friendly."). The Twitch event payload carries exactly one `category`
string, not a vector.

**Collapse categories into named policies with an independent severity.** Checkstep does
not expose model categories at all; it exposes *policies* the operator authored — "Policies
reflect your Trust and Safety guidelines for your community. They are described by a title,
a description and a set of rules over the strategy evaluations." Each policy gets a
severity from a fixed 5-value ladder with usage guidance attached:

> `info` – informational kind of violations. `low` – violations that may not require
> moderation. `medium` – vast majority of violations. `high` – violations that might
> require a dedicated queue. `critical` – violations that require immediate review and
> action. Default is `medium`.

That severity ladder is doing the work a score cannot: it says *what to do*, not *how sure
the model is*. Note "high – violations that might require a dedicated queue": severity is
also a routing input.

Checkstep additionally carries `field_violations` — which *field* of a multi-field artifact
violated which policy. For a testimonial with a quote, an author name, a photo and a video,
that is the right granularity.

AWS Rekognition offers the third approach: a **two-level label hierarchy**, so the UI can
show the general and drill to the specific. "Amazon Rekognition might return 'Explicit
Nudity' with a high confidence score as a top-level label. However, if it's necessary, you
can use the confidence score of a second-level label (such as 'Graphic Male Nudity') to
obtain more granular filtering."

### 3c. Naming the reason in human language

The best examples convert a model output into a sentence about the *content or the author*,
never about the model.

**Meta Moderation Assist** is the strongest specimen. Every criterion is a legible fact:

> Hide comments if the person commenting: Doesn't have a profile picture · Doesn't have any
> friends or followers · Has a Facebook account less than 1 week old · Has had at least 3
> comments reported, deleted or hidden by an admin in the past 30 days · May be using a fake
> identity
> Hide comments if they have: A link · A link to a specific site · An image · A video ·
> Custom keywords · Profanity

Two of those are certainly ML-backed ("May be using a fake identity", profanity detection)
and are still phrased as claims about the author or the text. And the detail view "show[s]
the criteria met for hiding the comment" — the reason *is* the criterion name.

**Reddit** ships a filter powered by an LLM and never says so in the queue. The help page
says the filter "is powered by a Large Language Model (LLM) that's trained on moderator
actions and content removed by Reddit's internal tools and enforcement teams," but the
in-queue artefact is a "*Potential harassment*" alert. Note the hedge word: *Potential*.

**Reddit Automations** goes one step further and quotes the evidence back. The
`[caught_key_phrases]` variable "allows you to display… what phrase they inputted that was
caught by your rule. This is great in instances where you want users to know exactly where
the issue was."

**Trustpilot** shows what a reason taxonomy looks like when it must survive legal scrutiny:
five top-level reasons, sub-reasons under two of them, and — unusually — an explicit
negative clause under each. "We won't remove a review just because you dislike or disagree
with it, it criticizes your business, or includes swear words." "We won't remove a review
just because it mentions another business or compares your business to a competitor." Each
reason is defined by both what it catches and what it does not.

### 3d. Making clear the human decision overrides the machine

This is asserted at four different levels across the corpus.

**In the vendor's own prose.** OpenAI: "Treat moderation scores as signals for your
application's policy, not as an automatic blocking decision." YouTube: "Since these
settings use AI to detect comments that should be held, they may not always get it right.
Channel owners can choose to either ignore, remove, or approve the comments that appear on
their videos."

**In the tool's scope of power.** Twitch, emphasised in bold in its own help page:
"**AutoMod does not timeout, ban, or mute users from any channel**; it merely withholds
comments that fall within the streamer's chosen moderation settings to be either approved
or denied by the streamer's moderators." The machine's maximum authority is *withhold*.
Hive says the same about its own routing: "**At this point, no enforcement (e.g., deleting
the post) has happened**. Instead, Moderation Dashboard should route the image to the Post
Review Feed for a final decision by a moderator."

**In the vocabulary of the decision itself.** Checkstep's `decision` webhook enumerates
`act`, `dismiss`, `escalate`, `overturn`, `uphold`. Two of those five verbs exist purely to
name a human ruling *on a prior decision*. And the payload records who: "**moderator**
(*optional*) | Object containing moderator details if the decision was triggered manually"
plus `"triggers": [{"type": "manual"}]`. The same event shape carries both bot and human
decisions and is distinguishable by the presence of a moderator.

**In an explicit feedback control on the flagged item.** Reddit's harassment filter puts a
"*Did we get this right?*" section on the flagged item: "You also have the option to confirm
whether or not the content was accurately detected as harassment… Providing feedback on
flagged content helps improve the harassment filter accuracy over time." Twitch closes the
same loop through the decision itself — deny offers to add the term to Blocked Terms, allow
offers to add it to Permitted Terms: "When you allow a word or phrase held by AutoMod in
the AutoMod Queue within Mod View, you'll have the option to add the flagged term to your
Permitted Terms list." Crucially Twitch makes this opt-in, not automatic: "This gives you
full control over which terms are blocked on your channel by ensuring that terms are only
added when you explicitly choose to add them."

### 3e. Running, failed, skipped/suppressed

This is the thinnest area in public documentation, and the honest answer is that most
products hide it. Four concrete data points:

**Failed — model a failure as a distinct type, not as a zero score.** OpenAI is explicit:
"Check the moderation result type before you read scores if your application needs to
handle moderation failures. If a moderation step can't complete, the corresponding input or
output moderation field can contain an error instead of moderation scores." Their sample
code branches on `if input_moderation.type == "error": raise`. A failed check is a *third
state*, not `flagged: false`.

**Running / not-yet-evaluated — give it a named status with a plain-English gloss.** Google
Business Profile enumerates exactly three report statuses and glosses each one:
- "**Decision pending:** The review is flagged, but it hasn't been evaluated yet."
- "**Report reviewed – no policy violation:** The review was evaluated and no policy
  violation was found."
- "**Escalated – check your email for updates:** The appeal has been escalated and you'll
  get an email about the final decision."

Trustpilot does the same with an in-row status chip; the help page's own screenshot is
captioned "Review status: investigating".

**Skipped — say the category was not applicable rather than scoring it 0.** OpenAI ships a
dedicated field for this: `category_applied_input_types` "Contains the input types that the
category score applies to." And it warns about the alternative reading: "If you send only
images (without accompanying text) to the `omni-moderation-latest` model, it will return a
score of 0 for these unsupported categories." A 0 that means "not checked" is a trap the
API documents and works around with a separate field.

**Suppressed — name the suppressing rule, and make the bypass visible.** YouTube: approved
users' comments "are automatically published and won't be filtered for blocked links,
blocked words, or potentially inappropriate content." Reddit reputation filter: "Will the
filter affect approved users? No, anyone you've added as an approved user will not be caught
by this filter." Twitch permitted terms exist precisely to suppress a known false positive:
"if AutoMod catches an innocuous phrase as a false positive, you can add this phrase to
your permitted terms so that it is not caught again."

**One drift warning worth surfacing in the UI.** OpenAI: "We plan to continuously upgrade
the moderation endpoint's underlying model. Therefore, custom policies that rely on
`category_scores` may need recalibration over time." Any threshold an owner sets against a
provider score has a shelf life.

---

## 4. DECISION AFFORDANCES

### The action sets, as actually shipped

| Product | Primary (always visible) | Secondary (nested) |
|---|---|---|
| Reddit (card view) | **Approve** (blue button by default), **Remove** | Everything else under the mod-shield icon "to the right of the *Approve* and *Remove* buttons": Spam, Ignore reports and Approve, Mark NSFW, Mark Spoiler, Adjust crowd control. Plus Flair, Add to highlights, Lock Comments, Copy Link where applicable |
| Twitch | **Allow**, **Deny** | after Deny: warn / timeout / ban / report the user; add term to Blocked Terms |
| YouTube | approve / remove / ignore ("Channel owners can choose to either ignore, remove, or approve") | — |
| Senja | **Approve** / un-approve on the bottom popup toolbar | per-item: Edit, Trim, Duplicate, Delete, Tag, Share |
| Hive | tick-to-stage, then **Submit Review** | custom actions authored per-platform (Delete Post, ban user…) |

Reddit's two-tier layout is a deliberate, documented ergonomics choice: exactly two buttons
at the top level, everything destructive-or-unusual one level down behind an icon. `Spam` is
in the nested tier, not next to Remove.

Reddit also distinguishes **Remove from Spam by consequence, not by severity**: "**Spam:**
This action removes the item and marks it as spam. The spam filter, in turn, will take
notice of this and slowly try to learn from spammed items." Spam is the action that *trains*.

And `Ignore reports and Approve` exists as its own verb because approve-once is not always
enough: "This action prevents a particular piece of content from ending up in your
moderation queue over and over again." That is a distinct state — reviewed *and* immunised.

### Keyboard shortcuts
Reddit ships them **opt-in behind a menu toggle**: "open the mod queue, click the menu at
the top right and Enable mod keyboard shortcuts." (The specific bindings are published only
as an image, so I cannot quote the key map.) Making destructive shortcuts opt-in rather than
always-live is itself the safety design.

### Bulk selection
Reddit documents three selection mechanisms and one placement rule:
> Check the box directly next to each item that you'd like to include in a bulk action.
> Check the main bulk action checkbox to select all items.
> Use the drop down menu to select all posts that meet certain predefined criteria.
> Once you have selected the posts and comments you'd like to take bulk actions on, you'll
> see your content management tools **available above the queue**.

Senja does the same thing with the toolbar **below**: "Click **Approve** on the bottom popup
toolbar." Both converge on a contextual bar that appears on selection; they disagree only on
edge. Senja's documented flow is also the right default sequence: *filter to a status, then
select-all, then act* — bulk-approve is scoped by the filter, never global.

Google caps bulk appeal explicitly: "You can select up to 10 reviews."

### Preventing accidental irreversible action
Six distinct mechanisms, in rough order of how cheap they are to ship:

1. **Make the destructive action reversible by design.** Reddit: "They aren't deleted from
   the community, they go into this folder instead so you can still access them if needed."
   Trustpilot: "We don't delete reviews, so if a reviewer comes back to us at a later date
   and sends documentation or updates their review, it could be reinstated."
2. **Undo on the item, in the place you see the consequence.** Meta: "To allow a hidden
   comment to show on your Page, tap **Undo** when reviewing the details or from the list of
   comments."
3. **Warn where reversal genuinely is impossible, at the point of action.** Senja: "Video
   edits can't be undone. Contact Support immediately if you make a mistake while editing."
   Trustpilot: "Once a review has been flagged and the information submitted, **it can't be
   edited or deleted**… We therefore recommend that you flag reviews correctly in the first
   instance."
4. **Warn about the dangerous action in the *low-risk-looking* queue.** Reddit on the Removed
   tab: "Be careful not to accidentally approve content in this queue unless you're very
   certain it was removed in error." The trap in a queue of already-removed items is
   *approve*, not remove — and they call it out.
5. **Stage, then commit.** Hive's tick → "Reviewed as Delete Post" → Submit Review.
6. **Hide the button once the outcome is settled, for everyone.** Reddit card view: the
   Approve button "will disappear for you (and for any other moderators working in the queue
   using the same view) if the *approve* action is taken." The affordance is removed rather
   than left to error.

Reddit adds a seventh that is really a workflow feature: on Remove, "A removal reason button
will then appear on the mod action queue bar" — the reason is captured *after* the removal
lands, so the destructive step is never blocked behind a form, but the reason is still
prompted for.

### Approved vs published — where products separate them

The separation is real in every product that has any public surface, and it is always the
*same* separation: **the review decision and the visibility state are two axes.**

- **Trustpilot** is the clearest. A flagged review normally *stays visible* while under
  review; only one reason class hides it: "Only reviews flagged as 'harmful or illegal' are
  hidden during the investigation process." Decision state (`investigating`) and publish
  state (`online`) move independently, and severity is what couples them.
- **Reddit** keeps an internal reviewed-marker distinct from public visibility. The green
  tick is "only visible to moderators of your community and lets the rest of your mod team
  know that that content has been reviewed" — a review fact with no publish consequence.
- **Meta** scopes visibility rather than toggling it: "**Note:** The commenter and their
  friends can still see a comment if Moderation Assist hides it." Hidden is a
  *per-audience* projection, not a boolean.
- **Senja** separates approval from *usability in downstream surfaces*, which is the closest
  analogue to our publish lifecycle. Approved: "Can be seen in all accounts · Can be seen in
  the Chrome Extension · **Can be used in the Studio** · Can be shared with a link."
  Unapproved: "Can be seen in your account · **Cannot be used in the Studio** · Can be
  shared with the share link." Note that share-by-link works in *both* states — one
  distribution channel ignores approval entirely. And Senja's own wording separates the two
  verbs when describing automation: auto-approval "will automatically **publish** 4-5 star
  video reviews to your widget."
- **Hive** separates them structurally: the moderator's decision is recorded in the Review
  Feed and the Actions Log, and enforcement happens when "Moderation Dashboard sent a
  callback to the URL we set up for our 'Delete Post' action." Decision and enforcement are
  separated by a network boundary.
- **Checkstep** likewise: the `decision` webhook tells your platform what was decided; your
  platform enforces. Its docs even warn against conflating the two, telling integrators the
  violation detail in the webhook is for "**immediate feedback**" only — "Do not enforce a
  sub-part of content based on these properties. Prefer the transparency portal or the
  statement of reason endpoint… as it will get updated with the latest available information
  and status."

---

## 5. AUTO-MODERATION CONFIGURATION — owner-facing, without raw ML knobs

### The three configuration shapes, from simplest to richest

**(a) One named strictness ladder — YouTube.**
A single dropdown, four options, all in plain language:
> **None:** Don't hold any comments. **Basic:** Hold potentially inappropriate comments.
> **Strict:** Hold a broader range of potentially inappropriate comments. **Hold all:** Hold
> all comments.

Note what "Strict" is defined by: **volume**, not confidence. "If you want a higher level of
protection for your channel, selecting **Strict** comment moderation will increase the
number of comments held." Basic's catch list is enumerated in human terms — comments that
"may be spam, self-promotion, gibberish, or potentially inappropriate." Alongside the ladder
sit three list-shaped controls: **Blocked words**, **Approved users**, and a
**Blocked comments with links** toggle.

**(b) A ladder plus per-category override — Twitch.**
"Drag the slider bar to choose the setting most appropriate for you, from **Level 0** (no
filtering) to **Level 4** (the strongest setting). To tailor AutoMod to your own custom
settings, you can use the drop down menus to update each moderation category individually."
So: one global slider, five per-category dropdowns underneath, and shield-count feedback per
category. The level table explains each level in terms of category coverage
("Level 2: Some filtering on discrimination, sexual content, and Smart Detection, more
filtering on harassment"), never in terms of thresholds.

**(c) Named toggles with a two-option strength — Reddit Safety Filters.**
Reddit's family is a list of independently-toggleable, human-named filters: Ban evasion,
Reputation, Adult content promoters, Harassment, Mature content. Each one's description
tells the owner what it catches, e.g. Harassment "lets moderators automatically filter
comments that are likely to be considered harassing"; Reputation filters "content by
redditors who may be potential spammers, are likely to have content removed, or have
unestablished accounts."

Then the strength control is **two named options with the accuracy trade-off spelled out**:
> The **moderate** filtering option filters the least content, but it will be the most
> accurate when it comes to identifying and filtering content.
> The **high** filtering option filters the most content, though it may catch more false
> positives when filtering

That is the single best piece of copy in this research. It replaces a threshold slider with
a stated trade-off, and it names false positives out loud. Reddit even frames the reputation
filter's version as being about confidence explicitly — "For confidence of the filter
targeting, you can choose between two thresholds" — while still exposing only two words.

Reddit also gives guidance on *which to pick*: "if you regularly see a significant amount of
harassing content posted in your community, the 'high' option might be the best option to
use."

### Blocked terms — the consistent feature set
Across Twitch, YouTube, Discord, Meta and Reddit the term-list features converge:
- **Wildcards / partial matching.** Twitch: `hate*` also catches "haters" and "hateful";
  also usable for URL variants (`someurl.com*`). Reddit allow list: "Use an asterisk (*)
  before, after, or on both sides of a word." Discord's API documents `keyword_filter`
  entries like `["cat*", "*dog", "*ana*", "i like c++"]` plus a separate `regex_patterns`.
- **Multi-word terms are AND-matched as a phrase.** Twitch: adding "hi there" "will not
  block messages containing only 'hi' or 'there' but will block messages containing 'hi
  there'." Discord: "When you add a term consisting of multiple words to a rule, only
  messages that contain the exact term will be blocked."
- **Evasion normalisation, stated as a promise.** Meta: "if you add tree as a keyword,
  Moderation Assist hides comments with TREE, t.r.e.e., tr33, treee and #tree." Twitch:
  "AutoMod detects misspellings and evasive language automatically."
- **Per-term hit counts.** Twitch: "In the 'Occurrences' column, you can see the number of
  times that each term has successfully blocked a chat message from appearing in your
  channel." (With an honest data-start caveat: "Only occurrences after 5/25/2024 will be
  counted.")
- **Per-term visibility scoping.** Twitch lets a term be Public or Private, and private
  terms change *who sees the held item*: "those messages will be held from chat as well, but
  will only be surfaced to the channel owner for their visibility. Moderators will not see
  when a message was attempted using a private blocked term."
- **A cap, where the list is a safety valve rather than a policy.** Reddit's harassment
  allow list is capped: "you have the option to input up to 15 specific keywords in the allow
  list." Twitch's blocklist is deliberately uncapped: "The number of terms you can filter is
  in the tens of thousands."

### Auto-approve trusted sources
- **YouTube "Approved users"**: "Comments from these users are automatically published and
  won't be filtered for blocked links, blocked words, or potentially inappropriate content."
  A single allowlist that bypasses *every* check.
- **Reddit approved users** bypass the reputation filter entirely (FAQ, quoted above).
- **Discord** scopes exemption two ways rather than one: `exempt_roles` and
  `exempt_channels`, with a documented cascade — "setting a channel to be exempt will ensure
  that any messages in Threads and Text Chat in Voice in that particular channel will also
  be exempt."
- **Senja** auto-approves **per collection form**, not globally: "Go to your **Forms** page →
  **Edit** your form → **Settings** tab → Enable the **Approve testimonials**" toggle. And
  it adds a *quality gate* rather than a pure trust gate: "This will automatically publish
  4-5 star video reviews to your widget." Auto-approve is scoped by source and conditioned on
  a rating. Senja extends the same idea to the other ingestion path: "You can also enable
  auto-approval during imports to publish testimonials without manual review."

### The action model — separate "what was detected" from "what to do"
Discord is the cleanest: every rule chooses one or more of three actions —
`BLOCK_MESSAGE` ("blocks a member's message and prevents it from being posted. A custom
explanation can be specified and shown to members whenever their message is blocked"),
`SEND_ALERT_MESSAGE` (with a `channel_id`), `TIMEOUT` (with `duration_seconds`, max 4 weeks).
`TIMEOUT` is restricted by trigger type: "A `TIMEOUT` action can only be set up for
`KEYWORD` and `MENTION_SPAM` rules." So the escalating action is only available where the
signal is deterministic enough to justify it.

Reddit Automations uses **Trigger → Condition → Action** and — importantly — offers four
*intent-named* starting templates rather than a blank rule builder:
> **Educate users while they're posting** · **Flag content for review** – "Use this to
> automatically send posts or comments to the mod queue if they meet certain conditions.
> This allows you to review the content before they appear in your community." ·
> **Redirect content somewhere else** · **Keep discussion on-topic**

Reddit also publishes deterministic conflict resolution, which any multi-rule system needs:
"**Block** rules are displayed first and take precedence over **Report** and **Inform**
rules… After the above, the order of the rules on the page determine the vertical precedence
of the message." Plus two Reddit-authored default rules the owner may disable: "Caution users
around using link shorteners" and "Remind users when they may be sharing personally
identifiable information (PII). Mods have the option to disable these configurations."

### Dry-run before commit
Three independent implementations, which makes this table stakes rather than a nice-to-have:
- **Reddit harassment filter**: "You can use the *Test this filter* comment box within the
  harassment filter setting to see how the filter works. You can input text and - depending
  on the setting chosen - it will flag whether the text would be captured by the filter."
  With one honest caveat published: "Allow listed words do not impact the *Test this filter*
  box."
- **Reddit Automations Live Previewer**: two placements — "Rule list page: Test all the rules
  you've created. Rule creation page: Test the rule you're creating in real-time."
- **Twitch**: `Check AutoMod Status` returns a pure boolean per candidate message —
  `{"msg_id": "1", "is_permitted": false}` — and the docs note it "also tests whether the
  channel's blocked terms would prevent the message from being posted." A dry-run that
  covers *both* the model and the term list.

### Provider failure
Public docs are near-silent on operator-facing provider failure. What exists:
- OpenAI's error-instead-of-scores contract (§3e above) is the only explicit failure
  semantics in the corpus.
- Everyone else **fails toward the human queue rather than toward publish**. Hive's default
  posture is that unmatched content simply is not actioned ("Since *animated_gun* isn't
  captured by default settings, we'll need to set up a custom condition in order for *any
  action* to be taken on these images"), and its lower-confidence band routes to humans by
  default ("review ranges of 0.7 to 0.9 for *gun_in_hand* and *gun_not_in_hand* as active by
  default").
- The best operational advice, published by a third-party guide rather than Discord itself
  (valt.gg AutoMod setup guide, corroborated by Discord's own action model): "**Start with
  alerts before blocking.** When you create a new rule, set it to 'Send Alert' only for a
  few days. Watch the alerts channel to see what gets flagged." — i.e. a shadow-mode phase
  as an owner-facing recommendation. Discord's own docs support this by making
  alert-without-block a valid single-action configuration.
- Meta's rule scope is bounded in time to prevent retroactive surprise: "Moderation Assist
  only hides comments made after you create the criteria."

### Volume framing, for setting owner expectations
AWS frames the whole point of automated moderation as a volume reduction with a number
attached: "By using Rekognition for image and video moderation, human moderators can review
a much smaller set of content, typically 1-5% of the total volume, already flagged by machine
learning." AWS A2I also supports **random sampling of auto-approved items** for QA —
"Randomly send a sample of images to humans for review" via `RandomSamplingPercentage`
(their example: "5% of Amazon Rekognition inferences of the Graphic Male Nudity moderation
label with a confidence greater than 50 are sent workers for review"). Hive offers the same
QA posture for its bot moderator: "Review a portion of its decisions for quality assurance."

---

## 6. EMPTY + STEADY STATE

This is the least documented area and I will not pad it. What is verifiable:

**Empty-because-nothing vs empty-because-filtered are different components.** Shopify
Polaris ships `EmptyState` and scopes it tightly: "Empty states are used when a list, table,
or chart has no items or data to show… **The empty state component is intended for use when a
full page in the admin is empty, and not for individual elements or areas in the
interface.**" Its `ResourceList` carries a separate `noSearchResults` slot for the filtered
case, and a Polaris maintainer states the distinction directly in
`Shopify/polaris-react#1704`: "we typically encourage using an `<EmptyState />` component for
a true empty state (as opposed to empty results)." Polaris's empty-state content rules also
forbid the shrug: empty states should "Be encouraging and never make merchants feel
unsuccessful or guilty because they haven't used a product or feature," titles should "Be
action-oriented" (do: "Create orders and send invoices"; don't: "Orders and invoices"), and
there should be "only one primary call-to-action button."

**A pending queue that is empty most of the time should not advertise its own count.**
YouTube deleted the counter and published the reason: "**The unpublished comment counter has
been removed**: We've removed the numerical counter to take away the stress of knowing how
many held comments are sitting in the queue. You can choose to review them or not!" And they
decoupled queue neglect from consequences: "Keep in mind, your video's performance or ability
to be recommended will not be directly impacted regardless of whether or not you review or
publish 'held for review' comments." A healthy-state queue should not imply guilt.

**Items should expire out of the queue rather than accumulate.** YouTube: "**Held comments
expire after 60 days**: Old, unpublished comments will no longer hang around forever, filling
up your 'Held for review' queue with spam or negativity. Comments older than 60 days will
automatically be removed." The expiry window is documented in three separate places in their
help center, so it is a load-bearing product promise. (The public reply thread also records
the cost: several creators objected that 60 days is too short because held items included
false positives — "more than once they were held either because they contained a link (but
not spam / ads), or erroneously marked as spam for no reason.")

**Zero-pending is not zero-information — put the aggregate somewhere else.** Three products
give the steady state a job:
- **Meta**: an Activity Log with **Insights** — "Your moderation **insights** include the
  comments that have been hidden and the criteria met to hide them" — filterable "by date
  range, moderation activity type or Moderation Assist criteria." When nothing is pending,
  the interesting question is *what the rules did on their own*, sliced by rule.
- **Twitch**: the per-term **Occurrences** column. The steady state of a term list is a
  ranked list of what each term actually caught.
- **Hive**: "All activity on Moderation Dashboard is logged. Leverage our comprehensive
  analytics tools to gain valuable moderation insights, or use our moderation logs in the
  process of helping your company achieve Digital Service Act (DSA) compliance." Plus an
  Actions Log showing "the rule and corresponding action."
- **Trustpilot**: the separate "Flagging activity" page giving "an overview of all the reports
  you've made," and Transparent Flagging, which turns the owner's own moderation history into
  a public artifact: it "gives people an overview of all your flagging activities, including
  the star ratings of reviews you've flagged."

**Reddit's own idle-state framing** comes from the survey rather than the docs, and it is a
warning: mods skip the modqueue when their community "received too few reports to justify
relying on it," and some use it as an ambient signal instead — the paper titles §5.2.3 "The
Modqueue as an Activity Radar or Moderation Hub." A low-volume queue survives by being a
useful *place*, not by being a task list.

---

## Transferable rules

1. **Ship a list, not a wizard.** Default to a scannable list with inline actions; reach
   one-at-a-time by opening a row into an action-capable side panel. Every product surveyed
   did this; none shipped a forced decide-and-advance flow. (Reddit, Senja, YouTube, Hive)
2. **Never auto-advance or auto-dismiss on the first action.** The item must survive its own
   first decision so a second action (reject → also archive, approve → also tag) is possible.
   This is the single loudest complaint in the Reddit moderator survey (P006, P105). Prefer
   Hive's stage-then-`Submit Review` model, or at minimum keep the row visible with its new
   state stamped on it.
3. **Split the pending queue into named tabs with a stated reason to exist, and merge rather
   than multiply.** `Needs review` / `Reported` / `Rejected` / `Archived` beats one filtered
   stream — but YouTube's collapse of "Likely spam" into "Held for review" shows the ceiling.
   If a tab exists, it needs a one-line justification the owner can read.
4. **Sort low-trust machine verdicts to the end of the queue, never to the front.** YouTube
   appended the merged "Likely spam" items to the end of the unified tab. Reddit mods
   explicitly wanted human reports before Automod ones (P010: *"Humans are always a priority
   over machines"*) and complained that they could not get it.
5. **Never show a raw 0–1 score in the operator UI. Show a band derived from the owner's own
   thresholds.** Adopt Checkstep's two-knob model literally: a lower threshold above which an
   item is *sent for review*, a higher threshold above which it is *actioned automatically*.
   The UI then only ever needs to say which side of that pair the item fell on. Keep the float
   in the API payload and the detail-view "technical details" disclosure, nowhere else.
6. **Show only the categories that fired, named for humans, with a one-line definition.** Do
   not render a 13-row score table. Twitch surfaces one `category` string and defines each
   category in prose; Checkstep replaces model categories with owner-authored *policies* that
   have a title and a description.
7. **Carry severity as a second, independent axis from confidence, on a fixed named ladder
   with usage guidance.** Checkstep's `info / low / medium / high / critical` — each with a
   sentence about what to do — does the routing work a confidence number cannot. Severity, not
   score, should decide whether a pending item is hidden from the public while it waits
   (Trustpilot hides only "harmful or illegal").
8. **Hedge the machine's language and name the reason as a claim about the content or the
   author.** "Potential harassment", not "toxicity 0.87". "Account created 3 days ago", not
   "trust score low". Meta's criteria list is the model: every ML-backed signal is phrased as
   a legible fact ("May be using a fake identity").
9. **Quote the triggering evidence.** Reddit's `[caught_key_phrases]` shows the exact phrase a
   rule caught. For a testimonial, highlight the matched span in the quote rather than only
   naming the category.
10. **State the machine's authority ceiling in the UI, in the product's own voice.** Twitch
    bolds "AutoMod does not timeout, ban, or mute users"; Hive says "no enforcement has
    happened"; OpenAI says scores are "signals… not an automatic blocking decision". One line
    near the signal block, not buried in docs.
11. **Give the human decision its own override vocabulary and record who made it.** Adopt
    Checkstep's `uphold` / `overturn` alongside approve/reject, distinguish
    `triggers: [{type: "manual"}]` from automated decisions, and attach the moderator. Reddit's
    hover-the-tick-to-see-who-approved-and-when is the cheap UI form of this.
12. **Put a one-tap accuracy feedback control on every machine-flagged item.** Reddit's "Did we
    get this right?"; Twitch's deny→add-blocked-term / allow→add-permitted-term. Make it
    opt-in, per Twitch: "terms are only added when you explicitly choose to add them."
13. **Model three non-verdict states explicitly — running, failed, skipped — and never encode
    them as a score of 0.** OpenAI ships an error type instead of scores, and a separate
    `category_applied_input_types` field precisely because a 0 could mean "not checked". Give
    each a named status with a plain-English gloss, per Google's "Decision pending: The review
    is flagged, but it hasn't been evaluated yet."
14. **Name the suppressing rule when a check was bypassed.** "Skipped — sender is an approved
    source" / "Skipped — term on your allow list" beats a blank signal block. YouTube, Reddit
    and Twitch all define bypass lists that silently skip checks; say so on the item.
15. **Fail toward the review queue, never toward publish.** If the provider errors or times
    out, the item stays `PENDING` with a visible "check didn't complete — decide manually"
    state and a retry. No product in this corpus lets a failed check auto-approve.
16. **Two primary buttons maximum; everything else nested one level down.** Reddit's card view
    ships exactly Approve + Remove at top level, with Spam, Ignore-reports-and-approve, and all
    marking actions behind a single icon to their right.
17. **Make `spam` the action that trains, and distinguish it from `reject`.** Reddit: "The spam
    filter, in turn, will take notice of this and slowly try to learn from spammed items." Our
    `SPAM` status should feed the auto-moderation config (suggest a blocked term), while
    `REJECTED` should not.
18. **Add an approve-and-stop-asking action.** Reddit's `Ignore reports and Approve` "prevents
    a particular piece of content from ending up in your moderation queue over and over
    again." Reviewed-and-immunised is a distinct state from reviewed.
19. **Bulk actions: contextual toolbar on selection, three selection modes, and scope bulk by
    the active filter.** Checkbox-per-row + select-all + select-by-criteria (Reddit); toolbar
    appears above (Reddit) or below (Senja) the list on selection; document the flow as
    *filter first, then select all, then act* (Senja). Cap destructive bulk selection (Google
    caps appeals at 10).
20. **Make reject reversible by construction, then you need no confirm dialog.** Rejected items
    go to a `Rejected` tab, not to deletion (Reddit's Removed queue; Trustpilot's "We don't
    delete reviews"). Reserve modal confirmation for the genuinely irreversible (Senja's
    un-undoable video edits) and put an `Undo` on the item where the consequence is visible
    (Meta).
21. **Warn about the dangerous action that is specific to each tab.** In a `Rejected` tab the
    risky button is *approve*, not reject. Reddit says this out loud: "Be careful not to
    accidentally approve content in this queue unless you're very certain it was removed in
    error."
22. **Prompt for a reason after the action lands, not before.** Reddit's removal-reason button
    appears on the action bar *after* Remove, so the decision is never blocked behind a form
    but the reason is still captured.
23. **Keep destructive keyboard shortcuts opt-in behind a setting.** Reddit requires "Enable
    mod keyboard shortcuts" from the queue menu before any of them fire.
24. **Show a reviewed-marker that is internal-only and attributable.** Reddit's mod-only green
    tick with hover attribution proves an item was seen without changing what the public sees —
    exactly the `APPROVED`-but-not-yet-`published` case.
25. **Treat approved and published as two axes and never collapse them.** Senja's approved /
    unapproved capability matrix (usable in Studio vs not, shareable by link in *both* states)
    is the shape to copy: enumerate, per state, which downstream surfaces may use the artifact.
26. **Scope visibility per audience rather than as a boolean.** Meta: a hidden comment is still
    visible to its author and their friends. A rejected testimonial should remain visible to
    its submitter's own link, not vanish.
27. **Auto-moderation config = one named strictness ladder, in words, defined by volume.**
    YouTube's `None / Basic / Strict / Hold all` and Twitch's `Level 0–4`. Define each option by
    how much it holds, not by a threshold.
28. **Where a strength control is unavoidable, use two named options and print the trade-off.**
    Reddit verbatim: moderate "filters the least content, but it will be the most accurate";
    high "filters the most content, though it may catch more false positives". Then say which to
    pick and when.
29. **Use a countable non-numeric intensity glyph for per-category strength.** Twitch's 0–4
    shields per category. Reads at a glance, sets no false precision.
30. **Ship blocked/allowed term lists with the now-standard feature set:** wildcard/partial
    matching, multi-word phrases AND-matched, documented evasion normalisation (state the
    variants you catch), and a per-term hit count with an honest "counting since" date.
31. **Scope auto-approve to a source and condition it on a quality signal, not globally.**
    Senja's per-form `Approve testimonials` toggle, gated on 4–5 stars. Per-form and per-import
    auto-approve maps directly onto our ingestion paths.
32. **Provide two exemption axes, not one.** Discord's `exempt_roles` + `exempt_channels`, with
    a documented cascade. For us: trusted submitter/source, and per-form or per-project scope.
33. **Ship a dry-run.** Reddit does it twice (a "Test this filter" box, and a Live Previewer on
    both the rule list and the rule editor); Twitch exposes it as an API returning a plain
    `is_permitted` boolean. Paste sample text, see what the current config would do — and
    publish the caveats about what the preview does *not* account for.
34. **Recommend a shadow-mode ramp for any new rule.** Alert-only first, review the log, then
    enable enforcement. Discord's action model makes alert-without-block a first-class
    configuration; Hive and AWS both support sampling auto-approved decisions for QA.
35. **New rules apply forward only, and say so.** Meta: "Moderation Assist only hides comments
    made after you create the criteria."
36. **Publish deterministic rule precedence.** Reddit: block > report > inform, then top-to-
    bottom list order, and show only the highest-priority hit with an option to expand.
37. **Offer intent-named rule templates instead of a blank builder.** Reddit's four:
    "Flag content for review", "Educate users while they're posting", "Redirect content
    somewhere else", "Keep discussion on-topic".
38. **Give the reason taxonomy a two-level shape and a negative clause per reason.** Trustpilot:
    5 reasons, sub-reasons where needed, one reason per flag, and an explicit "we won't remove a
    review just because…" under each. The negative clause is what stops reason inflation.
39. **Expire pending items on a published window, and decouple queue neglect from
    consequences.** YouTube: 60 days, plus "your video's performance… will not be directly
    impacted regardless of whether or not you review" — but note their own users' objection that
    expiry silently discards false positives, so surface an "expiring soon" affordance.
40. **Do not badge the pending count as a nag.** YouTube deleted the counter on purpose. Show
    the count where it is actionable (the tab), not as a persistent global badge.
41. **Empty state and filtered-empty are two different components with two different copy
    decks.** Polaris scopes `EmptyState` to a genuinely empty page and gives `ResourceList` a
    separate `noSearchResults` slot. Add a third: error/failed-to-load.
42. **Give the zero-pending state a job: show what auto-moderation did without you.** Meta's
    Insights sliced by criteria, Twitch's per-term Occurrences, Hive's Actions Log. "0 pending"
    plus "38 auto-approved and 4 auto-rejected this week, top rule: blocked term 'crypto'" is
    informative; a checkmark and "All caught up" is a shrug.
43. **Keep a decisions/activity log as a first-class sibling surface to the queue.** Trustpilot's
    Flagging activity page, Hive's Actions Log, Meta's Activity Log — filterable by date, action
    type, and *which rule fired*. It is where the steady state lives, and it is the audit trail.
44. **Show that other reviewers are acting, if more than one person can review.** Reddit
    broadcasts "any actions taken and which mod is responsible for them… updated in real time
    for all mods using the same view" specifically to prevent collisions, which the moderator
    survey documents as a recurring failure.
45. **Warn that provider-score-based thresholds drift.** OpenAI: models get upgraded and
    "custom policies that rely on `category_scores` may need recalibration over time." If an
    owner sets a numeric threshold, record which provider/model version it was calibrated
    against.

---

## Anti-patterns observed

- **Auto-dismissing the item on the first action.** Reddit's queue does this and it is the most
  quoted frustration in the moderator survey — it breaks every multi-step decision and makes
  second-guessing expensive (P006, P105; arXiv 2509.07314 §5.5.2).
- **Collapsing distinct reasons into one label.** Reddit shows several different user-selected
  report reasons as a single "spam". P025: *"Spam reports show up as just 'spam'… but they're
  actually several different options… very unhelpful."* Our `flags` array must not become one
  chip.
- **Shipping a sort/filter that does not actually work.** P081: *"I have tried to sort by posts
  that have multiple reports, but that doesn't work very well. I wish I could see
  human-generated reports first, with automod reports later, but that doesn't work. So I
  usually end up just using a sort order that puts the newest posts first."* A broken sort
  pushes people to the default forever.
- **A noisy audit log with duplicate entries per item.** P086: *"There can be up to three
  separate mod log entries for the same content… Having triplicate entries in the mod log makes
  it a royal pain to read the user's history to find out if they're a repeat offender."*
  One artifact should produce one log entry per decision, not one per side effect.
- **Requiring the reviewer to leave the queue for routine context.** arXiv 2509.07314 §5.4 and
  §6.1.3 ("Mods Leave the Modqueue to Gather Context Despite Built-In Features") document that
  Reddit's contextual and user panels still do not cover the common cases — conversation
  context, author-pattern investigation, and prior moderation history.
- **Fragmenting the toolset so core work needs a third-party extension.** §5.5.4: P057 —
  *"The toolbox makes things nice, would be nice to have that all built directly into the site
  and the app."* If our owners need a spreadsheet export to triage, the queue has failed.
- **Rendering a full per-category score table.** No shipped operator UI in this corpus does it.
  OpenAI's own payload is the counter-example of why: thirteen categories, most at `2.3e-7`,
  which is noise presented with false precision.
- **Treating a score of 0 as "clean" when it means "not evaluated".** OpenAI documents this
  exact trap for image-only inputs against text-only categories, and ships
  `category_applied_input_types` to escape it.
- **Letting a machine verdict read as final.** Every vendor that could have done this explicitly
  refused — Twitch bolds that AutoMod cannot ban, Hive states no enforcement has occurred at
  routing time, OpenAI says scores are not a blocking decision.
- **A persistent pending-count badge.** YouTube removed theirs and published the stress
  rationale. A queue that is empty most of the time should not spend that time nagging.
- **Silent expiry of held items.** YouTube's 60-day auto-removal drew sustained public objection
  in its own announcement thread precisely because held items included false positives that
  quietly disappeared.
- **Irreversible destructive actions with no in-flow warning.** Senja's un-undoable video edits
  and Trustpilot's un-editable flag submissions both required a help-center paragraph to
  compensate, which means the UI was not carrying the warning.
- **Blank rule builders.** Both Reddit Automations and Hive lead with named intents or default
  conditions rather than an empty condition editor; Hive's docs even reassure operators that
  "Many of our customers start with only a basic set of core rules."
- **Enabling a block-style rule with no visibility into what it caught.** Discord's own docs make
  `SEND_ALERT_MESSAGE` a separate action from `BLOCK_MESSAGE` for this reason; blocking with no
  alert channel leaves an owner unable to detect false positives at all.
- **Using a generic empty state for filtered-empty results.** Polaris ships two distinct
  mechanisms and its maintainers say so explicitly (`polaris-react#1704`).

---

## Could not verify

Stated plainly rather than inferred:

- **Testimonial.to** — no reachable help center or product docs; all indexed pages are marketing
  and SEO listicles. Its actual moderation screens, statuses and controls are unverified.
- **Trustmary** — `support.trustmary.com` returned no crawlable article pages; `help.trustmary.com`
  is referenced by third parties but I could not retrieve it. Unverified.
- **Famewall** — no primary docs retrieved. Search results were competitor SEO pages only.
  Unverified.
- **G2 / Capterra vendor-side moderation** — no primary documentation retrieved. G2's public
  review pages assert "G2 validates the reviewers identity with our moderation process" but the
  vendor-facing console is undocumented publicly. Unverified.
- **Spectrum Labs** — no current primary product documentation found; treat as unavailable.
- **Cloudflare abuse surfaces** — not investigated within budget; no claims made.
- **Twitch keyboard shortcut map and Reddit's exact key bindings** — Reddit publishes its
  shortcut table only as an image; I confirmed shortcuts exist and are opt-in but cannot quote
  the bindings.
- **Reddit's and YouTube's literal empty-state copy** — the zero-pending screens are not
  reproduced in any help article or changelog I could reach. The empty-state findings in §6 come
  from Polaris (a design system, primary but not a moderation product) plus the YouTube counter
  and expiry decisions, which are documented directly.
- **AWS Rekognition console layout** — I verified the API/SDK semantics (`MinConfidence`,
  confidence 0–100, label hierarchy, A2I activation conditions) from AWS docs. I did not verify
  the console's visual review surface.
- **Trustpilot's fraud-detection page** — the help article returned only a shell (JS-rendered);
  the fraud-detection process is confirmed to exist and be referenced from the flagging flow, but
  its label vocabulary is unverified.
