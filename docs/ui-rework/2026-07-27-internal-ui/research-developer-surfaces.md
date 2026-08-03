# Developer-platform surface research — API keys, credentials, webhooks, activity, jobs, settings

**Date:** 2026-07-27
**Method:** public primary sources only — vendor docs, help-center pages, changelogs, and the
**screenshots embedded in those docs**, which are shipped-product captures. No logged-in browser was
available, so nothing here comes from driving a live dashboard. Where a screenshot is the evidence,
the finding is marked *(screenshot)* and describes what is visibly in the image.

**Products covered:** Stripe, Resend, Clerk, Sentry, Polar, Cloudflare, Supabase, PlanetScale, plus
**Svix** — added because Svix's App Portal is the *actual shipped webhook UI* embedded by both Clerk
and Resend, so it is the primary source for two of the eight targets, not a substitute for them.

**Screenshots inspected directly** (downloaded and read, not inferred):

| Artifact | Source page |
| --- | --- |
| Svix App Portal → Message Logs list | `docs.svix.com/receiving/using-app-portal/filtering-logs` |
| Sentry → Settings → Organization Tokens (list) | `docs.sentry.io/account/auth-tokens` |
| Sentry → Create New Organization Token (form) | `docs.sentry.io/account/auth-tokens` |
| Polar → Webhooks → endpoint detail + Deliveries | `polar.sh/docs/integrate/webhooks/delivery` |
| PlanetScale → New service token (reveal modal) | `planetscale.com/docs/api/service-tokens` |
| Cloudflare → API token created (reveal page) | `developers.cloudflare.com/fundamentals/api/get-started/create-token/` |
| Resend → Logs (list) | `resend.com/docs/dashboard/logs/introduction` |
| Resend → Log detail | `resend.com/docs/dashboard/logs/introduction` |

---

## 1. Secret reveal — showing a credential exactly once

### The four shipped shapes

Four genuinely different containers are in production. They are not interchangeable; each encodes a
different assumption about what the user does next.

**(a) Cloudflare — full page, dashed border, warning as prose, verification command included**
*(screenshot: `dash.cloudflare.com/profile/api-tokens`)*

The reveal is a **page**, not a modal, and the page is composed as:

1. Bold heading naming the token by *its own name*, past tense: **"Edit Zone DNS API token was
   successfully created"**.
2. One line of body prose, no alert styling, no icon, no colour: *"Copy this token to access the
   Cloudflare API. For security this will not be shown again."* followed by an underlined
   **Learn more** link. The warning is a clause inside the instruction, not a banner.
3. The secret in a box with a **1px dashed border** — dashed is doing semantic work here, it reads as
   *transient/ephemeral*, distinct from every solid-bordered input elsewhere in the product.
   Monospace, full value unmasked, small copy icon inside the box at its right edge.
4. A second section, **"Test this token"**, with prose and a solid-filled monospace code block
   containing a ready-to-run `curl` against `/user/tokens/verify` with the real token already
   interpolated, and its own copy button top-right.
5. A hairline rule, then the only exit: an underlined text link **"View all API tokens"**. Not a
   button. Nothing is dismissed; you navigate away.

The left nav on this page is contextual and short — `← My Profile` back affordance, a
`Quick search… ⌘K` field, then exactly three items (Settings / API Tokens / Active sessions).

The docs also state: *"New API tokens use the `cfut_` prefixed scannable format, which allows
credential scanning tools to detect leaked tokens."* The prefix exists for machine leak-detection,
not for human identification.

**(b) PlanetScale — modal, two fields, warning as a pill on the secret's own label line, forward-only**
*(screenshot: `app.planetscale.com`, dark theme)*

- Modal titled **"New service token"**, `X` close top-right.
- One instruction line: *"Please copy the information for your new service token."*
- **Two** labelled read-only fields, because the credential is a pair:
  - **ID** — `u484ogwlui1a`, fully visible, not a secret.
  - **Token** — `pscale_tkn_…`, the secret.
  - Each field is a full-width dark read-only input with a copy-icon button **fused to its right edge
    inside the field border** (segmented, not floating).
- The warning is **not** a banner and **not** page-level. It is a small amber/olive-tinted **pill**
  sitting on the *same line as the "Token" label*, right-aligned: **"Token won't be shown again after
  this step"**. It is scoped to the one field it applies to. The `ID` field, which is not secret, gets
  no warning.
- Footer separated by a hairline holds a **single** left-aligned primary button: **"Continue to token
  permissions"**. No Cancel, no Done. The only way out is forward.

That last point is the real design decision: **PlanetScale reveals the secret *before* scopes are
assigned**, and uses the reveal modal's CTA to push you into the permissions step. Docs confirm the
mechanic — *"The modal will update, displaying your service token where the Name field was"* — the
secret is rendered **in place of** the input that created it, in the same modal, and *"There's no way
to retrieve the token value once you leave this page."*

**(c) Stripe — reveal-once, then immediately ask *where you put it***

Stripe's documented create flow (`docs.stripe.com/keys`) is:

1. Click **Create secret key**.
2. **Step-up auth inside the dialog** — *"enter the verification code that we send you by email or
   text message"*. Creating a secret is re-authenticated, not just permitted.
3. Enter **Key name**, click **Create**.
4. *"Click the key value to copy it."* — the value itself is the copy affordance, there is no separate
   button.
5. *"Save the key value. You can't retrieve it later."*
6. **"In the **Add a note** field, enter the location where you saved the key, then click **Done**."**

Step 6 is the most transferable idea found in the whole survey: the reveal dialog does not just warn
you, it **captures where the secret went** as a first-class, editable field on the credential. That
note then persists on the row and is editable later via *Edit key*.

Stripe also has an **environment asymmetry** worth copying: *"In sandbox mode, you can always see all
of your API keys, including restricted and secret keys."* Reveal-once discipline applies **only to
live mode**. And within live mode there is a second axis — keys **Stripe generated for you** (the
default secret key, or one produced by a scheduled rotation) stay revealable via a **Reveal live key**
/ **Hide live key** toggle on the row; keys **you** created are gone forever: *"If you create a RAK
yourself, you can't reveal it after you've seen it once."*

**(d) Sentry — visible once, and only the *last* characters survive**

*"For security reasons, organization tokens are only visible once, right after you create them. If you
lose the auth token, you will have to create a new one. This means you can't see the full token on the
overview page or on the token detail page, you can only see the **last characters** of the token to
help identify it."*

Sentry keeps the **tail**, not the prefix. Everyone else keeps the prefix. Both are defensible — the
prefix is stable and machine-meaningful (`sk_live_`, `cfut_`, `pscale_tkn_`, `sb_secret_`), the tail is
the only part that actually distinguishes two keys of the same type from each other. Sentry optimises
for *disambiguation*; the prefix camp optimises for *classification*.

Sentry also emits a **notification on creation**: *"All owners of the organization will receive a
security email when a new organization token is created and can revoke these tokens at any point."*
Creation is treated as a security event with a fan-out, not a private act.

Sentry is also honest in its docs about an inconsistency, which is itself instructive:
*"Currently, you can view personal tokens in the UI after creating them. This is a legacy behavior
that may change in the future."*

**Others, briefly**

- **Resend:** *"You cannot view or edit an API Key value after it has been created."* Reveal-once, no
  documented masked remnant on the row at all.
- **Supabase:** no one-shot reveal for platform keys — `Settings > API Keys` is a durable store you can
  return to. The discipline moved elsewhere: *"Deleting a secret key is irreversible and once done it
  will be gone forever."* Its logging guidance is unusually specific and worth stealing verbatim as a
  masking spec: *"If you must include them in logs, log the first few random characters (but never more
  than 6)"* and *"If you wish to log or store which valid API key was used, store it as a SHA256 hash."*

### What the row looks like afterwards

