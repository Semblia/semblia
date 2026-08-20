# Public-surface hosting activation runbook

Status: **plan only.** Nothing in this file authorizes provider, DNS, database,
or deployment mutation. There is no extra domain purchase: the existing
`semblia.com` zone is the only domain assumed.

> Ordering is now owned by [`first-deploy-runbook.md`](first-deploy-runbook.md);
> this file remains the per-surface detail and the approval-gate language.
> Superseded within: the activation sequence's "legacy URLs remain valid /
> switch generated client URLs last" — WS-A already switched every client to
> API-issued hosts, so there is no legacy-URL grace state.

## Explicit approval gates

1. A user approves the target environment, operator, deployed commit, and
   maintenance window in writing.
2. An operator records a clean, reviewed double dry-run backfill and approves
   its sanitized results before a single `--apply`.
3. A separate reviewed artifact supplies the absent contract migration only
   after the audit reports zero blocking conflicts.
4. The user separately approves AWS, Cloudflare, and Vercel mutations and the
   final DNS cutover. Do not infer this from source-code approval.

## Forms: ACM, secret injection, CloudFront, and Cloudflare

1. Request/import the ACM certificate in **`us-east-1`**. Its required SANs
   are exactly `forms.semblia.com` and `*.forms.semblia.com`.
2. Add the certificate's provider-reported DNS validation records to the
   authoritative Cloudflare zone as **DNS-only** records. Capture the actual
   names/targets from ACM; never substitute guesses.
3. Store the runtime signing secret in AWS Secrets Manager. Pass only the
   secret ARN to the deployment configuration/Lambda reference; inspect the
   generated template and logs to prove the raw value is absent.
4. Synthesize then deploy the reviewed CloudFront distribution with aliases
   `forms.semblia.com` and `*.forms.semblia.com`, the us-east-1 certificate,
   OAC, original-host forwarding, host cache-key isolation, POST uncached, and
   no cookie forwarding.
5. Create Cloudflare **DNS-only** exact and wildcard records pointing to the
   CloudFront distribution domain reported by AWS:

   ```text
   forms.semblia.com       CNAME <cloudfront-domain-reported-by-aws>
   *.forms.semblia.com     CNAME <cloudfront-domain-reported-by-aws>
   ```

   Use the actual distribution domain; placeholders are intentionally not
   executable values. Keep certificate-validation records DNS-only too.

## Widgets: embed script CDN (WS-B1)

`widgets.semblia.com` serves exactly one contract at launch:
`GET /embed.js` — the built `packages/widgets-embed` bundle, evergreen
(customers embed once; the script is republished by the release workflow).
The serving surface is `packages/widgets-embed/infra/widgets-cdn-stack.ts`
(private S3 + CloudFront with OAC; synth-tested in the package suite).

1. Request/import the ACM certificate in **`us-east-1`** with the single SAN
   `widgets.semblia.com`; add its provider-reported validation records to
   Cloudflare as DNS-only.
2. Synthesize and review, then deploy the stack in api mode (the workflow
   secrets come from the *deployed* stack's outputs):

   ```powershell
   pnpm.cmd --filter @workspace/widgets-embed run cdk synth `
     -c widgetsCdnMode=api `
     -c widgetsCdnCertificateArn=<us-east-1-acm-arn>
   pnpm.cmd --filter @workspace/widgets-embed run cdk deploy `
     -c widgetsCdnMode=api `
     -c widgetsCdnCertificateArn=<us-east-1-acm-arn>
   ```

   Record the three stack outputs (distribution domain, distribution id,
   bucket name); put the latter two into the `WIDGETS_EMBED_BUCKET` and
   `WIDGETS_CDN_DISTRIBUTION_ID` workflow secrets alongside the
   least-privilege `WIDGETS_AWS_*` key pair (S3 put + invalidation only).
3. Create the Cloudflare **DNS-only** record from the reported value:

   ```text
   widgets.semblia.com     CNAME <cloudfront-domain-reported-by-aws>
   ```

4. Run (or re-run) the production-release workflow; its
   `publish-widgets-embed` job builds the bundle (3 KB gzip budget
   enforced), uploads `embed.js`, and invalidates the path.
5. Proof (one GET so headers and body come from the same response):
   `curl -s -D headers.txt -o body.txt https://widgets.semblia.com/embed.js`,
   then assert `headers.txt` shows 200, `content-type:
   application/javascript`, the s-maxage cache-control, HSTS and nosniff,
   and no `set-cookie`; and `body.txt` contains
   `customElements.define("semblia-widget"`.

## Uploads: S3 bucket CORS (WS-B3)

Hosted forms upload attachments with a **browser `PUT` directly to S3** using
a presigned URL (`apps/forms/src/browser.ts` → `POST /f/:slug/uploads/presign`
→ `fetch(intent.uploadUrl, { method: "PUT", headers: { "Content-Type": … } })`).
That request is cross-origin from the tenant forms host, so the submissions
bucket must carry a CORS configuration or every upload fails in the browser
while all server-side checks stay green:

- `AllowedMethods`: `PUT`
- `AllowedHeaders`: `Content-Type`
- `AllowedOrigins`: `https://forms.semblia.com` and `https://*.forms.semblia.com`
  (plus any approved custom collection hosts; never `*`)
- `MaxAgeSeconds`: operator's choice (3600 is fine)

Apply it to the exact bucket the API's presigner targets (the `S3_BUCKET` in
the runtime env), record the applied JSON in the change record, and re-verify
after any bucket replacement. The API-side caps are env-driven
(`S3_MAX_VIDEO_BYTES`, default 200 MiB — must stay ≥ the largest
`maxFileSize` any forms-core template promises).

