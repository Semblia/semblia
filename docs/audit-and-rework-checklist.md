## Semblia Scoped UI Review

Evaluate only the stated route or section. Do not judge the entire application.

Answer each item with:

- `YES` — satisfied in the current rendered UI.
- `NO` — not satisfied and requires action.
- `N/A` — not relevant to this scoped surface.

For every `NO`, provide:

- one visible or interaction-based piece of evidence;
- one proposed correction;
- severity: `BLOCKING`, `IMPORTANT`, or `MINOR`.

Do not mark a criterion `YES` merely because you implemented a change.
Do not redesign unless the before-review establishes a real problem.

### Required Context

- Surface under review:
- User type:
- Primary user goal on this surface:
- Relevant reference inspected, if any:
- Principle extracted from that reference:

### Core Questions

1. Can a first-time user understand what this surface is for and what to do next without prior product knowledge?

2. Is there a clear primary action or primary reading path, without competing emphasis from less important elements?

3. Is the wording written in the user's language rather than internal system language, vague SaaS filler, or artificial marketing copy?

4. Is the current system state clear wherever it matters: empty, loading, success, error, draft, published, approved, hidden, or disabled?

5. Does the surface prevent or safely communicate mistakes for consequential actions such as delete, publish, reject, disconnect, or discard?

6. Is the visual hierarchy deliberate: important content leads, related items are grouped, and decorative elements do not compete with the task?

7. Is every major visible element useful for the user's current task, rather than present only to make the UI look richer?

8. Are patterns consistent with the rest of Semblia or an explicitly proposed reusable design-system improvement?

9. Does this surface feel trustworthy and appropriate for a product that handles customer testimonials and customer-facing presentation?

10. Would leaving this surface unchanged noticeably harm comprehension, trust, or perceived product quality?

### Rework Decision

Rework is allowed only when:

- any of questions 1–5 is `NO`; or
- question 9 or 10 is `NO`; or
- at least two of questions 6–8 are `NO`.

Otherwise, do not redesign. Record minor opportunities and proceed to another surface.

## Conditional Page-Type Checks

Include only the relevant category. Do not run every category on every page.

### Public Collection Form / Submission Experience

1. Does the form feel welcoming, simple, and safe for someone giving feedback?
2. Is it clear what will happen to the submitted testimonial?
3. Does the submitter avoid unnecessary friction, uncertainty, or account-related confusion?
4. Would a customer be comfortable associating their own brand with this experience?

### Widget / Wall of Love / Public Display

1. Are the testimonials themselves the visual focus rather than Semblia's controls or decoration?
2. Can the business owner clearly understand what their audience will see?
3. Does the display appear credible, readable, and brand-compatible?
4. Does the surface avoid anything that makes testimonials feel fabricated or overly staged?

### Dashboard / Project Management

1. Is the most important project state or next task immediately visible?
2. Can the user distinguish setup work from ongoing management work?
3. Is the information density efficient without becoming visually cold or overwhelming?
4. Are empty states and first-use states genuinely instructive?

### Testimonial Moderation

1. Is the testimonial content central and easy to evaluate?
2. Are approval, rejection, publishing, and visibility states unambiguous?
3. Are moderation actions safe, reversible where appropriate, and clearly consequential?
4. Can the user process multiple testimonials efficiently without losing context?

### Auth / Onboarding / Project Creation

1. Does the page reduce anxiety and clearly communicate the value of continuing?
2. Is the next step obvious without overexplaining the product?
3. Is the setup sequence proportional to the value the user receives?
4. Does the experience look polished enough to earn a new user's trust?

## Conditional Page-Type Checks

Include only the relevant category. Do not run every category on every page.

### Public Collection Form / Submission Experience
1. Does the form feel welcoming, simple, and safe for someone giving feedback?
2. Is it clear what will happen to the submitted testimonial?
3. Does the submitter avoid unnecessary friction, uncertainty, or account-related confusion?
4. Would a customer be comfortable associating their own brand with this experience?

### Widget / Wall of Love / Public Display
1. Are the testimonials themselves the visual focus rather than Semblia's controls or decoration?
2. Can the business owner clearly understand what their audience will see?
3. Does the display appear credible, readable, and brand-compatible?
4. Does the surface avoid anything that makes testimonials feel fabricated or overly staged?

### Dashboard / Project Management
1. Is the most important project state or next task immediately visible?
2. Can the user distinguish setup work from ongoing management work?
3. Is the information density efficient without becoming visually cold or overwhelming?
4. Are empty states and first-use states genuinely instructive?

### Testimonial Moderation
1. Is the testimonial content central and easy to evaluate?
2. Are approval, rejection, publishing, and visibility states unambiguous?
3. Are moderation actions safe, reversible where appropriate, and clearly consequential?
4. Can the user process multiple testimonials efficiently without losing context?

### Auth / Onboarding / Project Creation
1. Does the page reduce anxiety and clearly communicate the value of continuing?
2. Is the next step obvious without overexplaining the product?
3. Is the setup sequence proportional to the value the user receives?
4. Does the experience look polished enough to earn a new user's trust?

## Mechanical Quality Gate

For this scoped surface, verify where applicable:

1. Can all interactive controls be reached and operated by keyboard?
2. Is the focused element visibly identifiable?
3. Is text readable with sufficient contrast against its background?
4. Are interactive targets adequately sized and spaced for reliable pointer use?
5. Are validation, error, success, and status messages understandable without depending on colour alone?
6. Does the surface remain usable at the intended narrow and wide viewport sizes?
7. Have the existing functional flows in this scope been manually rechecked after the UI change?

Any `NO` here blocks acceptance of the visual pass.