See §2. The short version: **nobody shows a masked-out full-length token**. The row shows a *name* as
the primary line and a short fragment (prefix or tail) as a secondary line — never a
`sk_live_••••••••••••••••` full-width smear.

### Not verified

- No verbatim "you will not be able to see this again" **modal** copy was captured for Stripe or
  Resend; the Stripe wording quoted is the docs' step description, not necessarily the on-screen string.
- No product's *post-reveal* empty/confirmation state copy was captured beyond Cloudflare's heading.

---

## 2. Credential list row — what earns a column

### Sentry — three columns and a single named action *(screenshot)*

The `Organization Tokens` table has **exactly three labelled columns** plus an unlabelled action cell.
Header cells are uppercase, small, letter-spaced, grey:

`TOKEN` · `CREATED` · `LAST ACCESS` · *(unlabelled)*

- **TOKEN** is a **two-line cell**: line 1 is the token **name** as a blue link
  (`Generated by Sentry Wizard on 2025-03-31` — auto-generated names are dates-in-prose, and the docs
  confirm *"Organization token names are generated for you unless you create the token through the
  Sentry UI. This name is only used for display purposes"*); line 2 is the masked token fragment in a
  smaller, dimmer, monospace-ish treatment.
- **CREATED** = relative time (`2 months ago`) with a **dotted underline** — the dotted underline is
  the tooltip affordance that yields the absolute timestamp. Applied consistently: Svix uses the same
  dotted underline on its absolute timestamps, in the opposite direction.
- **LAST ACCESS** = the literal string **`never used`** in plain grey. Not `—`, not blank, not
  `Never`. A short sentence fragment in the same colour as other secondary values.
- **Action** = one right-aligned **outline** button, `⊖ Revoke`. Not a filled red button, not an
  overflow menu. One credential, one destructive verb, always visible, styled restrained.

The whole table sits in a single white rounded card with a 1px border on a light grey page. There is no
zebra striping, and with one row present the card does not try to look fuller than it is.

Permissions gate the action, not its visibility: *"Only organization owners & managers can revoke
organization tokens."*

### Resend — usage is the headline metric

Docs for the API keys page state the row carries: **Name** (editable), **Permission** level
(editable), **Domain** restriction (editable), **last usage timestamp**, a **request count**, and
*"different colour indicators let you quickly scan and detect which API Keys are being used and which
are not."*

Two things are distinctive:

1. The row's job is **liveness triage**, not inventory. A colour indicator per row answers "is this
   key dead?" at a glance, before you read anything.
2. The **request count is an underlined link into the filtered log** — *"Click the underlined request
   count to access detailed logs for that specific key."* The credential row is a **jumping-off point
   into observability**, which is confirmed by the Logs page having an `All API Keys` filter dropdown
   *(screenshot)*. The key and its traffic are cross-linked in both directions.

Row actions are behind a **More options** button: *Edit API Key* (name, permission, domain) and
*Remove API Key*.

### Stripe — two named lists, and lifecycle state rendered under the name

- The page splits into **two separately headed lists**: **Standard keys** and **Restricted keys**. The
  taxonomy is a structural split, not a column or a filter chip.
- Every row has an **overflow menu (…)** carrying six actions: *Edit key*, *Expire key*, *Rotate key*,
  *Restore access*, *Manage access policy*, *View request logs*.
- A **Note** field is first-class row metadata (the "where did you save it" answer from §1), editable
  via *Edit key*.
- Rotation state is rendered **inline under the name**: *"If you specify a time, the remaining time
  until the key expires displays below the key name."* A key mid-rotation is a **countdown attached to
  the row's primary line**, not a badge in a status column.
- A key can enter a degraded state that is neither active nor revoked: *"An API key might have its
  access limited if it hasn't been used to create transfers, payouts, or update payout destinations for
  over 180 days"*, remediated by *Restore access*. So the state machine is at least
  active / limited / rotating / expired.

### Cloudflare — constraints are part of the credential

The create flow makes two restrictions first-class fields on the token itself, not account settings:
**Client IP Address Filtering** and **TTL (time to live)**. A Cloudflare token can therefore carry an
expiry and a network constraint as its own properties. Stripe reaches the same place differently, via
named **access policies** (IP ranges, or "Advanced": allowed ASNs, allowed countries, blocked sources
— anonymous VPNs / public proxies / residential proxies / Tor exit nodes) that are **created once and
attached to many keys** via *Manage access policy*. Stripe's own guidance: *"Access policies have
replaced IP address restrictions. Use policies, not restrictions."*

### PlanetScale — the non-secret half of the pair is a real identifier

`Authorization: SERVICE_TOKEN_ID:SERVICE_TOKEN`. The **ID** is a durable, displayable, copyable
identifier; the token is the secret. This lets the list row show something unambiguous and permanent
without showing any part of the secret.

### Demoted to detail / not in the row

- Full scope lists (Stripe RAK permissions, Cloudflare permission groups + resources, PlanetScale
  per-database accesses) — the row shows at most a coarse level (Resend's "Permission", Stripe's
  Standard-vs-Restricted split); the enumeration lives on an edit or detail screen.
- Request/response history — reached *from* the row (Stripe *View request logs*, Resend's clickable
  count), never rendered in it.
- Access policy / IP / TTL details — behind *Manage access policy* or the token edit screen.

### Consensus on the row

Every product's row is: **name (primary) · short credential fragment (secondary, same cell) ·
created · last used · one coarse capability signal · actions**. Nobody shows expiry unless the key
actually has one. Nobody puts full scopes in the row.

---

## 3. Webhook endpoint + delivery log

### 3.1 Endpoint detail page anatomy

**Polar** *(screenshot)* — the leanest shipped version, and instructive because it refuses to build a
config card:

- Page title **`Webhooks`** (large bold), top-right holds a `Public Page` pill button, a bell, and an
  avatar.
- Config is a plain stack of **label-above-value pairs on the page background** — no card, no border:
  - `Endpoint` → `https://example.com/` in **monospace**.
  - `Events` → a list of the subscribed event types rendered as **checked, read-only checkboxes**
    (`☑ organization.updated`). The subscription is shown in the same control vocabulary used to edit
    it, which makes "what is this endpoint listening to" instantly legible.
  - A single **`Edit`** pill button below the pairs. All mutation is behind one verb.
- Then a section heading **`Deliveries`** and the table.

**Stripe** — *"open Workbench, select the webhook endpoint under **Webhooks**, then select the
**Event deliveries** tab."* So the endpoint detail is **tabbed**, with deliveries as a named tab
alongside configuration.

**Svix / Clerk / Resend** — the endpoint page **is** a filtered message list: *"the endpoint page has a
filtered list of all messages sent to it."* Clerk's naming for that table is **"Message attempts"**.
Svix's endpoint page also carries an **`Options`** menu holding the bulk remediation verbs (see 3.4).

### 3.2 The delivery/attempt list

**Polar's Deliveries table** *(screenshot)*, inside a rounded 1px-bordered card:

| chevron | `ID` | `Status` | `Data` |
| --- | --- | --- | --- |
| `›` | `6c376cb4-24d9-4feb-b9c3-2747c1e3fb34` | `200` | `organization.updated` |

- The **`ID` header is blue** while `Status` and `Data` are grey — the active sort column is marked by
  colouring its header, nothing else.
- ID and Data are **monospace**; ID is plain text, **not a link**.
- **Status is the bare HTTP numeral, coloured green.** No pill, no badge, no dot, no word. Just `200`
  in green.
- The leading **`›` chevron expands the row in place** to reveal the payload. There is no navigation
  and no drawer — progressive disclosure inside the list.
- **No timestamp column at all.** Polar spends its four columns on identity, outcome, and event type.
- Pagination sits **outside and below the card**, right-aligned:
  `Rows per page [20 ▾]  Page 1 of 1  |‹ ‹ › ›|`.

**Svix's top-level Message Logs** *(screenshot)*, and the more interesting choice:

- Page label `Message Logs` (small, grey) above a bold section header **`Latest Messages`** — a page
  title and a section title, distinct sizes.
- Toolbar right-aligned on the section header row: an **icon-only refresh** button and a
  **`Filters`** button with a filter glyph. Two controls, no inline filter bar.
- Table inside a white rounded 1px card. Uppercase grey letter-spaced headers:
  `EVENT TYPE` · `MSG ID` · `TIMESTAMP`.
- `EVENT TYPE` and `MSG ID` in **monospace**; `TIMESTAMP` is **absolute** (`November 19, 2021,
  11:20 PM`) with a **dotted underline** (tooltip affordance) — the exact inverse of Sentry's
  relative-with-dotted-underline.
- Hairline row separators, no zebra, no elevation.
- **There is no status column.** This is deliberate and correct: one message fans out to many
  endpoints, so a message has no single status. **Status only exists at the attempt level, per
  endpoint.** The cross-endpoint list therefore refuses to fake one.

**Resend's API log list** *(screenshot)* — the strongest answer to "how do you make 200 near-identical
rows scannable" (details in §4.4).

### 3.3 A failed delivery

- **Clerk:** *"In the **Message attempts** table, you will likely see that one or more of those
  attempts have failed. Select the failed attempt to expand it. In the details for the attempt, there
  will be a `HTTP RESPONSE CODE`."* Expand-in-place, and the expanded detail uses an **uppercase field
  label** for the response code. Clerk then ships a **code → meaning table** in its docs (`400` verification
  probably failed, `401` middleware is protecting the route, `404` wrong URL, `405` route doesn't accept
  POST, `500` your handler threw) — the product's own error taxonomy, mapped to causes.
- **Stripe:** *"Click an event to view metadata, including the HTTP status code of the delivery attempt
  **and the time of pending future deliveries**."* The **next scheduled retry is shown as a
  timestamp**, not as "will retry" or a counter.
- **Svix:** *"You can see when a message will be retried next in the webhook message details."* Same
  idea. And *"all tries (and responses) are logged for transparency"* — every attempt keeps its own
  recorded response body and status, so the attempt list is the failure narrative.
- **Polar:** the row's expand chevron reveals the payload; docs frame the endpoint detail as *"See
  historic deliveries / Review payload sent / Trigger redelivery in case of failure."*

Two states are consistently distinguished from raw failure:

- **Pending** — Stripe's `Event deliveries` tab lists events as **`Delivered`, `Pending`, or
  `Failed`**. In-flight-with-retries-remaining is its own status word, not a variant of failed.
- **Exhausted** — Svix: *"After the conclusion of the above attempts the message will be marked as
  `Failed` for this endpoint, and the webhook sender's account will get an operational webhook of type
  `message.attempt.exhausted`."* Terminal failure is a distinct, named, notifying event.

### 3.4 Endpoint health, auto-disable, and remediation

No product in this survey was verified to render a success-rate percentage or a health sparkline on the
endpoint row (see *Not verified*). What they render instead is **binary enabled/disabled plus an
out-of-band notification**, with the disable rule made explicit in docs:

| Product | Auto-disable rule | Notification | Re-enable |
| --- | --- | --- | --- |
| **Svix / Clerk / Resend** | *"If all attempts to a specific endpoint fail for a period of 5 days, the endpoint will be disabled"* — and the clock is qualified: *"The clock only starts after multiple deliveries failed within a 24 hour span, with at least 12 hours difference between the first and the last failure."* | operational webhook `EndpointDisabledEvent` | — ; and the whole behaviour is **switchable off** from the Environment settings page |
| **Polar** | *"automatically disabled after **10 consecutive failed deliveries** (non-2xx responses)"* | *"All organization members will receive an email notification"* | **manual**: *"open your organization's webhook settings and manually enable it"* |
| **Stripe** | not stated on `docs.stripe.com/webhooks` (see *Not verified*) | — | — |

Retry ladders, for reference:

- **Svix/Clerk/Resend:** `Immediately · 5s · 5m · 30m · 2h · 5h · 10h · 10h`. Success = `2xx` within
  15s. *"Any other status code, including `3xx` redirects are treated as failures."* Escape hatch: a
  receiver can return header `webhook-delivery: abort-message` to stop retries.
- **Stripe:** *"up to three days with an exponential backoff in live mode"*; in a sandbox,
  *"three times over the course of a few hours"* — the sandbox has a deliberately shorter, cheaper ladder.
- **Polar:** *"up to 10 times with an exponential backoff"*, 10s timeout, *"we strongly recommend you
  optimize your endpoint route to respond within 2 seconds"*.

**Remediation verbs** — Svix ships the most complete set, and the naming is worth copying wholesale:

- Single attempt: *"click the options menu next to any of the attempts"* → **`resend`**.
- Whole cohort, from the endpoint's `Options` menu → **`Recover Failed Messages`**, which opens a modal
  where *"you can choose a time window to recover from."*
- From any message's options menu → **`Replay…`** → **`Replay all failed messages since this time`** —
  uses the row you are looking at as the recovery watermark.
- The docs name two distinct bulk operations: **"Recover Failed"** (retry everything that failed since
  a date) and **"Replay Missing"** (send messages that were *never attempted* against this endpoint —
  what you need after adding a new event type or a new endpoint).

`Recover Failed` vs `Replay Missing` is the key distinction: **"failed" and "never attempted" are
different problems and need different buttons.**

Manual resend windows are bounded, and the bound differs by channel — Stripe: *"This works for up to 15
days after the event creation"* in the Dashboard, *"up to 30 days"* via the CLI. Stripe also tiers
event visibility by age: full payload + delivery attempts + resend under 15 days; payload only at
16–30 days; *"Summary view only, truncated fields"* beyond 30 days.

### 3.5 "No deliveries yet" vs "deliveries failed"

**This is the one question the public record does not answer well.** No verbatim empty-state string was
found for any of the eight products' delivery lists. What *is* verified is the **structural** basis on
which the two states must differ:

- **Failure is an out-of-band, notifying event** in every product — email (Polar, Sentry), operational
  webhook (Svix `EndpointDisabledEvent`, `message.attempt.exhausted`), or a Stripe notification. A
  failing endpoint is never left to be discovered by reading an empty table.
- **Silence has no notification anywhere.** So an endpoint with zero deliveries is, by every product's
  own model, *unremarkable* — and correspondingly the product that has a verified vocabulary for it
  (Sentry, on credentials) uses the mildest possible phrasing: **`never used`**, plain grey, same
  colour as ordinary secondary text.
- Svix additionally distinguishes **never-attempted** from **failed** at the level of *actions*
  (`Replay Missing` vs `Recover Failed`), which is a strong signal that the two states should not share
  a presentation.

**Do not** read Stripe's endpoint list as having quiet-endpoint copy — see *Not verified*.

### Not verified (do not build on these)

An early structured extraction against `docs.stripe.com/webhooks` returned an endpoint "success rate /
error rate / health" widget and the strings `"No events received yet."` and `"This endpoint is quiet."`
A follow-up verbatim-quote pass against the same page returned **"not stated"** for auto-disable and
produced no such strings. Treat those as **extraction hallucinations**. Stripe's verified endpoint
vocabulary is only: `Event deliveries` tab, statuses `Delivered` / `Pending` / `Failed`.

Also unverified: Resend's and Clerk's webhook **endpoint list row** columns (only the endpoint *detail*
is documented), and any per-endpoint health metric in any product.

---

## 4. Activity / audit feed

### 4.1 Row anatomy — Cloudflare's Audit Logs v2 schema is the best available spec

The v2 payload is effectively a design document for what a row should promote versus bury:

```jsonc
{
  "action": { "description": "Add Member", "type": "create", "result": "success",
              "time": "2024-04-26T17:31:07Z" },
  "actor":  { "email": "alice@example.com", "type": "user", "context": "dash",
              "ip_address": "198.41.129.166", "id": "…",
              "token_id": "…", "token_name": "…" },
  "resource": { "type": "…", "id": "…", "scope": {}, "product": "members" },
  "account": { "id": "…", "name": "Example Account" },
  "zone":   { "id": "…", "name": "example.com" },
  "raw":    { "method": "POST", "status_code": 200,
              "uri": "/accounts/…/members",
              "user_agent": "Mozilla/5.0 …", "cf_ray_id": "8e9b1c60ef9e1c9a" }
}
```

Read structurally:

- **`action.description` is a human verb phrase — `"Add Member"`** — carried on the record itself. The
  UI does not compose a sentence from a machine enum; the backend ships the display string. Alongside
  it, `action.type` is the coarse machine category (`create` / `update` / `delete` / `view`) — exactly
  the right granularity to drive an **icon or colour**, since there are only four values.
- **`action.result` is `success` | `failure`.** An audit row carries an outcome. A *denied* or *failed*
  attempt is a first-class row, not an absence. Docs: *"the result (`success` or `failure`)"*.
- **`actor` distinguishes human from machine, and names the machine.** `actor.type` is
  `user` | `account` | `Cloudflare_admin` | `system`; `actor.context` is `dash` or API. Critically,
  when a token acted, the actor carries **`token_name`** — so the row can say *"via <token name>"*
  rather than showing a UUID. Docs: *"`actor_type="account"`: Action was performed using an account API
  token"*, and system-initiated rows exist for *"actions taken automatically by Cloudflare systems"*.
- **`resource` = `{type, id, scope, product}`** — the target, plus which product surface it belongs to,
  plus whether it is `user` / `account` / `zone` scoped.
- **Everything HTTP is namespaced under `raw`.** `method`, `status_code`, `uri`, `user_agent`,
  `cf_ray_id` are explicitly demoted into a sub-object. That is the schema *telling you* they belong in
  the expanded detail, not the row.

So the row is: **`[icon from action.type]` `actor` `action.description` `resource` `time`
`[result if failure]`** — and the detail adds `raw.*`, IP, ray ID, and the request/response snapshots
(`resource.request`, `resource.response`).

### 4.2 Filtering and scope

- **Cloudflare v2:** *"precise filtering by actions, actors, methods, and resources."* Four filter
  dimensions matching the four schema top-levels. The v1 dashboard is simpler — *"You can search these
  audit logs by user email or domain and filter by date range"* — plus a **`Download CSV`** button.
  There is also a cross-scope escape hatch: a **`View Organization Audit Logs`** button appears when
  you are on an account inside an org you super-administer.
- **Stripe activity logs:** filterable *"by action group"* (API keys / user invitations / user roles)
  and by specific action type. The action-type vocabulary is `snake_case` and includes
  `api_key_created`, `api_key_deleted`, `api_key_updated`, and — notably — **`api_key_viewed`**.
  *Revealing* a secret is itself an audited action.
- **Sentry:** `Settings > Audit Log`, filterable by action, with docs pointing users at specific values
  (*"You can filter for action `member.pending` to see removed organization members, and action
  `org.edit` to see when the …"*). The action name is the filter token the user types.

### 4.3 Grouping by day and retention honesty

**No day-grouping (sticky date headers) was verified in any of the eight products' audit feeds.** All
verified feeds are flat, filterable, paginated lists with a date-range control. Stripe's log list
*"return[s] records in ascending order by `created` timestamp"* and paginates via `next_page_url`.

What *is* verified is that these products **state the UI's window separately from the API's**, and the
UI window is much shorter:

| Product | UI window | Retention |
| --- | --- | --- |
| Cloudflare | *"queries are limited to the most recent 90 days for performance reasons"* | 18 months (API / Logpush) |
| Stripe activity logs | — | 6 months; *"events appear ~10 minutes after occurrence"* |
| Cloudflare v1 API | — | 18 months max age |

Two things to copy: the **explicit lag disclosure** (Stripe's ~10 minutes — an audit feed that is not
real-time should say so, or users will read absence as a bug), and the **UI-window ≠ retention-window**
split stated in the interface rather than only in docs.

### 4.4 Avoiding an undifferentiated wall of identical rows

**Resend's Logs page is the best shipped answer** *(screenshot)*, and it is a hard case: the visible
rows are `/emails`, `/emails`, `/domains/…`, `/domains`, `/api-keys`, `/contacts`, `/contacts`,
`/contacts` — genuinely repetitive. Four devices do the work:

1. **A colour-coded leading icon tile per row.** A small rounded-square tile, ~28px, with a tinted fill
   *and* a matching 1px border: **green for 2xx, red for 4xx**. The **glyph inside is identical in both**
   — only the colour changes. This creates a scannable colour gutter down the left edge, so outcome is
   readable in peripheral vision before any text is parsed. This is the single highest-leverage move.
2. **Outcome is double-encoded.** The tile is joined by a small **pill badge containing the bare
   numeric status** (`429`, `422`, `200`, `201`) in the same colour family. Two independent encodings
   of the same fact, at different positions.
3. **The uninformative field is deliberately left plain.** `Method` (`POST` / `GET` / `DELETE`) is
   rendered as **plain uppercase text with no badge**, even though it is the most obvious badge
   candidate. Badging it would have produced a second colour column competing with the status column
   and carrying no urgency.
4. **Right-aligned relative time as the second anchor.** `Created` is right-aligned and relative only
   (`less than a minute ago`, `4 minutes ago`, `2 days ago`). Left edge = *what happened*, right edge =
   *when*. The repetitive path text sits between two informative rails.

Supporting details from the same screenshot: the endpoint path carries a **dotted underline** and
truncates long IDs with `…`; the table header is a single filled bar slightly lighter than the page;
rows have hairline bottom borders and **no card wrapper**; there is no zebra striping.

The toolbar above the table is one row: search field, then four dropdowns labelled by their *current
state* rather than their function — **`All Statuses` · `Last 15 days` · `All User Agents` ·
`All API Keys`** — then a trailing icon-only download button. "All Statuses" reads as a declaration of
what you are seeing, not an instruction; the control *is* the state readout. Documented filter options:
`All Statuses` / `Successes` (2xx) / `Errors` (4xx and 5xx) / specific multi-select codes, plus date
range, user agents, and API keys.

Svix takes the opposite, minimal route and it is a fair contrast: no icons, no colour, no status column
at all, uniform monospace — differentiation comes only from event type and timestamp. It works because
the list is short and grouped by time, and because status genuinely does not exist at that level.

### 4.5 The detail record *(Resend, screenshot)*

Resend's log detail is a **full page** (same sidebar persists), not a drawer:

- **Identity block:** the *same* colour-coded tile from the row, scaled up to ~64px, sitting left of a
  two-line heading — a small grey eyebrow **`Log`** above a bold H1 **`POST /contacts`**. The title is
  the verb-plus-target composed into one string. **Reusing the row's tile as the page's identity mark
  is what makes list→detail feel continuous.**
- **A 3-column × 2-row metadata grid** of label/value pairs, labels **uppercase, small, letter-spaced,
  grey**: `ENDPOINT` · `DATE` · `STATUS` / `METHOD` · `USER-AGENT` · `ID`.
  - `STATUS` renders **the identical green pill used in the list** — status has one representation
    everywhere.
  - `DATE` stays **relative** (`2 days ago`) even in the detail view.
  - `ID` is the only value in a **filled chip with a copy icon**; every other value is plain text.
    Copyability is signalled by the chip, and only identifiers get it.
- **Then `Response Body` before `Request Body`** — outcome first, cause second. Each is a
  syntax-highlighted JSON block sitting **directly on the page background** (no card, no border, no
  fill) with a copy icon floated far right.
- The lower half of the page is simply **empty**. No filler, no "related items", no stats.

Resend layers two escalations on top of this: a **`Help me fix`** button on supported error types
opening a drawer with *"Raw response / Detailed guidance / Relevant links / Contextual information —
your current rate limits, verified domains"*; and a **`Copy for AI`** dropdown on 4xx/5xx offering
*Copy log* (as Markdown), *Open in ChatGPT*, *Open in Claude*.

And it is **bidirectionally cross-linked** with the domain object: *"an Email field appears in the log
details, linking directly to the corresponding email records. The corresponding email's detail page
includes a Log field linking to the API request log that triggered it, so you can trace the full
request-to-delivery flow in both directions."*

---

## 5. Job / delivery history — in-flight, succeeded, partially failed, exhausted

### 5.1 State vocabularies

**Resend's email event vocabulary** is the most complete verified example — 12 values, each with a
one-sentence definition, covering all four requested categories:

| Value | Definition (verbatim) | Category |
| --- | --- | --- |
| `scheduled` | *"The email is scheduled for delivery."* | not started |
| `queued` | *"The email created from Broadcasts or Batches is queued for delivery."* | in-flight |
| `sent` | *"The email was sent successfully."* | handed off |
| `delivery_delayed` | *"couldn't be delivered … because a temporary issue occurred"* | in-flight, degraded |
| `delivered` | *"Resend successfully delivered the email to the recipient's mail server."* | success |
| `opened` / `clicked` | engagement | post-success |
| `bounced` | *"The recipient's mail server rejected the email."* | terminal failure |
| `complained` | *"delivered … but the recipient marked it as spam"* | success-then-bad |
| `failed` | *"The email failed to be sent."* | terminal failure |
| `canceled` | *"The scheduled email was canceled (by user)."* | user-terminated |
| `suppressed` | *"not sent because the recipient is on the suppression list"* | **refused before attempt** |

Three lessons: `queued` explicitly names *why* it is queued (*"created from Broadcasts or Batches"*);
`suppressed` is a distinct state for "we chose not to try", separate from both failure and success, and
its webhook payload carries a `suppressed.message` explaining it *and* notes *"This does not count
toward your bounce rate metric"* — the state carries its own metric semantics; and `delivery_delayed`
keeps "still trying" out of the failure bucket.

**Stripe batch jobs** contribute the two states that matter for long-running work:

- *"Jobs that exceed this limit transition to `timeout` status, **with partial results available**."*
  (limit = 24 hours max processing.) **Partial failure is a named status with retrievable output**, not
  an error.
- *"The upload URL expires 5 minutes after job creation. After that period, the job transitions to
  `upload_timeout` and you need to create a new one."* A job can die **before it starts** for a reason
  distinct from failing while running, and it gets its own status word.
- *"Results are available for download for 7 days after the job completes."*
- *"Monitor job status through webhooks or polling."*

**Svix** supplies the exhausted state and its notification: after the ladder concludes, *"the message
will be marked as `Failed` for this endpoint"* and the account receives
**`message.attempt.exhausted`**. Note the scoping — `Failed` is *per endpoint*, so the same message can
be delivered to one endpoint and exhausted against another. That is the mechanical origin of
"partially failed" in a fan-out job.

**Stripe event deliveries** contribute the minimal in-flight vocabulary: **`Delivered` / `Pending` /
`Failed`**, with the detail carrying *"the time of pending future deliveries"*.

### 5.2 Progress without a spinner per row — Resend's exports

Resend's export flow is the only fully documented job-history surface in the set, and it avoids
per-row spinners by **branching on size at submit time**:

- Trigger: *"apply filters to your data and click on the 'Export' button. **Confirm your filters before
  exporting your data.**"* — the job's parameters are the list's current filter state, and there is an
  explicit confirmation step showing them. No separate export configuration screen.
- **Small jobs never become rows at all:** *"If your exported data includes 1,000 items or less, the
  export will download immediately."*
- **Large jobs are handed to email, not to a progress bar:** *"For larger exports, you'll receive an
  email with a link to download your data."* The completion channel is out-of-band, so nothing needs to
  poll and no row needs to animate.
- The artefact has a **lifetime and an expiry state:** *"All admins on your team can securely access
  the export for 7 days. **Unavailable exports are marked as 'Expired.'**"*
- The history lives at a stable nested location — *"All exports your team creates are listed in the
  [Exports] page under **Settings > Team > Exports**. Select any export to view its details page"* —
  and carries a **visibility/permission split**: *"All members of your team can view your exports, but
  only admins can download the data."*
- Exportable resources are enumerated: Emails, Broadcasts, Contacts, Segments, Domains, Logs, API keys.
  (Stripe's batch job results are likewise download-for-7-days.)

The transferable mechanic: **`immediate` for small, `notify` for large, `Expired` as a terminal state,
7-day artefact lifetime, and view ≠ download permissions.** Between them, nothing in the UI has to
express live progress.

For cohorts that *did* fail, the remediation is bulk and named rather than per-row: Svix's
**`Recover Failed`** (choose a time window) and **`Replay Missing`** (never-attempted). Fixing 400
failed rows is one dialog, not 400 retry buttons.

### 5.3 Not verified

- No verbatim Stripe Dashboard description of **where batch jobs are listed** or what columns a job row
  shows. The full status enum beyond `timeout` and `upload_timeout` was not captured (a structured
  extraction attempt returned obviously synthetic `{total: 0, succeeded: 0, failed: 0}` counters —
  discarded).
- No product was verified to render a **determinate progress bar or "X of Y processed"** counter on a
  job row.

---

## 6. Settings pages

### 6.1 Shell and navigation — Sentry *(screenshot)*

- A **top breadcrumb bar spanning the full width**: `Settings / <org> / Organization Tokens`, with a
  right-aligned **`Search`** input. The breadcrumb is the only place the hierarchy is stated.
- A **left vertical rail** grouped by **uppercase, small, letter-spaced group labels** with no
  containers or dividers between groups — the labels alone create the grouping:
  - `USER SETTINGS` → General Settings
  - `ORGANIZATION` → General Settings · Projects · Teams · Members · Security & Privacy · Auth ⚡ ·
    Audit Log · Relay ⚡ · Repositories · Integrations · Feature Flags `beta`
  - `DEVELOPER SETTINGS` → Organization Tokens · Custom Integrations
- Note both rails contain an item called **"General Settings"**; disambiguation comes purely from the
  group label. Scope is expressed by grouping, not by prefixing names.
- The active item gets a **left accent bar plus coloured text**; no filled pill.
- **Only two levels of nesting** exist: group label → item. No collapsible trees, no third level.
- Content column: **H1 page title with the primary action button top-right** (`Create New Token`), then
  one or two paragraphs of plain explanatory prose *before* any control, then the content card.

Resend's rail *(screenshot)* is the opposite extreme and worth noting as a viable alternative: a
**single flat list of ten icon+label items** (Emails, Broadcasts, Templates, Audience, Metrics,
Domains, Logs, API Keys, Webhooks, Settings) with no group labels at all, an org switcher pinned at the
top and the user identity pinned at the bottom. All of Settings hides behind one nav item, then nests
internally (`Settings > Team > Exports`). Cloudflare *(screenshot)* uses a third pattern — a
**contextual rail with a `← My Profile` back link, a `⌘K` quick search, and only three items** — so the
rail's contents change with where you are.

Cloudflare also splits by **ownership scope at the top level**: user tokens live under
`My Profile > API Tokens`, account tokens under `Manage Account > API Tokens`. Same surface, two
locations, distinguished by whose credential it is.

### 6.2 Section anatomy and where Save lives — Sentry's panel *(screenshot)*

Sentry's create/edit form is a **full page**, not a modal, composed as one card:

- The card has an **uppercase, small, letter-spaced header bar** — `CREATE NEW ORGANIZATION TOKEN` —
  which restates the H1. Card header ≠ page title, and Sentry is happy for them to duplicate.
- Body is a stack of **two-column rows** separated by hairlines:
  - **Left ~50%:** the label (normal weight, ~15px) with **helper text directly beneath it** in grey
    (`Name` / *"A name to help you identify this token."*).
  - **Right ~50%:** the control.
  - Required is marked by a **small red dot after the label**, not an asterisk.
- **The save affordance is a footer row inside the same card**, right-aligned, with the hairline above
  it: `Cancel` (outline) then `Create Token` (primary). **Per-card footer, not a sticky page footer and
  not autosave.**
- The primary is **disabled (greyed) until the form is valid** — the empty `Name` keeps `Create Token`
  inert.

So the unit of saving is the **card**: one card = one section = one Save. This scales to multi-section
settings pages without a global dirty state.

### 6.3 Read-only and plan-gated settings

**Read-only is the clearest verified pattern**, from the same Sentry screenshot. The `Scopes` row is
not editable, and it is **not rendered as a disabled input**. It is rendered as **plain text in the
control column**:

```
Scopes                                          org:ci
Organization tokens currently have a            Source Map Upload, Release Creation
limited set of scopes.
```

- The machine value (`org:ci`) sits on the first line in monospace.
- Its **human expansion** (`Source Map Upload, Release Creation`) sits beneath in grey.
- The left column's helper text **explains why it is fixed** — *"Organization tokens currently have a
  limited set of scopes."*

That is the rule: a read-only setting keeps its label, keeps its position in the row rhythm, loses its
input chrome, gains a sentence explaining the constraint, and shows both the machine value and its
human meaning. Sentry's docs mirror this per token type — *"Organization tokens permissions aren't
customizable"*, *"Permissions … are customizable and editable"* (internal integrations), *"Personal
token permissions are customizable but cannot be edited later."* Three different mutability regimes,
each stated in prose next to the control.

**Plan-gated** is thinner. The verified signal is Sentry's rail: **a small `⚡` lightning glyph
right-aligned on the `Auth` and `Relay` nav items** — gated items stay **present and clickable** in the
rail, marked by a trailing glyph, rather than being hidden or greyed. The neighbouring pattern is
`Feature Flags` carrying a small filled **`beta`** pill in the same trailing position, so trailing
badges are the rail's general slot for item metadata. *I did not verify what the gated page itself
renders on click.*

Adjacent, verified, and useful: **Supabase tabs a deprecated surface rather than replacing it.**
`Settings > API Keys` has an **`API Keys`** tab and a **`Legacy API Keys`** tab. Legacy keys keep
working — *"They remain valid until you explicitly disable them in the Settings > API Keys section of
the Dashboard **which is a separate step**"* — and the docs are explicit that
*"Creating new keys does not revoke your legacy keys."* Migration is a tab, a separate deliberate
disable action, and a stated deprecation date (*"deprecated by the end of 2026"*).

### 6.4 Quarantining destructive actions

No product in this survey was verified to ship a bordered red **"Danger Zone"** panel. What they do
instead, consistently, is **make destruction non-adjacent, confirmed, notified, or reversible**:

- **Hidden behind an overflow menu, then a confirm dialog.** Stripe: every destructive verb is inside
  the per-row `…` menu, and each opens a dialog with a symmetrical escape — *"In the dialog, click
  **Expire key**. If you no longer want to expire the key, click **Cancel**."* Deleting an access
  policy adds *"**Review the confirmation dialog to understand the impact**, then click Delete policy"*,
  and the impact is spelled out: *"Deleting an access policy immediately removes it from all API keys it
  was applied to. Those keys allow requests from any source until you apply another policy to them."*
- **Step-up authentication on the dangerous path.** Creating a Stripe secret key requires an emailed or
  texted verification code inside the dialog; applying, updating, or deleting an access policy prompts
  *"If prompted to authenticate, follow the on-screen instructions."*
- **Make it reversible instead of scary.** Stripe's rotation ships a **grace period**: *"When you
  rotate a key in the Dashboard, both the old and new keys work for up to 7 days."* Plus operational
  guidance — *"Monitor before revoking … expire it only after its request volume has been at zero for a
  few hours or days"* — and a staged-rollout recommendation. The dangerous action is redesigned so it
  cannot cause an outage, rather than wrapped in warnings.
- **Restrained visual weight, restricted permission.** Sentry's `Revoke` is an **outline** button with
  a `⊖` glyph — not filled red — and *"Only organization owners & managers can revoke organization
  tokens."* Authority gates it; colour does not shout.
- **Notify out of band.** Sentry emails all org owners on token creation. Polar emails all org members
  on endpoint auto-disable.
- **State the irreversibility in plain words at the decision point.** Supabase: *"**Deleting a secret
  key is irreversible and once done it will be gone forever.**"* Stripe: *"We can't recover keys that
  you've forgotten or lost access to."*
- **Make re-enabling deliberately manual.** Polar refuses to auto-recover a disabled endpoint:
  *"open your organization's webhook settings and manually enable it. Before re-enabling, ensure your
  endpoint is properly configured and reachable to avoid repeated disabling."*

### 6.5 Environment / mode is a page mode, not a filter

Stripe's API keys page is the same page in two modes: *"toggle from **sandbox mode** to **live
mode**. The page now shows your live mode API keys."* And the *rules* differ by mode, not just the
data — sandbox shows every secret permanently, live enforces reveal-once. Behaviour is mode-dependent,
which is stronger than a filter chip and correctly signals that you are somewhere else.

### 6.6 Not verified

- Any product's **sticky page-level save footer** or **autosave** behaviour. Only Sentry's per-card
  footer was directly observed.
- What a **plan-gated settings page** renders when opened.
- Any **"Danger Zone"** panel, and any settings **empty state**.

---

## Transferable rules

1. **Show a secret in a container the product uses nowhere else.** Cloudflare's dashed border is the
   clearest execution — dashed reads as *ephemeral* against every solid-bordered input in the app, so
   the container itself says "this is transient" before any copy does.
2. **Scope the never-again warning to the secret field, not the page.** PlanetScale puts
   `Token won't be shown again after this step` as a small amber pill on the `Token` label's own line,
   and gives the non-secret `ID` field no warning at all. A page-level alert would have implied both
   fields were dangerous.
3. **Ask where the secret went, and store the answer on the credential.** Stripe's reveal dialog ends
   with an **`Add a note`** field prompting for *the location where you saved the key*, persisted on the
   row and editable later. It converts an unanswerable future question ("is this key still in use
   anywhere?") into row metadata at the one moment the user knows the answer.
4. **Put a working verification command on the reveal screen.** Cloudflare's reveal page includes a
   `curl` against `/user/tokens/verify` with the token already interpolated and its own copy button. The
   user confirms the credential works before the only chance to copy it expires.
5. **Give the reveal screen one exit, and make its weight match its meaning.** Cloudflare's is an
   underlined link (`View all API tokens`) because leaving is neutral; PlanetScale's is a primary button
   (`Continue to token permissions`) because leaving means starting the next required step. Never offer
   both a Cancel and a Done on a screen showing an unrecoverable value.
6. **Never render a masked full-length token.** Every product shows **name as the primary line and a
   short fragment as a dim secondary line in the same cell**. Choose one fragment convention and hold
   it: prefix (`sk_live_`, `cfut_`, `sb_secret_`, `pscale_tkn_`) classifies; **tail** (Sentry:
   *"you can only see the last characters"*) disambiguates two keys of the same class. Prefer the tail
   when the prefix is constant across all your keys.
7. **A credential row earns exactly: name · fragment · created · last used · one coarse capability
   signal · actions.** Sentry ships **three** labelled columns (`TOKEN` / `CREATED` / `LAST ACCESS`).
   Full scope enumerations, IP policies, TTLs, and request history are all reached *from* the row, never
   rendered in it.
8. **Write "never used", not an em dash.** Sentry's `never used` in plain grey is a readable fact; `—`
   forces the reader to decide whether it means never, unknown, or not-applicable.
9. **Make the row's usage figure a link into its filtered log.** Resend's request count is clickable
   *"to access detailed logs for that specific key"*, and its Logs page carries a matching
   `All API Keys` filter. Cross-link credential ↔ traffic in both directions.
10. **Colour-code liveness before anything else.** Resend puts *"different colour indicators … to
    quickly scan and detect which API Keys are being used and which are not"* on the credential row.
    Triage first, inventory second.
11. **Split a credential taxonomy into separately headed lists, not a filter.** Stripe's page has
    **`Standard keys`** and **`Restricted keys`** as two headed tables. Two kinds of key with different
    risk profiles should not interleave.
12. **Render lifecycle state inline under the row's primary line, not as a status badge.** A Stripe key
    mid-rotation shows *"the remaining time until the key expires … below the key name"*. Transient
    state is a countdown attached to the name; it does not need a status column that is empty 99% of
    the time.
13. **Reveal-once is a production rule, not a universal one.** Stripe: *"In sandbox mode, you can always
    see all of your API keys."* Enforce the discipline where the blast radius is real and skip the
    ceremony where it is theatre.
14. **A shared cross-endpoint delivery list must not invent a status column.** Svix's Message Logs shows
    `EVENT TYPE` / `MSG ID` / `TIMESTAMP` and nothing else, because one message fans out to many
    endpoints and has no single outcome. **Status belongs to the attempt, per endpoint.**
15. **Name the in-flight state.** Stripe's `Delivered` / `Pending` / `Failed` keeps
    retries-remaining out of the failure bucket entirely. Resend goes further with `delivery_delayed`
    (*"a temporary issue occurred"*) alongside `failed`.
16. **Show the next retry as a timestamp, not a promise.** Stripe's event detail shows *"the time of
    pending future deliveries"*; Svix *"you can see when a message will be retried next"*. `Retrying in
    2h` is worse than `Next attempt 14:32`, because the latter is checkable.
17. **Terminal exhaustion is a distinct, named, notifying state.** Svix marks the message `Failed` *for
    that endpoint* and fires **`message.attempt.exhausted`**. "We gave up" must be separable from "not
    yet succeeded", and must reach the user out of band.
18. **Ship two different bulk remediations, because there are two different problems.** Svix's
    **`Recover Failed`** (retry everything that failed since a chosen time window) and
    **`Replay Missing`** (send messages *never attempted* against this endpoint). Fixing 400 failed
    deliveries is one dialog, not 400 buttons.
19. **Publish the auto-disable rule and its qualifying clock in the UI.** Polar: *"automatically
    disabled after 10 consecutive failed deliveries (non-2xx)"*. Svix: *"all attempts … fail for a
    period of 5 days … The clock only starts after multiple deliveries failed within a 24 hour span,
    with at least 12 hours difference between the first and the last failure."* An endpoint that can be
    switched off must state the threshold before it fires.
20. **Never let a user discover failure by reading a table.** Every product notifies out of band —
    Polar emails *all organization members*; Svix fires `EndpointDisabledEvent`; Sentry emails all
    owners on token creation. Corollary: **silence is never notified**, so an empty delivery list must
    read as *unremarkable* (Sentry's plain-grey `never used`), while a failing one must already have
    reached the user elsewhere.
21. **Re-enabling after auto-disable stays manual.** Polar: *"manually enable it. Before re-enabling,
    ensure your endpoint is properly configured and reachable to avoid repeated disabling."* Automatic
    recovery just re-runs the failure.
22. **Ship the human verb phrase from the backend; keep the machine enum coarse.** Cloudflare's
    `action.description` is `"Add Member"` while `action.type` is one of only four values
    (`create`/`update`/`delete`/`view`). The description is the row's text; the four-value type drives
    the icon. Do not compose audit sentences in the client.
23. **An audit row carries `result: success | failure`.** Denied and failed attempts are rows, not
    absences — and Stripe's activity log even records **`api_key_viewed`**, so *revealing* a secret is
    itself audited.
24. **Name the machine actor.** Cloudflare's actor carries `token_name` alongside `token_id`, and
    `actor.type` separates `user` / `account` / `system` / admin, with `context` distinguishing `dash`
    from API. The row should say *"via Production CI token"*, never a UUID, and should never present a
    system action as if a person did it.
25. **Namespace raw HTTP detail out of the row.** Cloudflare buries `method`, `status_code`, `uri`,
    `user_agent`, `cf_ray_id` inside a **`raw`** object. Let the schema decide what the detail view
    gets.
26. **A colour-coded leading icon tile is the cheapest cure for a wall of identical rows.** Resend's
    ~28px rounded tile — tinted fill plus matching border, **same glyph, green for 2xx / red for 4xx** —
    creates a scannable colour gutter readable in peripheral vision.
27. **Double-encode outcome; leave the uninformative field plain.** Resend pairs the tile with a small
    pill holding the bare status numeral, and deliberately renders `Method` as **plain uppercase text
    with no badge**. Badging the method would create a second colour column carrying no urgency.
28. **Anchor repetitive rows between two informative rails.** Left edge = colour-coded outcome, right
    edge = right-aligned relative time. Repetitive middle content becomes tolerable.
29. **Label filter controls with their current state, not their function.** Resend's toolbar reads
    `All Statuses` · `Last 15 days` · `All User Agents` · `All API Keys`. The control *is* the state
    readout, so no separate "showing X of Y" line is needed.
30. **Pick one timestamp convention and one tooltip affordance, then invert deliberately.** Sentry shows
    relative time with a dotted underline; Svix shows absolute time with a dotted underline. Either is
    fine; the **dotted underline meaning "hover for the other form"** must be universal.
31. **Reuse the row's colour-coded tile as the detail page's identity mark, at ~2× size.** Resend's log
    detail opens with the same tile at ~64px beside an eyebrow (`Log`) and an H1 composed of verb +
    target (`POST /contacts`). This is what makes list→detail read as the same object.
32. **Status must render identically in list and detail.** Resend's green `201` pill is pixel-identical
    in both. Re-styling status on the detail page makes users re-learn it.
33. **A detail record is a labelled metadata grid, then payload sections — no cards.** Resend uses a
    3×2 grid with uppercase letter-spaced grey labels, then `Response Body` **before** `Request Body`
    (outcome before cause), each a syntax-highlighted block sitting directly on the page background with
    a copy icon floated right. Leave the bottom of the page empty rather than filling it.
34. **Only identifiers get the chip-plus-copy treatment.** In Resend's detail grid, `ID` is a filled
    chip with a copy icon; `ENDPOINT`, `METHOD`, `USER-AGENT`, `DATE` are plain text. Copyability is a
    signal, and it is wasted if applied to everything.
35. **Escalate from an error record into help, don't just display it.** Resend's `Help me fix` drawer
    carries *"Raw response / Detailed guidance / Relevant links / Contextual information — your current
    rate limits, verified domains"*, and `Copy for AI` exports the record as Markdown or hands it to
    ChatGPT/Claude. Clerk ships a `HTTP RESPONSE CODE` → likely-cause table for its five common codes.
36. **Cross-link a log record and its domain object in both directions.** Resend: the log gains an
    `Email` field, and the email's detail page gains a `Log` field, *"so you can trace the full
    request-to-delivery flow in both directions."*
37. **Branch job handling on size at submit time, so nothing has to animate.** Resend: *"1,000 items or
    less, the export will download immediately. For larger exports, you'll receive an email with a
    link."* Small work never becomes a row; large work is completed by notification. This removes the
    need for per-row spinners or polling entirely.
38. **The job's parameters are the list's current filters, confirmed once.** Resend: *"apply filters to
    your data and click on the 'Export' button. Confirm your filters before exporting."* No separate
    job-configuration screen; one confirmation showing what will be included.
39. **A produced artefact has a lifetime and a terminal `Expired` state.** Resend: *"access the export
    for 7 days. Unavailable exports are marked as 'Expired.'"* Stripe batch results: *"available for
    download for 7 days."* Expiry is a status on the row, not a broken link.
40. **Separate *view* from *download* on job history.** Resend: *"All members of your team can view your
    exports, but only admins can download the data."* Existence of the job is not sensitive; its
    contents are.
41. **Partial completion is a named status with retrievable output.** Stripe: *"Jobs that exceed this
    limit transition to `timeout` status, **with partial results available**."* Never collapse partial
    success into failure.
42. **Give "died before it started" its own status.** Stripe's `upload_timeout` (*"The upload URL
    expires 5 minutes after job creation"*) is distinct from `timeout`. The user's next action differs,
    so the state must.
43. **Give "we chose not to attempt" its own status, with its own metric semantics.** Resend's
    `suppressed` is neither success nor failure, and its payload states *"This does not count toward
    your bounce rate metric."* Refusals must not pollute failure rates.
44. **Group the settings rail with uppercase group labels and stop at two levels.** Sentry's
    `USER SETTINGS` / `ORGANIZATION` / `DEVELOPER SETTINGS` labels alone create grouping — no
    containers, no dividers, no collapsible trees. This is what lets two items both be called
    "General Settings" without ambiguity.
45. **Express scope by grouping, not by prefixing names.** Sentry has two `General Settings` items in
    one rail. Cloudflare goes further and splits by location: user tokens at
    `My Profile > API Tokens`, account tokens at `Manage Account > API Tokens`.
46. **Put explanatory prose between the H1 and the first control.** Sentry's token page opens with two
    plain paragraphs and an inline `documentation` link before the table. Settings pages are read before
    they are used.
47. **Save belongs in a footer inside the section card.** Sentry's card holds a hairline-separated
    footer with right-aligned `Cancel` + primary, and the primary is **disabled until the form is
    valid**. One card = one section = one Save scales to long settings pages without a global dirty
    state.
48. **A read-only setting keeps its label and row rhythm, loses its input chrome, and gains a sentence
    explaining why.** Sentry's `Scopes` row renders `org:ci` as plain text with its human expansion
    (`Source Map Upload, Release Creation`) beneath, and helper text stating *"Organization tokens
    currently have a limited set of scopes."* **Never use a disabled input for something that is
    permanently not editable.**
49. **Show both the machine value and its human meaning for any opaque setting.** `org:ci` alone is
    useless; `org:ci` + *Source Map Upload, Release Creation* is complete.
50. **State mutability in prose next to the control.** Sentry documents three regimes —
    *"aren't customizable"*, *"customizable and editable"*, *"customizable but cannot be edited later"*.
    That third one is invisible without a sentence.
51. **Mark plan-gated and pre-release items with a trailing glyph or pill, and keep them in the rail.**
    Sentry's `⚡` on `Auth` and `Relay`, and the `beta` pill on `Feature Flags`, occupy the same
    trailing slot. Hiding gated features hides the upgrade path.
52. **Tab a deprecated surface rather than replacing it, and make disabling the old thing a separate
    deliberate act.** Supabase's `API Keys` / `Legacy API Keys` tabs, with *"Creating new keys does not
    revoke your legacy keys"* and *"They remain valid until you explicitly disable them … **which is a
    separate step**"*, plus a stated deprecation date.
53. **Quarantine destruction by distance and confirmation, not by a red panel.** No surveyed product
    ships a "Danger Zone". Stripe hides every destructive verb in a per-row `…` menu, then confirms with
    a symmetrical escape (*"If you no longer want to expire the key, click Cancel"*), and spells out
    blast radius (*"Deleting an access policy immediately removes it from all API keys it was applied
    to. Those keys allow requests from any source until you apply another policy to them."*).
54. **Re-authenticate the dangerous path.** Stripe requires an emailed/texted verification code inside
    the create-secret-key dialog, and prompts for auth again when changing access policies.
55. **Prefer redesigning a destructive action to be reversible over decorating it with warnings.**
    Stripe's rotation gives a **7-day grace period where both keys work**, plus *"Monitor before
    revoking … expire it only after its request volume has been at zero for a few hours or days."* No
    warning copy achieves what a grace period achieves.
56. **Let permission carry the weight, not colour.** Sentry's `Revoke` is an **outline** button with a
    `⊖` glyph, and *"Only organization owners & managers can revoke organization tokens."*
57. **State irreversibility in plain words at the decision point.** Supabase: *"Deleting a secret key is
    irreversible and once done it will be gone forever."* Stripe: *"We can't recover keys that you've
    forgotten or lost access to."*
58. **Environment is a page mode, not a filter — and the rules may differ per mode.** Stripe's key page
    toggles sandbox↔live, and sandbox shows every secret forever while live enforces reveal-once.
59. **Disclose the feed's lag and the UI's window, separately from retention.** Stripe's activity logs
    appear *"~10 minutes after occurrence"* with 6-month retention; Cloudflare's UI is *"limited to the
    most recent 90 days for performance reasons"* against 18 months in the API. Without these stated in
    the interface, users read absence as a bug.
60. **Give the log/audit list a `Download CSV` and give exports a permanent home.** Cloudflare's audit
    log has `Download CSV`; Resend's exports live at `Settings > Team > Exports` with a details page per
    export. An export that only exists as a browser download is an export you cannot audit.

---

## Confidence and gaps

**High confidence** (screenshot or verbatim vendor prose): every §1–§6 finding attributed to Sentry's
token list and create form, Cloudflare's reveal page and audit-log v2 schema, Polar's endpoint detail
and Deliveries table plus its retry/disable rules, PlanetScale's reveal modal, Resend's Logs list and
detail plus its export rules and event vocabulary, Svix's retry ladder / disable rule / remediation
verbs / Message Logs table, Stripe's key management flows and `Delivered`/`Pending`/`Failed` deliveries,
Supabase's key types and legacy-tab migration.

**Explicitly not verified — do not treat as findings:**

1. **Stripe endpoint health metrics and quiet-endpoint copy.** An early structured extraction produced
   a success-rate/error-rate/health widget and the strings `"No events received yet."` /
   `"This endpoint is quiet."`; a verbatim-quote re-check of the same page returned **"not stated"**.
   Treat as extraction hallucination.
2. **Stripe webhook endpoint auto-disable.** Not stated on `docs.stripe.com/webhooks`.
3. **Empty-state and filtered-empty copy** for any delivery log, audit feed, or job history in any of
   the eight products. The only verified empty-ish string in the whole survey is Sentry's `never used`
   on a credential row. Rule 20 is derived from notification architecture, not from observed copy.
4. **Day-grouping / sticky date headers** in any audit feed. All verified feeds are flat and paginated.
5. **Determinate progress indicators** (`X of Y`, progress bars) on any job row.
6. **Stripe batch jobs' full status enum and Dashboard row columns** — only `timeout` and
   `upload_timeout` were verified.
7. **Sticky page-level save footers or autosave** anywhere. Only Sentry's per-card footer was observed.
8. **What a plan-gated settings page renders when opened**, and any bordered "Danger Zone" panel.
9. **Clerk's and Resend's webhook endpoint *list* rows**, and Clerk's API keys page row anatomy.
10. **All colour/spacing descriptions are my reading of the linked screenshots** at the stated
    resolutions, not values pulled from a design system or stylesheet. No vendor design-token source
    was available for any of these products.