## Walls: Vercel and Cloudflare

Before changing DNS, use the approved Vercel project/team to request/inspect
the exact `walls.semblia.com` and wildcard `*.walls.semblia.com` domains. Copy
the **provider-reported** required record type/name/value and any ACME/CNAME
delegation challenge exactly into the change record. Do not invent values; use
these read-only capture commands after authorization:

```powershell
vercel domains inspect "walls.semblia.com" --scope <team>
vercel domains inspect "*.walls.semblia.com" --scope <team>
```

Create only the reported exact/wildcard routing records and challenges in
Cloudflare as DNS-only. Assign both domains to `app`; the exact wall service
host must remain non-tenant. Record the Vercel verification result before
cutover.

## Activation sequence and proof

1. Deploy compatible expand-state API/forms/web code while shared legacy URLs
   remain valid. Confirm the contract migration directory is absent.
2. In the approved target, run backfill dry-run twice and review sanitized
   counts; run apply only after gate 2, then rerun it to prove `changed=0`.
3. Complete the separately approved contract migration artifact only after its
   dedicated integration proof passes.
4. Create/verify ACM, CloudFront, Vercel, and DNS bindings under gate 4.
5. Build and smoke the emitted forms artifacts (`pnpm.cmd --filter
   forms build`) and an optimized `app` production server. Do not use
   `next dev` response headers as production cache proof; Next deliberately
   applies development cache behavior there.
6. Run `scripts/verify-public-hosting.ps1` with two tenants sharing one form
   slug. Supply opaque, unique content markers owned by each fixture, a
   beta-only hostile slug, and a known-valid exact-host project id so the strict
   branches are exercised. The verifier disables redirects and requires each
   marker only on its expected tenant, positive beta controls before
   cross-project `404`s, opaque unknown/exact-host `404`s, no cookies, forms
   noindex, security headers, wall no-store, canonical/Open Graph/JSON-LD,
   robots, sitemap, and direct-internal-route rejection. Example shape:

   ```powershell
   .\scripts\verify-public-hosting.ps1 `
     -FormsBaseUrl <approved-forms-origin> `
     -WallsBaseUrl <approved-walls-origin> `
     -AlphaFormsHost <alpha.forms.semblia.com> `
     -BetaFormsHost <beta.forms.semblia.com> `
     -AlphaWallsHost <alpha.walls.semblia.com> `
     -BetaWallsHost <beta.walls.semblia.com> `
     -SharedFormSlug <shared-form-slug> `
     -AlphaWallSlug <alpha-additional-wall-slug> `
     -BetaWallSlug <beta-wall-slug> `
     -HostileFormSlug <beta-only-form-slug> `
     -AlphaFormMarker <opaque-alpha-form-content-marker> `
     -BetaFormMarker <opaque-beta-form-content-marker> `
     -AlphaWallMarker <opaque-alpha-wall-content-marker> `
     -BetaWallMarker <opaque-beta-wall-content-marker> `
     -ExactProjectId <alpha-project-id>
   ```

7. In a headed browser, navigate alpha then beta in the same fresh session for
   both forms and walls. Verify distinct content, metadata, zero Clerk resources
   or cookies, clean console/page errors, and one synthetic disposable form
   submission before deleting its test data. **The synthetic submission must
   include one file attachment on a hosted form with uploads enabled** — it is
   the only end-to-end proof of the presign → browser `PUT` → S3 leg and the
   bucket CORS configuration above; a submission without an upload does not
   exercise it. Delete the uploaded object with the rest of the test data.
8. Verify provider logs contain safe resolver/canonical/alias/cross-project/
   signature/exact-host/missing-primary events and no payload/signature fields.
9. Only then, in the activation artifact, switch generated client URLs and
   canonical metadata to API-issued immutable project hosts. Their labels were
   derived from the creation-time project slug; never reconstruct them from the
   current mutable slug.

## Rollback and expand/contract boundary

Roll back traffic first: remove/revert the exact/wildcard routing bindings and
restore legacy generated links if they were switched. Keep the expand data,
tombstones, and any reviewed contract constraints; do not down-migrate durable
identities or delete host rows. An older binary must remain compatible with the
expand state. This artifact has only the expand migration and no contract
migration, provider mutation, or client URL switch.
